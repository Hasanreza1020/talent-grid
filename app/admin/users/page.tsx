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
          Everyone who signs up starts as a viewer. A viewer can read creators, accounts
          and metrics, but not contacts, rates or internal notes.
        </p>
        <p>
          An editor can read everything and change everything except users and the audit
          log. An admin can do both, and can correct historic metric snapshots.
        </p>
      </div>

      <UserTable users={users} currentUserId={current!.id} />
    </div>
  );
}
