"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/chrome/wordmark";
import { Button } from "@/components/ui/button";
import type { AppUser } from "@/lib/types";
import { USER_ROLE_LABEL } from "@/lib/types";
import { signOut } from "@/app/login/actions";

const LINKS = [
  { href: "/", label: "Home", exact: true },
  { href: "/creators", label: "Creators" },
  { href: "/compare", label: "Compare" },
  { href: "/shortlists", label: "Shortlists" },
];

export function Nav({ user }: { user: AppUser }) {
  const pathname = usePathname();
  // The CMS is deliberately absent from the product nav. It is a separate
  // tool at /admin with its own shell, not a tab of the browse experience.
  const links = LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[80rem] items-center gap-8 px-6">
        <Wordmark href="/" />

        <nav className="flex items-center gap-6">
          {links.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative py-4 text-sm transition-colors",
                  active ? "text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {link.label}
                {/* The active nav underline is one of the few places the
                    accent orange is permitted. */}
                {active ? (
                  <span className="absolute inset-x-0 bottom-0 h-px bg-brand" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <span className="hidden items-center gap-2 text-sm text-ink-muted sm:flex">
            {user.fullName ?? "Signed in"}
            <span className="rounded-full border border-hairline px-2 py-0.5 text-xs">
              {USER_ROLE_LABEL[user.role]}
            </span>
          </span>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
