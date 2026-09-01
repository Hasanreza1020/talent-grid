"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isAdmin, isEditor } from "@/lib/db/user";
import { uniqueSlug } from "@/lib/slug";
import {
  bulkCategorySchema,
  bulkStatusSchema,
  creatorFormSchema,
  internalNoteSchema,
  roleUpdateSchema,
  snapshotSchema,
  type CreatorFormValues,
} from "@/lib/schemas";

export type SaveState = { error: string | null; creatorId?: string };

async function requireEditor() {
  const user = await getCurrentUser();
  if (!isEditor(user)) throw new Error("You do not have permission to make this change.");
  return user!;
}

/**
 * Creates or updates a creator and everything hanging off it.
 *
 * tier and primary_platform are deliberately not written here: the database
 * derives them from the follower counts on write, so there is exactly one
 * place that decides what tier a creator is in.
 */
export async function saveCreator(
  creatorId: string | null,
  values: CreatorFormValues,
): Promise<SaveState> {
  try {
    await requireEditor();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not permitted." };
  }

  const parsed = creatorFormSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const data = parsed.data;
  const supabase = await createClient();

  let id = creatorId;

  const creatorRow = {
    display_name: data.identity.displayName,
    legal_name: data.identity.legalName,
    bio_short: data.identity.bioShort,
    bio_long: data.identity.bioLong,
    city: data.identity.city,
    country: data.identity.country,
    gender: data.identity.gender,
    primary_language: data.identity.primaryLanguage,
    status: data.identity.status,
    data_confidence: data.identity.dataConfidence,
    accepts_barter: data.identity.acceptsBarter,
    typical_turnaround_days: data.identity.typicalTurnaroundDays,
  };

  if (id) {
    const { error } = await supabase.from("creators").update(creatorRow).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data: existingSlugs } = await supabase.from("creators").select("slug");
    const taken = new Set((existingSlugs ?? []).map((row) => row.slug));
    const slug = uniqueSlug(
      {
        displayName: data.identity.displayName,
        fallbackHandles: data.accounts.map((account) => account.handle),
      },
      taken,
    );

    const { data: inserted, error } = await supabase
      .from("creators")
      .insert({ ...creatorRow, slug, source: "manual" })
      .select("id")
      .single();
    if (error) return { error: error.message };
    id = inserted.id;
  }

  // Accounts: upsert what was submitted, delete what was removed.
  const submittedPlatforms = data.accounts.map((account) => account.platform);
  if (submittedPlatforms.length > 0) {
    const { error } = await supabase.from("accounts").upsert(
      data.accounts.map((account) => ({
        creator_id: id,
        platform: account.platform,
        handle: account.handle,
        profile_url: account.profileUrl,
        verified_badge: account.verifiedBadge,
      })),
      { onConflict: "creator_id,platform" },
    );
    if (error) return { error: error.message };
  }
  {
    let query = supabase.from("accounts").delete().eq("creator_id", id);
    if (submittedPlatforms.length > 0) query = query.not("platform", "in", `(${submittedPlatforms.join(",")})`);
    const { error } = await query;
    if (error) return { error: error.message };
  }

  // Categories: exactly one primary, any number of secondaries.
  {
    const { error: clearError } = await supabase
      .from("creator_categories")
      .delete()
      .eq("creator_id", id);
    if (clearError) return { error: clearError.message };

    const rows = [
      { creator_id: id, category_id: data.categories.primaryCategoryId, is_primary: true },
      ...data.categories.secondaryCategoryIds
        .filter((categoryId) => categoryId !== data.categories.primaryCategoryId)
        .map((categoryId) => ({
          creator_id: id,
          category_id: categoryId,
          is_primary: false,
        })),
    ];
    const { error } = await supabase.from("creator_categories").insert(rows);
    if (error) return { error: error.message };
  }

  // Tags.
  {
    await supabase.from("creator_tags").delete().eq("creator_id", id);
    if (data.categories.tagIds.length) {
      const { error } = await supabase
        .from("creator_tags")
        .insert(data.categories.tagIds.map((tagId) => ({ creator_id: id, tag_id: tagId })));
      if (error) return { error: error.message };
    }
  }

  // Rates.
  {
    await supabase.from("rate_cards").delete().eq("creator_id", id);
    if (data.rates.length) {
      const { error } = await supabase.from("rate_cards").insert(
        data.rates.map((rate) => ({
          creator_id: id,
          platform: rate.platform,
          deliverable: rate.deliverable,
          price_bdt: rate.priceBdt,
          negotiable: rate.negotiable,
          notes: rate.notes,
          effective_from: rate.effectiveFrom,
        })),
      );
      if (error) return { error: error.message };
    }
  }

  // Contacts.
  {
    await supabase.from("contacts").delete().eq("creator_id", id);
    if (data.contacts.length) {
      const { error } = await supabase.from("contacts").insert(
        data.contacts.map((contact) => ({
          creator_id: id,
          contact_type: contact.contactType,
          name: contact.name,
          phone: contact.phone,
          whatsapp: contact.whatsapp,
          email: contact.email,
          preferred_channel: contact.preferredChannel,
          is_primary: contact.isPrimary,
        })),
      );
      if (error) return { error: error.message };
    }
  }

  revalidatePath("/admin/creators");
  revalidatePath("/creators");
  return { error: null, creatorId: id! };
}

