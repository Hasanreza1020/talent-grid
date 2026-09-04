import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin, listUsers } from "@/lib/db/user";
import { UserTable } from "@/components/admin/user-table";
import { UserCreateForm } from "@/components/admin/user-create-form";
import { hasServiceKey } from "@/lib/supabase/admin";
import { SectionHeading } from "@/components/ui-bits";

export const metadata = { title: "Users — Grid" };

export default async function AdminUsersPage() {
  const current = await getCurrentUser();
  if (!isAdmin(current)) redirect("/admin");

  const users = await listUsers();

  return (
    <div className="space-y-6">
      <SectionHeading>People with access</SectionHeading>
      <div className="max-w-prose space-y-2 text-sm text-ink-muted">
        <p>
          Everyone who signs up starts as a viewer. A viewer can read creators, accounts
          and metrics, but not contacts, rates or internal notes.
        </p>
        <p>
          An editor can read everything and change everything except users and the audit
          log. An admin can do both, and can correct historic metric snapshots.
        </p>
        <p>
          To close sign-up entirely, set{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">GRID_ALLOWED_EMAILS</code>{" "}
          in the deployment to the addresses allowed in. While it is unset, anyone can
          create an account.
        </p>
      </div>

      <UserTable users={users} currentUserId={current!.id} canRevoke={hasServiceKey()} />

      <div className="space-y-4 border-t border-hairline pt-8">
        <SectionHeading>Add someone</SectionHeading>
        <p className="max-w-prose text-sm text-ink-muted">
          This creates the account, sets the password and puts the address on the
          allowlist in one step. All three are needed: an account without the
          allowlist row can sign in and is then turned away at the door.
        </p>
        <UserCreateForm configured={hasServiceKey()} />
      </div>
    </div>
  );
}
