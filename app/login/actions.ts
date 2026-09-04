"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAuthorisedEmail } from "@/lib/auth/allowlist";

/**
 * Sign in and sign up.
 *
 * A new account starts as a viewer and an admin raises the role deliberately;
 * the database default and the RLS policy on public.users both enforce that,
 * so nothing here can mint an editor.
 */
const credentials = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Passwords are at least 8 characters."),
  next: z.string().optional(),
});

const signUpSchema = credentials.extend({
  fullName: z.string().min(1, "Enter your name."),
});

export type AuthState = { error: string | null };

/**
 * Attempt throttling, per address and per source.
 *
 * In-memory, so it is per server instance and resets on redeploy — worth
 * having as friction against a script, not to be mistaken for a real defence.
 * Supabase applies its own limits on top, and the allowlist means a correct
 * guess for any other address is still refused at the door.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || now > record.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  record.count += 1;
  return record.count > MAX_ATTEMPTS;
}

function clearAttempts(key: string) {
  attempts.delete(key);
}

/** A safe internal destination, or the root. Never an absolute URL. */
function safeNext(next: string | undefined): string {
  if (!next) return "/";
  // Rejecting "//host" as well as "http://host" closes the open-redirect that
  // a bare startsWith("/") check leaves open.
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export async function signIn(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const requestHeaders = await headers();
  const source =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `${source}:${parsed.data.email.toLowerCase()}`;

  if (tooManyAttempts(key)) {
    return { error: "Too many attempts. Wait a few minutes and try again." };
  }

  /*
    Only meaningful when an allowlist is configured; open by default. Checked
    before the password goes upstream, and worded identically to a wrong
    password so it cannot be used to learn which address is the real one.
  */
  if (!(await isAuthorisedEmail(parsed.data.email))) {
    return { error: "That email and password combination was not recognised." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    // Deliberately not distinguishing "no such user" from "wrong password".
    return { error: "That email and password combination was not recognised." };
  }

  // Belt and braces: the address that came back must also be allowed.
  if (!(await isAuthorisedEmail(data.user.email))) {
    await supabase.auth.signOut();
    return { error: "That email and password combination was not recognised." };
  }

  clearAttempts(key);
  revalidatePath("/", "layout");
  redirect(safeNext(parsed.data.next));
}

/**
 * Create an account.
 *
 * The role is not a parameter and cannot be one: public.users defaults every
 * new row to viewer, and the RLS policy lets a person edit their own row only
 * while the role stays what it already is. Raising somebody is an admin action
 * on the users screen.
 */
export async function signUp(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // An allowlisted deployment refuses the account rather than creating one it
  // would then sign out on the next request.
  if (!(await isAuthorisedEmail(parsed.data.email))) {
    return {
      error: "This workspace is invitation only. Ask an admin to create your account.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(safeNext(parsed.data.next));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
