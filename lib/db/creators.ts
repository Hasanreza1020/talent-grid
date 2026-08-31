import { createClient } from "@/lib/supabase/server";
import type {
  Account,
  AudienceProfile,
  BrandConflict,
  CategoryRef,
  Collaboration,
  Contact,
  ContentSample,
  CreatorStatus,
  DataConfidence,
  Gender,
  InternalNote,
  Language,
  MetricSnapshot,
  Platform,
  RateCard,
  TagRef,
  Tier,
} from "@/lib/types";

/**
 * One row of public.creator_directory, mapped to camelCase. This is the shape
 * the browse grid, the compare table and the admin health screens all read.
 */
export type DirectoryRow = {
  id: string;
  slug: string;
  displayName: string;
  bioShort: string | null;
  portraitUrl: string | null;
  gender: Gender;
  city: string | null;
  country: string;
  primaryLanguage: Language;
  tier: Tier | null;
  primaryPlatform: Platform | null;
  status: CreatorStatus;
  acceptsBarter: boolean | null;
  dataConfidence: DataConfidence;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;

  primaryAccountId: string | null;
  primaryHandle: string | null;
  primaryProfileUrl: string | null;
  primaryFollowers: number | null;
  primaryAvgViews: number | null;
  primaryAvgLikes: number | null;
  primaryAvgComments: number | null;
  primaryAvgShares: number | null;
  primaryPostsLast30d: number | null;
  primaryEngagementRate: number | null;
  primaryCapturedOn: string | null;

  totalReach: number | null;
  accountCount: number;
  oldestCapture: string | null;
  cheapestRateBdt: number | null;

  previousFollowers: number | null;
  previousCapturedOn: string | null;
  sampleCount: number;
  sampleMeanViews: number | null;
  sampleSdViews: number | null;
  ratingAverage: number | null;

  primaryCategoryId: string | null;
  primaryCategorySlug: string | null;
  primaryCategoryName: string | null;
  primaryCategoryParentId: string | null;

  openConflictCount: number;

  categories: CategoryRef[];
  tags: TagRef[];
  accounts: Account[];
};

const DIRECTORY_COLUMNS = "*";

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapDirectoryRow(row: any): Omit<DirectoryRow, "categories" | "tags" | "accounts"> {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    bioShort: row.bio_short,
    portraitUrl: row.portrait_url,
    gender: row.gender,
    city: row.city,
    country: row.country,
    primaryLanguage: row.primary_language,
    tier: row.tier,
    primaryPlatform: row.primary_platform,
    status: row.status,
    acceptsBarter: row.accepts_barter,
    dataConfidence: row.data_confidence,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    primaryAccountId: row.primary_account_id,
    primaryHandle: row.primary_handle,
    primaryProfileUrl: row.primary_profile_url,
    primaryFollowers: row.primary_followers,
    primaryAvgViews: row.primary_avg_views,
    primaryAvgLikes: row.primary_avg_likes,
    primaryAvgComments: row.primary_avg_comments,
    primaryAvgShares: row.primary_avg_shares,
    primaryPostsLast30d: row.primary_posts_last_30d,
    primaryEngagementRate:
      row.primary_engagement_rate === null ? null : Number(row.primary_engagement_rate),
    primaryCapturedOn: row.primary_captured_on,

    totalReach: row.total_reach === null ? null : Number(row.total_reach),
    accountCount: Number(row.account_count ?? 0),
    oldestCapture: row.oldest_capture,
    cheapestRateBdt: row.cheapest_rate_bdt,

    previousFollowers: row.previous_followers,
    previousCapturedOn: row.previous_captured_on,
    sampleCount: Number(row.sample_count ?? 0),
    sampleMeanViews: row.sample_mean_views === null ? null : Number(row.sample_mean_views),
    sampleSdViews: row.sample_sd_views === null ? null : Number(row.sample_sd_views),
    ratingAverage: row.rating_average === null ? null : Number(row.rating_average),

    primaryCategoryId: row.primary_category_id,
    primaryCategorySlug: row.primary_category_slug,
    primaryCategoryName: row.primary_category_name,
    primaryCategoryParentId: row.primary_category_parent_id,

    openConflictCount: Number(row.open_conflict_count ?? 0),
  };
}

