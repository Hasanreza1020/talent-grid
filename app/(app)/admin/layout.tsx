import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin, isEditor } from "@/lib/db/user";
import { AdminNav } from "@/components/chrome/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!isEditor(user)) {
    // A viewer reaching an admin URL directly gets sent home rather than shown
    // a page that is empty because RLS blocked every query behind it.
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-[80rem] px-6 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-xl">
          <Link href="/admin">Admin</Link>
        </h1>
        <AdminNav isAdmin={isAdmin(user)} />
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
