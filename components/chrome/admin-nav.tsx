"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Health", exact: true },
  { href: "/admin/creators", label: "Creators" },
  { href: "/admin/taxonomy", label: "Categories and tags" },
  { href: "/admin/import", label: "Import", adminOnly: true },
  { href: "/admin/users", label: "Users", adminOnly: true },
];

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const links = LINKS.filter((link) => !link.adminOnly || isAdmin);

  return (
    <nav className="flex flex-wrap items-center gap-5">
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
              "relative py-1 text-sm",
              active ? "text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {link.label}
            {active ? <span className="absolute inset-x-0 -bottom-0.5 h-px bg-brand" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