function mapAccount(row: any): Account {
  const latest = Array.isArray(row.account_latest_metrics)
    ? row.account_latest_metrics[0]
    : row.account_latest_metrics;

  return {
    id: row.id,
    creatorId: row.creator_id,
    platform: row.platform,
    handle: row.handle,
    profileUrl: row.profile_url,
    isPrimary: row.is_primary,
    verifiedBadge: row.verified_badge,
    latest: latest
      ? {
          id: latest.snapshot_id ?? latest.id,
          accountId: row.id,
          capturedOn: latest.captured_on,
          followers: latest.followers,
          avgViews: latest.avg_views,
          avgLikes: latest.avg_likes,
          avgComments: latest.avg_comments,
          avgShares: latest.avg_shares,
          postsLast30d: latest.posts_last_30d,
          engagementRate:
            latest.engagement_rate === null ? null : Number(latest.engagement_rate),
          source: latest.source,
        }
      : null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Categories, tags and accounts for a set of creators, in three queries. */
async function loadRelations(creatorIds: string[]) {
  const supabase = await createClient();
  const empty = {
    categories: new Map<string, CategoryRef[]>(),
    tags: new Map<string, TagRef[]>(),
    accounts: new Map<string, Account[]>(),
  };
  if (creatorIds.length === 0) return empty;

  const [categoryResult, tagResult, accountResult] = await Promise.all([
    supabase
      .from("creator_categories")
      .select("creator_id, is_primary, categories(id, name, slug, parent_id)")
      .in("creator_id", creatorIds),
    supabase
      .from("creator_tags")
      .select("creator_id, tags(id, label, slug)")
      .in("creator_id", creatorIds),
    supabase.from("accounts").select("*").in("creator_id", creatorIds),
  ]);

  // Scoped to the accounts actually in play. An unfiltered read of this view
  // would be silently truncated by PostgREST's row cap once the database grows
  // past a thousand accounts, which would show up as missing follower counts
  // rather than as an error.
  const accountIds = (accountResult.data ?? []).map((row) => row.id);
  const metricsResult = accountIds.length
    ? await supabase.from("account_latest_metrics").select("*").in("account_id", accountIds)
    : { data: [] };

  const metricsByAccount = new Map<string, any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  for (const row of metricsResult.data ?? []) metricsByAccount.set(row.account_id, row);

  const categories = new Map<string, CategoryRef[]>();
  for (const row of categoryResult.data ?? []) {
    const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
    if (!category) continue;
    const bucket = categories.get(row.creator_id) ?? [];
    bucket.push({
      id: category.id,
      name: category.name,
      slug: category.slug,
      parentId: category.parent_id,
      isPrimary: row.is_primary,
    });
    categories.set(row.creator_id, bucket);
  }
  for (const bucket of categories.values()) {
    bucket.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.name.localeCompare(b.name));
  }

  const tags = new Map<string, TagRef[]>();
  for (const row of tagResult.data ?? []) {
    const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags;
    if (!tag) continue;
    const bucket = tags.get(row.creator_id) ?? [];
    bucket.push({ id: tag.id, label: tag.label, slug: tag.slug });
    tags.set(row.creator_id, bucket);
  }

  const accounts = new Map<string, Account[]>();
  for (const row of accountResult.data ?? []) {
    const bucket = accounts.get(row.creator_id) ?? [];
    bucket.push(mapAccount({ ...row, account_latest_metrics: metricsByAccount.get(row.id) }));
    accounts.set(row.creator_id, bucket);
  }
  for (const bucket of accounts.values()) {
    bucket.sort(
      (a, b) =>
        Number(b.isPrimary) - Number(a.isPrimary) ||
        (b.latest?.followers ?? 0) - (a.latest?.followers ?? 0),
    );
  }

  return { categories, tags, accounts };
}

async function attachRelations(
  rows: Omit<DirectoryRow, "categories" | "tags" | "accounts">[],
): Promise<DirectoryRow[]> {
  const relations = await loadRelations(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    categories: relations.categories.get(row.id) ?? [],
    tags: relations.tags.get(row.id) ?? [],
    accounts: relations.accounts.get(row.id) ?? [],
  }));
}

