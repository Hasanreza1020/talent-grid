import { notFound } from "next/navigation";
import { getCreatorDetail, listDirectory } from "@/lib/db/creators";
import { listShortlists } from "@/lib/db/shortlists";
import { getCurrentUser, isEditor } from "@/lib/db/user";
import { computeDirectoryMetrics } from "@/lib/metrics/directory";
import { percentileSentence } from "@/lib/metrics/percentile";
import { engagementRateLabel } from "@/lib/metrics/engagement";
import { Portrait } from "@/components/creator/portrait";
import { Chip, MetricValue, Notice, SectionHeading, EmptyState, Value } from "@/components/ui-bits";
import { BenchmarkRadar } from "@/components/charts";
import { PlatformTabs } from "@/components/creator/platform-tabs";
import { AudienceBlock } from "@/components/creator/audience-block";
import { CompareToggleButton } from "@/components/compare/compare-toggle-button";
import { AddToShortlist } from "@/components/shortlist/add-to-shortlist";
import {
  DATA_CONFIDENCE_LABEL,
  GENDER_LABEL,
  LANGUAGE_LABEL,
  PLATFORM_LABEL,
  STATUS_LABEL,
  TIER_LABEL,
} from "@/lib/types";
import {
  formatBdt,
  formatCompact,
  formatDate,
  formatNumber,
  formatPercent,
  hashTag,
  NO_DATA,
} from "@/lib/format";
import { RateCardSection, CollaborationsSection } from "./_sections";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const creator = await getCreatorDetail(slug);
  return { title: creator ? `${creator.displayName} — Talent Grid` : "Creator — Talent Grid" };
}

const BENCHMARK_AXES = [
  { key: "engagement", label: "Engagement" },
  { key: "reach", label: "Reach" },
  { key: "growth", label: "Growth" },
  { key: "cost", label: "Cost efficiency" },
  { key: "consistency", label: "Consistency" },
];

