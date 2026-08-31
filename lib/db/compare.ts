import { createClient } from "@/lib/supabase/server";
import { getDirectoryRowsBySlugs, type DirectoryRow } from "./creators";
import type { AudienceProfile, BrandConflict, Deliverable, RatePlatform } from "@/lib/types";

export type CompareCreator = DirectoryRow & {
  rates: {
    platform: RatePlatform;
    deliverable: Deliverable;
    priceBdt: number;
    negotiable: boolean;
  }[];
  audience: AudienceProfile | null;
  conflicts: BrandConflict[];
  collaborationCount: number;
  averageDeliveredEngagement: number | null;
  ratingAverageVisible: number | null;
  /** Snapshots for the primary account, for the 90-day growth row. */
  primarySnapshots: { capturedOn: string; followers: number | null }[];
};

/**
 * Everything the comparison table needs, for up to four creators. Loaded in one
 * place so the compare page itself stays presentation only.
 */
export async function getCompareData(slugs: string[]): Promise<CompareCreator[]> {
  const rows = await getDirectoryRowsBySlugs(slugs);
  if (rows.length === 0) return [];

  const supabase = await createClient();
  const creatorIds = rows.map((row) => row.id);
  const accountIds = rows.flatMap((row) => row.accounts.map((account) => account.id));

  const [rates, audiences, conflicts, collaborations, notes, snapshots] = await Promise.all([
    supabase.from("current_rate_cards").select("*").in("creator_id", creatorIds),
    accountIds.length
      ? supabase
          .from("audience_profiles")
          .select("*")
          .in("account_id", accountIds)
          .order("captured_on", { ascending: false })
      : { data: [] },
    supabase.from("brand_conflicts").select("*").in("creator_id", creatorIds),
    supabase
      .from("collaborations_readable")
      .select("creator_id, delivered_engagement_rate")
      .in("creator_id", creatorIds),
    supabase
      .from("internal_notes")
      .select("creator_id, professionalism, responsiveness, punctuality")
      .in("creator_id", creatorIds),
    accountIds.length
      ? supabase
          .from("metric_snapshots")
          .select("account_id, captured_on, followers")
          .in("account_id", accountIds)
          .order("captured_on", { ascending: true })
      : { data: [] },
  ]);

  return rows.map((row) => {
    const primaryAccountId = row.primaryAccountId;
    const ownAccountIds = new Set(row.accounts.map((account) => account.id));

    // Newest audience profile on the primary account, falling back to any account.
    const ownAudiences = (audiences.data ?? []).filter((profile) =>
      ownAccountIds.has(profile.account_id),
    );
    const chosen =
      ownAudiences.find((profile) => profile.account_id === primaryAccountId) ??
      ownAudiences[0] ??
      null;

    const ownCollaborations = (collaborations.data ?? []).filter(
      (entry) => entry.creator_id === row.id,
    );
    const deliveredRates = ownCollaborations
      .map((entry) => entry.delivered_engagement_rate)
      .filter((value): value is number | string => value !== null)
      .map(Number);

    const ownRatings = (notes.data ?? [])
      .filter((note) => note.creator_id === row.id)
      .flatMap((note) =>
        [note.professionalism, note.responsiveness, note.punctuality].filter(
          (value): value is number => value !== null,
        ),
      );

    return {
      ...row,
      rates: (rates.data ?? [])
        .filter((rate) => rate.creator_id === row.id)
        .map((rate) => ({
          platform: rate.platform as RatePlatform,
          deliverable: rate.deliverable as Deliverable,
          priceBdt: rate.price_bdt,
          negotiable: rate.negotiable,
        })),
      audience: chosen
        ? {
            id: chosen.id,
            accountId: chosen.account_id,
            capturedOn: chosen.captured_on,
            ageBrackets: chosen.age_brackets,
            genderSplit: chosen.gender_split,
            topCities: chosen.top_cities,
            topCountries: chosen.top_countries,
            authenticityScore:
              chosen.authenticity_score === null ? null : Number(chosen.authenticity_score),
          }
        : null,
      conflicts: (conflicts.data ?? [])
        .filter((conflict) => conflict.creator_id === row.id)
        .map((conflict) => ({
          id: conflict.id,
          creatorId: conflict.creator_id,
          brandName: conflict.brand_name,
          conflictCategory: conflict.conflict_category,
          exclusiveUntil: conflict.exclusive_until,
          notes: conflict.notes,
        })),
      collaborationCount: ownCollaborations.length,
      averageDeliveredEngagement: deliveredRates.length
        ? deliveredRates.reduce((a, b) => a + b, 0) / deliveredRates.length
        : null,
      ratingAverageVisible: ownRatings.length
        ? ownRatings.reduce((a, b) => a + b, 0) / ownRatings.length
        : null,
      primarySnapshots: (snapshots.data ?? [])
        .filter((snapshot) => snapshot.account_id === primaryAccountId)
        .map((snapshot) => ({
          capturedOn: snapshot.captured_on,
          followers: snapshot.followers,
        })),
    };
  });
}