/**
 * Every non-archived creator, with relations. Filtering and sorting happen in
 * `lib/browse.ts` against this list. At the scale this tool operates on
 * (hundreds of creators, an internal team) one indexed read beats assembling a
 * dozen conditional PostgREST filters, and it keeps the filter semantics in
 * one testable place.
 */
export async function listDirectory(
  options: { includeArchived?: boolean } = {},
): Promise<DirectoryRow[]> {
  const supabase = await createClient();
  let query = supabase.from("creator_directory").select(DIRECTORY_COLUMNS);
  if (!options.includeArchived) query = query.is("deleted_at", null);

  const { data, error } = await query.order("display_name");
  if (error) throw error;

  return attachRelations((data ?? []).map(mapDirectoryRow));
}

export async function getDirectoryRowsBySlugs(slugs: string[]): Promise<DirectoryRow[]> {
  if (slugs.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_directory")
    .select(DIRECTORY_COLUMNS)
    .in("slug", slugs)
    .is("deleted_at", null);

  if (error) throw error;
  const rows = await attachRelations((data ?? []).map(mapDirectoryRow));
  // Preserve the order the caller asked for, which is the order in the URL.
  return slugs
    .map((slug) => rows.find((row) => row.slug === slug))
    .filter((row): row is DirectoryRow => row !== undefined);
}

export type CreatorDetail = DirectoryRow & {
  legalName: string | null;
  bioLong: string | null;
  coverUrl: string | null;
  typicalTurnaroundDays: number | null;
  source: string;
  snapshotsByAccount: Record<string, MetricSnapshot[]>;
  audienceByAccount: Record<string, AudienceProfile | null>;
  rateCards: RateCard[];
  contacts: Contact[];
  collaborations: Collaboration[];
  conflicts: BrandConflict[];
  contentSamples: ContentSample[];
  internalNotes: InternalNote[];
};

export async function getCreatorDetail(slug: string): Promise<CreatorDetail | null> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("creator_directory")
    .select(DIRECTORY_COLUMNS)
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!row) return null;

  const [base] = await attachRelations([mapDirectoryRow(row)]);
  const accountIds = base.accounts.map((account) => account.id);

  // Rate cards, contacts, collaborations and notes are RLS-gated. A viewer
  // simply gets empty arrays, which the UI renders as a restricted section
  // rather than as "none on file".
  const [snapshots, audiences, rates, contacts, collaborations, conflicts, samples, notes] =
    await Promise.all([
      accountIds.length
        ? supabase
            .from("metric_snapshots")
            .select("*")
            .in("account_id", accountIds)
            .order("captured_on", { ascending: true })
        : { data: [], error: null },
      accountIds.length
        ? supabase
            .from("audience_profiles")
            .select("*")
            .in("account_id", accountIds)
            .order("captured_on", { ascending: false })
        : { data: [], error: null },
      supabase.from("current_rate_cards").select("*").eq("creator_id", base.id),
      supabase.from("contacts").select("*").eq("creator_id", base.id),
      supabase.from("collaborations_readable").select("*").eq("creator_id", base.id),
      supabase.from("brand_conflicts").select("*").eq("creator_id", base.id),
      supabase.from("content_samples").select("*").eq("creator_id", base.id),
      supabase
        .from("internal_notes")
        .select("*, users(full_name)")
        .eq("creator_id", base.id)
        .order("created_at", { ascending: false }),
    ]);

  const snapshotsByAccount: Record<string, MetricSnapshot[]> = {};
  for (const snapshot of snapshots.data ?? []) {
    const bucket = snapshotsByAccount[snapshot.account_id] ?? [];
    bucket.push({
      id: snapshot.id,
      accountId: snapshot.account_id,
      capturedOn: snapshot.captured_on,
      followers: snapshot.followers,
      avgViews: snapshot.avg_views,
      avgLikes: snapshot.avg_likes,
      avgComments: snapshot.avg_comments,
      avgShares: snapshot.avg_shares,
      postsLast30d: snapshot.posts_last_30d,
      engagementRate:
        snapshot.engagement_rate === null ? null : Number(snapshot.engagement_rate),
      source: snapshot.source,
    });
    snapshotsByAccount[snapshot.account_id] = bucket;
  }

  const audienceByAccount: Record<string, AudienceProfile | null> = {};
  for (const account of base.accounts) audienceByAccount[account.id] = null;
  for (const profile of audiences.data ?? []) {
    if (audienceByAccount[profile.account_id]) continue; // newest wins
    audienceByAccount[profile.account_id] = {
      id: profile.id,
      accountId: profile.account_id,
      capturedOn: profile.captured_on,
      ageBrackets: profile.age_brackets,
      genderSplit: profile.gender_split,
      topCities: profile.top_cities,
      topCountries: profile.top_countries,
      authenticityScore:
        profile.authenticity_score === null ? null : Number(profile.authenticity_score),
    };
  }

  return {
    ...base,
    legalName: row.legal_name,
    bioLong: row.bio_long,
    coverUrl: row.cover_url,
    typicalTurnaroundDays: row.typical_turnaround_days,
    source: row.source,
    snapshotsByAccount,
    audienceByAccount,
    rateCards: (rates.data ?? []).map((rate) => ({
      id: rate.id,
      creatorId: rate.creator_id,
      platform: rate.platform,
      deliverable: rate.deliverable,
      priceBdt: rate.price_bdt,
      negotiable: rate.negotiable,
      notes: rate.notes,
      effectiveFrom: rate.effective_from,
    })),
    contacts: (contacts.data ?? []).map((contact) => ({
      id: contact.id,
      creatorId: contact.creator_id,
      contactType: contact.contact_type,
      name: contact.name,
      phone: contact.phone,
      whatsapp: contact.whatsapp,
      email: contact.email,
      preferredChannel: contact.preferred_channel,
      isPrimary: contact.is_primary,
    })),
    collaborations: (collaborations.data ?? []).map((collaboration) => ({
      id: collaboration.id,
      creatorId: collaboration.creator_id,
      clientName: collaboration.client_name,
      campaignName: collaboration.campaign_name,
      deliverables: collaboration.deliverables,
      feeBdt: collaboration.fee_bdt,
      feeVisible: collaboration.fee_visible,
      ranOn: collaboration.ran_on,
      deliveredViews: collaboration.delivered_views,
      deliveredEngagementRate:
        collaboration.delivered_engagement_rate === null
          ? null
          : Number(collaboration.delivered_engagement_rate),
      wasOurCampaign: collaboration.was_our_campaign,
      postUrl: collaboration.post_url,
    })),
    conflicts: (conflicts.data ?? []).map((conflict) => ({
      id: conflict.id,
      creatorId: conflict.creator_id,
      brandName: conflict.brand_name,
      conflictCategory: conflict.conflict_category,
      exclusiveUntil: conflict.exclusive_until,
      notes: conflict.notes,
    })),
    contentSamples: (samples.data ?? []).map((sample) => ({
      id: sample.id,
      creatorId: sample.creator_id,
      accountId: sample.account_id,
      url: sample.url,
      thumbnailUrl: sample.thumbnail_url,
      caption: sample.caption,
      views: sample.views,
      isFeatured: sample.is_featured,
    })),
    internalNotes: (notes.data ?? []).map((note) => ({
      id: note.id,
      creatorId: note.creator_id,
      authorId: note.author_id,
      authorName: Array.isArray(note.users)
        ? (note.users[0]?.full_name ?? null)
        : (note.users?.full_name ?? null),
      body: note.body,
      professionalism: note.professionalism,
      responsiveness: note.responsiveness,
      punctuality: note.punctuality,
      createdAt: note.created_at,
    })),
  };
}
