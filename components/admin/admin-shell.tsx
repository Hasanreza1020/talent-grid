"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  Gauge,
  Tags,
  Upload,
  Users,
  UsersRound,
} from "lucide-react";
import { Wordmark } from "@/components/chrome/wordmark";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/login/actions";
import { USER_ROLE_LABEL, type UserRole } from "@/lib/types";

const NAV = [
  { href: "/admin", label: "Overview", icon: Gauge, exact: true },
  { href: "/admin/creators", label: "Creators", icon: UsersRound },
  { href: "/admin/taxonomy", label: "Categories and tags", icon: Tags },
  { href: "/admin/import", label: "Import", icon: Upload, adminOnly: true },
  { href: "/admin/users", label: "Users", icon: Users, adminOnly: true },
];

/**
 * A back office rather than a page of the product: fixed sidebar, its own
 * masthead, and no link back into the browse experience except one explicit
 * "view the site" escape hatch.
 */
export function AdminShell({
  user,
  isAdmin,
  children,
}: {
  user: { fullName: string | null; role: UserRole };
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = NAV.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="flex min-h-dvh bg-canvas">
      <aside className="sticky top-0 hidden h-dvh w-[15rem] shrink-0 flex-col border-r border-hairline bg-ink text-white lg:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <Wordmark href="/admin" suffix="CMS" tone="dark" />
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {items.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-white/12 text-white"
                    : "text-white/65 hover:bg-white/6 hover:text-white",
                )}
              >
                <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-white/10 p-4">
          <div className="text-sm">
            <p className="truncate text-white/90">{user.fullName ?? "Signed in"}</p>
            <p className="text-xs text-white/45">{USER_ROLE_LABEL[user.role]}</p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-white/55 hover:text-white"
          >
            View the site
            <ArrowUpRight className="size-3" aria-hidden />
          </Link>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="h-8 w-full justify-start px-0 text-white/55 hover:bg-transparent hover:text-white"
            >
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* The sidebar is desktop only; small screens get the same links as a
            scrollable strip rather than a hamburger that hides them. */}
        <div className="sticky top-0 z-30 border-b border-hairline bg-ink text-white lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Wordmark href="/admin" suffix="CMS" tone="dark" />
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="h-8 text-white/60 hover:bg-transparent hover:text-white"
              >
                Sign out
              </Button>
            </form>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
            {items.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "whitespace-nowrap rounded-md px-3 py-1.5 text-sm",
                    active ? "bg-white/12 text-white" : "text-white/60",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <main className="min-w-0 flex-1 px-6 py-8 lg:px-10">
          <div className="mx-auto max-w-[76rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
