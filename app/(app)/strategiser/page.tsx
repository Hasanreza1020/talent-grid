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

  // The headline lives in the prompt card, not here: the card is the centre of
  // this page and a second heading above it would compete with its own.
  return (
    <div className="mx-auto max-w-[64rem] px-4 py-16 sm:px-6 sm:py-24">
      <Strategiser
        cheapestRate={rates.length ? Math.min(...rates) : null}
        rosterSize={rows.length}
        rosterEngagement={rosterEngagement}
      />
    </div>
  );
}
