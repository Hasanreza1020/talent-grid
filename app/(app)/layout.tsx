import { redirect } from "next/navigation";
import { Nav } from "@/components/chrome/nav";
import { AppProviders } from "@/components/providers";
import { CompareTray } from "@/components/compare/compare-tray";
import { getCurrentUser } from "@/lib/db/user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppProviders>
      <div className="flex min-h-dvh flex-col">
        <Nav user={user} />
        <main className="flex-1">{children}</main>
        <CompareTray />
      </div>
    </AppProviders>
  );
}