export default async function CreatorDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [creator, allRows, user] = await Promise.all([
    getCreatorDetail(slug),
    listDirectory(),
    getCurrentUser(),
  ]);

  if (!creator) notFound();

  const canEdit = isEditor(user);
  const shortlists = await listShortlists();

  const metrics = computeDirectoryMetrics(allRows);
  const own = metrics.get(creator.id);

  const openConflicts = creator.conflicts.filter(
    (conflict) =>
      conflict.exclusiveUntil !== null &&
      new Date(conflict.exclusiveUntil) >= new Date(new Date().toDateString()),
  );

  const featuredSamples = creator.contentSamples.filter((sample) => sample.isFeatured).slice(0, 3);

  const percentiles = own?.percentiles;
  const radarSeries = [
    {
      key: "creator",
      label: creator.displayName,
      values: {
        engagement: percentiles?.engagement.value ?? null,
        reach: percentiles?.reach.value ?? null,
        growth: percentiles?.growth.value ?? null,
        cost: percentiles?.costPerEngagement.value ?? null,
        consistency: percentiles?.consistency.value ?? null,
      },
    },
    {
      key: "median",
      label: "Category and tier median",
      // The median of a peer group sits at the 50th percentile by definition,
      // which is what this creator is being read against.
      values: { engagement: 50, reach: 50, growth: 50, cost: 50, consistency: 50 },
    },
  ];

  const hasAnyPercentile = Object.values(radarSeries[0].values).some((v) => v !== null);

  return (
    <div className="mx-auto max-w-[80rem] px-6 py-8">
      {/* Hero */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,340px)_1fr]">
        <Portrait
          name={creator.displayName}
          src={creator.portraitUrl}
          priority
          sizes="340px"
        />

        <div className="min-w-0">
          <h1 className="font-display text-2xl leading-tight">{creator.displayName}</h1>

          <p className="mt-2 text-base text-ink-muted">
            {creator.primaryHandle ? `@${creator.primaryHandle}` : "No handle on file"}
            {creator.primaryPlatform ? ` on ${PLATFORM_LABEL[creator.primaryPlatform]}` : ""}
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-ink-muted">City</dt>
              <dd><Value>{creator.city}</Value></dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Language</dt>
              <dd>{LANGUAGE_LABEL[creator.primaryLanguage]}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Tier</dt>
              <dd><Value>{creator.tier ? TIER_LABEL[creator.tier] : null}</Value></dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Gender</dt>
              <dd>{GENDER_LABEL[creator.gender]}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Chip tone={creator.status === "active" ? "default" : "warn"}>
              {STATUS_LABEL[creator.status]}
            </Chip>
            <Chip tone="muted">{DATA_CONFIDENCE_LABEL[creator.dataConfidence]}</Chip>
            {creator.categories.map((category) => (
              <Chip key={category.id}>{category.name}</Chip>
            ))}
            {creator.tags.map((tag) => (
              <Chip key={tag.id} tone="muted">{hashTag(tag.label)}</Chip>
            ))}
          </div>

          {creator.bioLong ? (
            <p className="mt-5 max-w-prose text-sm leading-relaxed text-ink-muted">
              {creator.bioLong}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <AddToShortlist
              creatorId={creator.id}
              creatorName={creator.displayName}
              shortlists={shortlists.map((list) => ({
                id: list.id,
                name: list.name,
                clientName: list.clientName,
              }))}
            />
            <CompareToggleButton slug={creator.slug} displayName={creator.displayName} />
          </div>
        </div>
      </div>

      {/* Warnings */}
      {openConflicts.length > 0 || creator.dataConfidence === "unverified" ? (
        <div className="mt-8 space-y-3">
          {openConflicts.map((conflict) => (
            <Notice
              key={conflict.id}
              tone="warn"
              title={`Exclusivity with ${conflict.brandName} runs to ${formatDate(conflict.exclusiveUntil)}`}
            >
              {conflict.conflictCategory
                ? `Category: ${conflict.conflictCategory}. `
                : null}
              {conflict.notes ?? "Check before pitching a competing brand."}
            </Notice>
          ))}
          {creator.dataConfidence === "unverified" ? (
            <Notice title="This record is unverified">
              The figures below came from a legacy spreadsheet import and have not been
              checked against the platforms. Treat them as indicative.
            </Notice>
          ) : null}
        </div>
      ) : null}

      {/* Quick stats */}
      <section className="mt-10 grid grid-cols-2 gap-6 border-y border-hairline py-6 lg:grid-cols-4">
        <Stat label="Total reach">
          <span className="numeral text-xl">{formatCompact(creator.totalReach)}</span>
          <span className="mt-1 block text-xs text-ink-muted">
            {creator.accountCount} account{creator.accountCount === 1 ? "" : "s"}
          </span>
        </Stat>

        <Stat label={own ? engagementRateLabel(own.engagement) : "Engagement rate"}>
          {own ? (
            <MetricValue
              result={own.engagement}
              format={(value: number) => formatPercent(value)}
              label="Engagement rate"
              emphasis
              className="text-xl"
            />
          ) : (
            <span className="text-ink-muted">{NO_DATA}</span>
          )}
        </Stat>

        <Stat label="Agency score">
          {own ? (
            <MetricValue
              result={own.score}
              format={(value: { score: number }) => String(Math.round(value.score))}
              label="Agency score"
              emphasis
              className="text-xl"
            />
          ) : (
            <span className="text-ink-muted">{NO_DATA}</span>
          )}
        </Stat>

        <Stat label="Cheapest rate">
          {canEdit ? (
            <span className="numeral text-xl">{formatBdt(creator.cheapestRateBdt)}</span>
          ) : (
            <span className="text-sm text-ink-muted">Visible to editors</span>
          )}
        </Stat>
      </section>

      {/* Platforms */}
      <section className="mt-12 space-y-4">
        <SectionHeading>Platforms</SectionHeading>
        {creator.accounts.length === 0 ? (
          <EmptyState>No platform accounts are recorded for this creator yet.</EmptyState>
        ) : (
          <PlatformTabs
            accounts={creator.accounts.map((account) => ({
              id: account.id,
              platform: account.platform,
              platformLabel: PLATFORM_LABEL[account.platform],
              handle: account.handle,
              profileUrl: account.profileUrl,
              followers: account.latest?.followers ?? null,
              engagementRate: account.latest?.engagementRate ?? null,
              avgViews: account.latest?.avgViews ?? null,
              postsLast30d: account.latest?.postsLast30d ?? null,
              capturedOn: account.latest?.capturedOn ?? null,
              history: (creator.snapshotsByAccount[account.id] ?? [])
                .filter((snapshot) => snapshot.followers !== null)
                .map((snapshot) => ({
                  capturedOn: snapshot.capturedOn,
                  followers: snapshot.followers as number,
                })),
            }))}
          />
        )}
      </section>

      {/* Benchmark */}
      <section className="mt-12 space-y-4">
        <SectionHeading>Benchmark</SectionHeading>
        {!hasAnyPercentile ? (
          <EmptyState>
            {own?.peerGroupSize !== undefined && own.peerGroupSize < 5
              ? `Not enough peers to rank. Benchmarking compares a creator against others in the same primary category and tier, and needs at least five of them; this group has ${own.peerGroupSize}.`
              : "There is not enough recorded data to benchmark this creator yet."}
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <BenchmarkRadar axes={BENCHMARK_AXES} series={radarSeries} highlightKey="creator" />
            <ul className="space-y-2 self-center text-sm">
              {percentiles ? (
                <>
                  <li>{percentileSentence("engagement", percentiles.engagement)}</li>
                  <li>{percentileSentence("reach", percentiles.reach)}</li>
                  <li>{percentileSentence("growth", percentiles.growth)}</li>
                  <li>{percentileSentence("cost efficiency", percentiles.costPerEngagement)}</li>
                  <li>{percentileSentence("consistency", percentiles.consistency)}</li>
                </>
              ) : null}
              <li className="pt-2 text-xs text-ink-muted">
                Compared against {own?.peerGroupSize ?? 0} creators in the same primary
                category and tier.
              </li>
            </ul>
          </div>
        )}
      </section>

      {/* Audience */}
      <section className="mt-12 space-y-4">
        <SectionHeading>Audience</SectionHeading>
        <AudienceBlock
          accounts={creator.accounts.map((account) => ({
            id: account.id,
            label: PLATFORM_LABEL[account.platform],
            profile: creator.audienceByAccount[account.id] ?? null,
          }))}
        />
      </section>

      {/* Rates */}
      <RateCardSection creator={creator} canEdit={canEdit} />

      {/* Content samples */}
      <section className="mt-12 space-y-4">
        <SectionHeading>Featured content</SectionHeading>
        {featuredSamples.length === 0 ? (
          <EmptyState>No featured content samples yet.</EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {featuredSamples.map((sample) => (
              <li key={sample.id}>
                <a href={sample.url} target="_blank" rel="noreferrer" className="group block">
                  <Portrait
                    name={sample.caption ?? creator.displayName}
                    src={sample.thumbnailUrl}
                    className="aspect-video"
                    sizes="(min-width: 640px) 320px, 90vw"
                  />
                  <p className="mt-2 text-sm">{sample.caption ?? "Untitled post"}</p>
                  <p className="numeral text-sm text-ink-muted">
                    {sample.views === null ? NO_DATA : `${formatCompact(sample.views)} views`}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Collaborations */}
      <CollaborationsSection creator={creator} />

      {/* Contacts, editors only */}
      {canEdit ? (
        <section className="mt-12 space-y-4">
          <SectionHeading>Contacts</SectionHeading>
          {creator.contacts.length === 0 ? (
            <EmptyState>No contact details recorded.</EmptyState>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {creator.contacts.map((contact) => (
                <li key={contact.id} className="border border-hairline bg-surface p-4">
                  <p className="text-sm font-medium">
                    <Value>{contact.name}</Value>
                  </p>
                  <dl className="mt-2 space-y-1 text-sm text-ink-muted">
                    <div><dt className="sr-only">Phone</dt><dd><Value>{contact.phone}</Value></dd></div>
                    <div><dt className="sr-only">WhatsApp</dt><dd><Value>{contact.whatsapp}</Value></dd></div>
                    <div><dt className="sr-only">Email</dt><dd><Value>{contact.email}</Value></dd></div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {/* Internal notes, editors only. Never on a client-facing surface. */}
      {canEdit ? (
        <section className="mt-12 space-y-4">
          <SectionHeading>Internal notes</SectionHeading>
          {creator.internalNotes.length === 0 ? (
            <EmptyState>No internal notes yet.</EmptyState>
          ) : (
            <ul className="space-y-4">
              {creator.internalNotes.map((note) => (
                <li key={note.id} className="border-l-2 border-hairline pl-4">
                  <p className="text-sm leading-relaxed">{note.body}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-ink-muted">
                    <span>{note.authorName ?? "Unknown author"}</span>
                    <span>{formatDate(note.createdAt)}</span>
                    <Rating label="Professionalism" value={note.professionalism} />
                    <Rating label="Responsiveness" value={note.responsiveness} />
                    <Rating label="Punctuality" value={note.punctuality} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Rating({ label, value }: { label: string; value: number | null }) {
  return (
    <span>
      {label} {value === null ? NO_DATA : `${formatNumber(value)} of 5`}
    </span>
  );
}
