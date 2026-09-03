import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin, listUsers } from "@/lib/db/user";
import { UserTable } from "@/components/admin/user-table";
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
          This workspace is locked to a single owner. There is no sign-up, and an
          address that is not on the allowlist is signed out on sight, whatever role
          its profile row claims.
        </p>
        <p>
          To let somebody else in: add their address to{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">public.allowed_emails</code>{" "}
          and to <code className="rounded bg-muted px-1 py-0.5 text-xs">GRID_ALLOWED_EMAILS</code>{" "}
          in the deployment, then create the account from the database. Both steps,
          deliberately — neither one alone grants access.
        </p>
      </div>

      <UserTable users={users} currentUserId={current!.id} />
    </div>
  );
}
