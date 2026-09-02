import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { PlatformIcon } from "@/components/platform-icon";

export type ShowcaseStat = { value: string; label: string };

/**
 * The section that has to explain the product in the time it takes to scroll
 * past it: proof numbers, then the argument, then three outcomes.
 *
 * It replaces the tier chart and platform table that used to sit here. Those
 * were internal reporting — how complete the database is, how it splits by
 * tier — and read as a status page rather than a reason to use the thing.
 *
 * The mock fragments inside the cards are static markup, not screenshots, and
 * are hidden from screen readers: they are a glimpse of the interface, and the
 * text beside them already says what they show.
 */
export function FeatureShowcase({ stats }: { stats: ShowcaseStat[] }) {
  return (
    <section className="space-y-12" aria-labelledby="why-grid">
      {/* Proof, condensed to a strip so the argument below carries the weight. */}
      <dl className="grid grid-cols-3 gap-x-6 gap-y-8 border-y border-hairline py-8">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="sr-only">{stat.label}</dt>
            <dd>
              <span className="numeral block text-3xl font-light leading-none tracking-tight">
                {stat.value}
              </span>
              <span className="mt-2 block text-sm text-ink-muted">{stat.label}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[2fr_3fr] lg:gap-12">
        {/* Editorial column */}
        <div className="lg:pr-6">
          <p className="text-sm text-brand">Why teams use Grid</p>
          <h2
            id="why-grid"
            className="mt-3 font-display text-2xl leading-[1.15] tracking-tight sm:text-3xl"
          >
            Everything you need to pick the right creator, in one place
          </h2>
          <p className="mt-5 max-w-[34rem] text-base leading-relaxed text-ink-muted">
            Most campaign planning still runs on outdated spreadsheets and DMs asking
            creators for their rate. Grid keeps the roster, the numbers and the pricing
            in one searchable place, so shortlisting takes minutes instead of a week.
          </p>

          <Link
            href="/creators"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm text-white transition-colors hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            See how it works
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {/* Bento */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card surface="stone">
            <SearchMock />
            <CardText
              headline="Shortlist in minutes"
              body="Filter by category, platform, follower tier, city and budget at once."
            />
          </Card>

          <Card surface="ink">
            <DatedMock />
            <CardText
              tone="dark"
              headline="Numbers you can trust"
              body="Engagement rate beside follower count, each stamped with the date it was captured."
            />
          </Card>

          <Card surface="plain" className="sm:col-span-2">
            <CompareMock />
            <CardText
              headline="Put creators side by side"
              body="Compare reach, engagement, price and agency score before you commit to a booking."
            />
          </Card>
        </div>
      </div>
    </section>
  );
}

function Card({
  surface,
  className,
  children,
}: {
  surface: "stone" | "ink" | "plain";
  className?: string;
  children: React.ReactNode;
}) {
  const skin = {
    stone: "bg-stone text-ink",
    ink: "bg-ink text-white",
    plain: "border border-hairline bg-surface text-ink",
  }[surface];

  return (
    <div className={`flex flex-col gap-5 overflow-hidden rounded-xl p-6 ${skin} ${className ?? ""}`}>
      {children}
    </div>
  );
}

function CardText({
  headline,
  body,
  tone = "light",
}: {
  headline: string;
  body: string;
  tone?: "light" | "dark";
}) {
  return (
    <div className="mt-auto">
      <h3 className="text-base leading-tight">{headline}</h3>
      <p className={`mt-1.5 text-sm ${tone === "dark" ? "text-white/60" : "text-ink-muted"}`}>
        {body}
      </p>
    </div>
  );
}

/** A search field and two chips. Not wired to anything. */
function SearchMock() {
  return (
    <div aria-hidden className="space-y-2">
      <div className="flex items-center gap-2 rounded-lg border border-ink/10 bg-surface px-3 py-2">
        <Search className="size-3.5 text-ink-muted" />
        <span className="text-xs text-ink-muted">Search creators</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full border border-ink/15 px-2 py-0.5 text-[11px] text-ink/70">
          Beauty
        </span>
        <span className="rounded-full border border-ink/15 px-2 py-0.5 text-[11px] text-ink/70">
          100k+ followers
        </span>
      </div>
    </div>
  );
}

/** A figure with the date it was captured, which is the actual claim. */
function DatedMock() {
  return (
    <div aria-hidden className="rounded-lg bg-white/10 p-4">
      <p className="numeral text-2xl font-light leading-none tracking-tight">4.2%</p>
      <p className="mt-1.5 text-[11px] text-white/50">engagement rate</p>
      <p className="mt-3 border-t border-white/15 pt-2 text-[11px] text-white/50">
        Captured 14 Aug 2026
      </p>
    </div>
  );
}

/** Two creators and a bar fragment, cropped by the card edge. */
function CompareMock() {
  return (
    <div aria-hidden className="-mb-2 flex items-end gap-4">
      <div className="flex flex-1 items-center gap-3">
        <MockCreator />
        <span className="shrink-0 text-xs text-ink-muted">vs</span>
        <MockCreator />
      </div>

      <div className="flex h-16 shrink-0 items-end gap-1.5">
        {[38, 62, 30, 74, 46].map((height, index) => (
          <span
            key={index}
            className="w-3 rounded-t-sm bg-ink/15"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function MockCreator() {
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface p-2.5">
      <div className="flex items-center gap-2">
        <span className="size-6 shrink-0 rounded-full bg-stone" />
        <span className="h-1.5 w-14 rounded-full bg-ink/15" />
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-ink-muted">
        <PlatformIcon platform="facebook" className="size-3" />
        <PlatformIcon platform="instagram" className="size-3" />
        <span className="ml-auto h-1.5 w-8 rounded-full bg-ink/15" />
      </div>
    </div>
  );
}
