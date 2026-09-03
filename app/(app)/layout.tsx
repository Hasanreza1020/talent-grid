import { Nav } from "@/components/chrome/nav";
import { AppProviders } from "@/components/providers";
import { CompareTray } from "@/components/compare/compare-tray";
import { getCurrentUser } from "@/lib/db/user";
import { denyAccess } from "@/lib/auth/deny";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Null here means one of two things: no session, or a session for somebody
  // who is not on the allowlist. The middleware has already turned the first
  // away, so anyone reaching this is the second and is signed out.
  const user = await getCurrentUser();
  if (!user) return denyAccess();

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
