import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin, isEditor } from "@/lib/db/user";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Talent Grid CMS",
  // The back office has no business being indexed.
  robots: { index: false, follow: false },
};

/**
 * The CMS shell.
 *
 * This lives outside the (app) route group on purpose, so it inherits none of
 * the public chrome: no product nav, no compare tray, no browse styling. The
 * two halves of the product are used by different people for different work,
 * and sharing a shell made the back office feel like a page of the front end
 * rather than a tool in its own right.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // A viewer reaching an admin URL directly is sent to the product rather than
  // shown a shell whose every panel is empty because RLS blocked the queries
  // behind it.
  if (!user) redirect("/login?next=/admin");
  if (!isEditor(user)) redirect("/");

  return (
    <AdminShell
      user={{ fullName: user.fullName, role: user.role }}
      isAdmin={isAdmin(user)}
    >
      {children}
    </AdminShell>
  );
}
