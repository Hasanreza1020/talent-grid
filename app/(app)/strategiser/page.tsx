import { listDirectory } from "@/lib/db/creators";
import { computeDirectoryMetrics } from "@/lib/metrics/directory";
import { Strategiser } from "@/components/strategiser/strategiser";

export const metadata = { title: "Strategiser — Grid" };

/**
 * The strategiser.
 *
 * The page loads only what the form needs to talk sensibly before a run: how
 * many creators exist, the cheapest rate on file, and the roster's engagement
 * rates for the median the results compare against. The pool itself is
 * retrieved server-side inside the action, not here, because it depends on the
 * brief.
 */
export default async function StrategiserPage() {
  const rows = await listDirectory();
  const metrics = computeDirectoryMetrics(rows);

  const rates = rows
    .map((row) => row.cheapestRateBdt)
    .filter((rate): rate is number => rate !== null);

  const rosterEngagement = rows
    .map((row) => metrics.get(row.id)?.engagement.value ?? null)
    .filter((rate): rate is number => rate !== null);

  return (
    <div className="mx-auto max-w-[64rem] px-4 py-10 sm:px-6">
      <h1 className="font-display text-xl">Strategiser</h1>
      <p className="mt-2 max-w-[40rem] text-sm text-ink-muted">
        Describe the campaign and get a costed shortlist. Every creator, figure and
        price comes from the roster; the strategist only chooses among them and says
        why.
      </p>

      <div className="mt-10">
        <Strategiser
          cheapestRate={rates.length ? Math.min(...rates) : null}
          rosterSize={rows.length}
          rosterEngagement={rosterEngagement}
        />
      </div>
    </div>
  );
}
