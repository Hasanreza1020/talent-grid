"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/chrome/wordmark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { AppUser } from "@/lib/types";
import { USER_ROLE_LABEL } from "@/lib/types";
import { signOut } from "@/app/login/actions";

const LINKS = [
  { href: "/", label: "Home", exact: true },
  { href: "/creators", label: "Creators" },
  { href: "/compare", label: "Compare" },
  { href: "/strategiser", label: "Strategiser" },
  { href: "/shortlists", label: "Shortlists" },
];

function isActive(pathname: string, link: (typeof LINKS)[number]): boolean {
  return link.exact
    ? pathname === link.href
    : pathname === link.href || pathname.startsWith(`${link.href}/`);
}

export function Nav({ user }: { user: AppUser }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // The sheet is a navigation menu, so it closes when navigation happens.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // The CMS is deliberately absent from the product nav. It is a separate
  // tool at /admin with its own shell, not a tab of the browse experience.
  const links = LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[80rem] items-center gap-4 px-4 sm:px-6 lg:gap-8">
        <Wordmark href="/" />

        {/*
          The links only fit beside the lockup from md up. Below that they
          move into a sheet rather than being squeezed until they wrap or run
          off the end of the bar.
        */}
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => {
            const active = isActive(pathname, link);
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
          <span className="hidden items-center gap-2 text-sm text-ink-muted lg:flex">
            {user.fullName ?? "Signed in"}
            <span className="rounded-full border border-hairline px-2 py-0.5 text-xs">
              {USER_ROLE_LABEL[user.role]}
            </span>
          </span>

          <form action={signOut} className="hidden md:block">
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Open menu"
                className="size-9 p-0 md:hidden"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-[17rem] p-0">
              <SheetHeader className="border-b border-hairline p-5">
                <SheetTitle className="text-base">Menu</SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col p-2">
                {links.map((link) => {
                  const active = isActive(pathname, link);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "rounded-lg px-3 py-2.5 text-base",
                        active ? "bg-muted text-ink" : "text-ink-muted hover:text-ink",
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto border-t border-hairline p-5">
                <p className="text-sm">{user.fullName ?? "Signed in"}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {USER_ROLE_LABEL[user.role]}
                </p>
                <form action={signOut} className="mt-4">
                  <Button type="submit" variant="outline" size="sm" className="w-full">
                    Sign out
                  </Button>
                </form>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