/** Snapshots are inserted, never updated: the history is the whole point. */
export async function addSnapshot(
  creatorId: string,
  values: unknown,
): Promise<SaveState> {
  try {
    await requireEditor();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not permitted." };
  }

  const parsed = snapshotSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("metric_snapshots").insert({
    account_id: parsed.data.accountId,
    captured_on: parsed.data.capturedOn,
    followers: parsed.data.followers,
    avg_views: parsed.data.avgViews,
    avg_likes: parsed.data.avgLikes,
    avg_comments: parsed.data.avgComments,
    avg_shares: parsed.data.avgShares,
    posts_last_30d: parsed.data.postsLast30d,
    source: parsed.data.source,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        error:
          "A snapshot already exists for that account on that date. Snapshots are " +
          "never overwritten; pick a different date, or ask an admin to correct the " +
          "existing one.",
      };
    }
    return { error: error.message };
  }

  revalidatePath(`/creators`);
  revalidatePath(`/admin/creators`);
  return { error: null };
}

export async function addInternalNote(
  creatorId: string,
  values: unknown,
): Promise<SaveState> {
  const user = await getCurrentUser();
  if (!isEditor(user)) return { error: "Not permitted." };

  const parsed = internalNoteSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("internal_notes").insert({
    creator_id: creatorId,
    author_id: user!.id,
    body: parsed.data.body,
    professionalism: parsed.data.professionalism,
    responsiveness: parsed.data.responsiveness,
    punctuality: parsed.data.punctuality,
  });

  if (error) return { error: error.message };
  revalidatePath("/creators");
  return { error: null };
}

/** Creators are archived, never deleted. */
export async function archiveCreator(creatorId: string): Promise<void> {
  await requireEditor();
  const supabase = await createClient();
  await supabase
    .from("creators")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", creatorId);

  revalidatePath("/admin/creators");
  revalidatePath("/creators");
  redirect("/admin/creators");
}

export async function restoreCreator(creatorId: string): Promise<void> {
  await requireEditor();
  const supabase = await createClient();
  await supabase.from("creators").update({ deleted_at: null }).eq("id", creatorId);
  revalidatePath("/admin/creators");
}

export async function bulkSetStatus(values: unknown): Promise<SaveState> {
  try {
    await requireEditor();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not permitted." };
  }
  const parsed = bulkStatusSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("creators")
    .update({ status: parsed.data.status })
    .in("id", parsed.data.creatorIds);

  if (error) return { error: error.message };
  revalidatePath("/admin/creators");
  return { error: null };
}

export async function bulkAssignCategory(values: unknown): Promise<SaveState> {
  try {
    await requireEditor();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not permitted." };
  }
  const parsed = bulkCategorySchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  // Added as a secondary category: the primary one is a deliberate choice per
  // creator and is not overwritten in bulk.
  const { error } = await supabase.from("creator_categories").upsert(
    parsed.data.creatorIds.map((creatorId) => ({
      creator_id: creatorId,
      category_id: parsed.data.categoryId,
      is_primary: false,
    })),
    { onConflict: "creator_id,category_id", ignoreDuplicates: true },
  );

  if (error) return { error: error.message };
  revalidatePath("/admin/creators");
  return { error: null };
}

export async function updateInlineField(
  creatorId: string,
  field: "display_name" | "city" | "status" | "data_confidence" | "accepts_barter",
  value: string | boolean | null,
): Promise<SaveState> {
  try {
    await requireEditor();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not permitted." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("creators")
    .update({ [field]: value })
    .eq("id", creatorId);

  if (error) return { error: error.message };
  revalidatePath("/admin/creators");
  return { error: null };
}

export async function setUserRole(values: unknown): Promise<SaveState> {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return { error: "Only an admin can change roles." };

  const parsed = roleUpdateSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (parsed.data.userId === user!.id && parsed.data.role !== "admin") {
    return {
      error:
        "You cannot remove your own admin role. Ask another admin to do it, so the " +
        "product is never left without one.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.userId);

  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { error: null };
}

export async function createCategory(name: string, parentId: string | null): Promise<SaveState> {
  try {
    await requireEditor();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not permitted." };
  }
  const trimmed = name.trim();
  if (!trimmed) return { error: "Give the category a name." };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("categories").select("slug");
  const slug = uniqueSlug(
    { displayName: trimmed },
    new Set((existing ?? []).map((row) => row.slug)),
  );

  const { error } = await supabase
    .from("categories")
    .insert({ name: trimmed, slug, parent_id: parentId });

  if (error) return { error: error.message };
  revalidatePath("/admin/taxonomy");
  return { error: null };
}

export async function createTag(label: string): Promise<SaveState> {
  try {
    await requireEditor();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not permitted." };
  }
  const trimmed = label.trim().replace(/^#/, "");
  if (!trimmed) return { error: "Give the tag a label." };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("tags").select("slug");
  const slug = uniqueSlug(
    { displayName: trimmed },
    new Set((existing ?? []).map((row) => row.slug)),
  );

  const { error } = await supabase.from("tags").insert({ label: trimmed, slug });
  if (error) return { error: error.message };
  revalidatePath("/admin/taxonomy");
  return { error: null };
}

/** Portraits are stored in colour; the grayscale treatment is render-time CSS. */
export async function setPortraitUrl(
  creatorId: string,
  url: string | null,
): Promise<SaveState> {
  try {
    await requireEditor();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not permitted." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("creators")
    .update({ portrait_url: url })
    .eq("id", creatorId);

  if (error) return { error: error.message };
  revalidatePath("/creators");
  revalidatePath("/admin/creators");
  return { error: null };
}
