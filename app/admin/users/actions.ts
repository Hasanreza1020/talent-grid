"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, isAdmin } from "@/lib/db/user";
import { createAdminClient, hasServiceKey } from "@/lib/supabase/admin";
import { bootstrapEmails } from "@/lib/auth/allowlist";
import { USER_ROLES } from "@/lib/types";

export type UserActionState = { error: string | null; ok?: string };

const createSchema = z.object({
  email: z.email("Enter a valid email address."),
  fullName: z.string().trim().min(1, "Enter a name."),
  // Long rather than ornamental. Length is what actually resists guessing, and
  // a rule demanding a symbol mostly produces "Password1!".
  password: z.string().min(12, "Use at least 12 characters."),
  role: z.enum(USER_ROLES),
});

/**
 * Create an account, and put its address on the allowlist in the same breath.
 *
 * Both halves matter and neither is sufficient. Minting the auth user without
 * the allowlist row produces someone who can authenticate and is then signed
 * out on arrival; the allowlist row without the account is an address that can
 * never be used. Doing them together is the whole point of having this screen
 * rather than two manual steps in a dashboard.
 *
 * If the second half fails the first is rolled back, because an account nobody
 * recorded is worse than no account.
 */
export async function createUser(
  _state: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const actor = await getCurrentUser();
  if (!isAdmin(actor)) return { error: "Only an admin can add people." };

  if (!hasServiceKey()) {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY is not set on this deployment, so accounts cannot " +
        "be created. Add it to the environment and redeploy.",
    };
  }

  const parsed = createSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const email = parsed.data.email.trim().toLowerCase();
  const admin = createAdminClient();

  const created = await admin.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  });

  if (created.error || !created.data.user) {
    return { error: created.error?.message ?? "The account could not be created." };
  }

  const userId = created.data.user.id;

  const listed = await admin
    .from("allowed_emails")
    .upsert({ email, note: parsed.data.fullName }, { onConflict: "email" });

  if (listed.error) {
    await admin.auth.admin.deleteUser(userId);
    return {
      error:
        "The allowlist could not be updated, so the account was removed again. " +
        "Has the lock-to-owner migration been applied to this database?",
    };
  }

  // The trigger on auth.users creates the profile row as a viewer; this sets
  // the role that was actually chosen.
  const profile = await admin
    .from("users")
    .upsert(
      { id: userId, full_name: parsed.data.fullName, role: parsed.data.role },
      { onConflict: "id" },
    );

  if (profile.error) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from("allowed_emails").delete().eq("email", email);
    return { error: `The profile could not be saved, so nothing was kept: ${profile.error.message}` };
  }

  revalidatePath("/admin/users");
  return { error: null, ok: `${parsed.data.fullName} can now sign in as ${parsed.data.role}.` };
}

/**
 * Remove someone completely: the account, the allowlist row and the profile.
 *
 * Leaving any one of the three behind is a way back in, so all three go. The
 * owner's bootstrap address cannot be removed from here — that is the address
 * that gets you back when something else has gone wrong.
 */
export async function revokeUser(userId: string): Promise<UserActionState> {
  const actor = await getCurrentUser();
  if (!isAdmin(actor)) return { error: "Only an admin can remove people." };
  if (!hasServiceKey()) return { error: "SUPABASE_SERVICE_ROLE_KEY is not set." };
  if (userId === actor!.id) {
    return { error: "You cannot remove your own access." };
  }

  const admin = createAdminClient();

  const { data: target } = await admin.auth.admin.getUserById(userId);
  const email = (target?.user?.email ?? "").toLowerCase();

  if (email && bootstrapEmails().includes(email)) {
    return {
      error:
        "That address is the deployment's bootstrap owner and cannot be removed here. " +
        "Change GRID_ALLOWED_EMAILS first if you really mean to.",
    };
  }

  if (email) await admin.from("allowed_emails").delete().eq("email", email);
  await admin.from("users").delete().eq("id", userId);
  const removed = await admin.auth.admin.deleteUser(userId);
  if (removed.error) return { error: removed.error.message };

  revalidatePath("/admin/users");
  return { error: null, ok: "Access removed." };
}
