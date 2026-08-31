import { createClient } from "@/lib/supabase/server";

export type ShortlistSummary = {
  id: string;
  name: string;
  clientName: string | null;
  briefNotes: string | null;
  createdBy: string | null;
  shareToken: string | null;
  shareExpiresAt: string | null;
  includeRatesInShare: boolean;
  createdAt: string;
  creatorCount: number;
};

export type ShortlistItem = {
  creatorId: string;
  slug: string;
  displayName: string;
  portraitUrl: string | null;
  primaryHandle: string | null;
  position: number;
  pitchNote: string | null;
};

export async function listShortlists(): Promise<ShortlistSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shortlists")
    .select("*, shortlist_items(creator_id)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    clientName: row.client_name,
    briefNotes: row.brief_notes,
    createdBy: row.created_by,
    shareToken: row.share_token,
    shareExpiresAt: row.share_expires_at,
    includeRatesInShare: row.include_rates_in_share,
    createdAt: row.created_at,
    creatorCount: Array.isArray(row.shortlist_items) ? row.shortlist_items.length : 0,
  }));
}

export async function getShortlist(
  id: string,
): Promise<(ShortlistSummary & { items: ShortlistItem[] }) | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shortlists")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { data: itemRows, error: itemError } = await supabase
    .from("shortlist_items")
    .select("creator_id, position, pitch_note, creators(slug, display_name, portrait_url)")
    .eq("shortlist_id", id)
    .order("position");

  if (itemError) throw itemError;

  // The primary handle lives on accounts, fetched separately so the embed
  // stays a single level deep and predictable.
  const creatorIds = (itemRows ?? []).map((row) => row.creator_id);
  const handles = new Map<string, string | null>();
  if (creatorIds.length) {
    const { data: accounts } = await supabase
      .from("accounts")
      .select("creator_id, handle, is_primary")
      .in("creator_id", creatorIds)
      .eq("is_primary", true);
    for (const account of accounts ?? []) handles.set(account.creator_id, account.handle);
  }

  const items: ShortlistItem[] = (itemRows ?? []).map((row) => {
    const creator = Array.isArray(row.creators) ? row.creators[0] : row.creators;
    return {
      creatorId: row.creator_id,
      slug: creator?.slug ?? "",
      displayName: creator?.display_name ?? "Unknown creator",
      portraitUrl: creator?.portrait_url ?? null,
      primaryHandle: handles.get(row.creator_id) ?? null,
      position: row.position,
      pitchNote: row.pitch_note,
    };
  });

  return {
    id: data.id,
    name: data.name,
    clientName: data.client_name,
    briefNotes: data.brief_notes,
    createdBy: data.created_by,
    shareToken: data.share_token,
    shareExpiresAt: data.share_expires_at,
    includeRatesInShare: data.include_rates_in_share,
    createdAt: data.created_at,
    creatorCount: items.length,
    items,
  };
}

/** The tokenised client-facing payload, read through the SECURITY DEFINER RPC. */
export async function getSharedShortlist(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_shortlist", { p_token: token });
  if (error) throw error;
  return data as {
    status: "ok" | "expired" | "not_found";
    expiredAt?: string;
    shortlist?: {
      name: string;
      clientName: string | null;
      briefNotes: string | null;
      includeRates: boolean;
      expiresAt: string | null;
    };
    creators?: {
      position: number;
      pitchNote: string | null;
      slug: string;
      displayName: string;
      bioShort: string | null;
      portraitUrl: string | null;
      city: string | null;
      tier: string | null;
      primaryPlatform: string | null;
      categories: string[];
      accounts: {
        platform: string;
        handle: string | null;
        profileUrl: string;
        followers: number | null;
        engagementRate: number | null;
        isPrimary: boolean;
      }[];
      rates: { platform: string; deliverable: string; priceBdt: number; negotiable: boolean }[] | null;
    }[];
  };
}
