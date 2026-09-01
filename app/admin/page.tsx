import Link from "next/link";
import { listDirectory } from "@/lib/db/creators";
import { buildHealthChecks } from "@/lib/db/admin";
import { SectionHeading } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

export const metadata = { title: "Admin — Talent Grid" };

export default async function AdminDashboardPage() {
  const rows = await listDirectory({ includeArchived: true });
  const checks = buildHealthChecks(rows);
  const active = rows.filter((row) => row.deletedAt === null);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-ink-muted">
          {formatNumber(active.length)} creators on file.
        </p>
        <Button asChild>
          <Link href="/admin/creators/new">Add a creator</Link>
        </Button>
      </div>

      <section className="space-y-4">
        <SectionHeading>Data health</SectionHeading>
        <p className="max-w-prose text-sm text-ink-muted">
          Each of these is a list to work through, not a score. Nothing here is filled in
          automatically: a gap stays a gap until someone records the real figure.
        </p>

        <ul className="divide-y divide-hairline border-y border-hairline">
          {checks.map((check) => (
            <li key={check.key}>
              <Link
                href={check.href}
                className="flex items-start justify-between gap-6 py-4 hover:bg-muted/40"
              >
                <span className="min-w-0">
                  <span className="block text-base">{check.label}</span>
                  <span className="block max-w-prose text-sm text-ink-muted">
                    {check.description}
                  </span>
                </span>
                <span
                  className={
                    check.count === 0
                      ? "numeral text-lg text-ink-muted"
                      : "numeral text-lg"
                  }
                >
                  {formatNumber(check.count)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
