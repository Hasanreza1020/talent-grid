"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/db/user";

export type ActionState = { error: string | null; message?: string };

const nameSchema = z.object({
  name: z.string().min(1, "Give the shortlist a name."),
  clientName: z.string().optional(),
  briefNotes: z.string().optional(),
});

export async function createShortlist(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You are not signed in." };

  const parsed = nameSchema.safeParse({
    name: formData.get("name"),
    clientName: formData.get("clientName") || undefined,
    briefNotes: formData.get("briefNotes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shortlists")
    .insert({
      name: parsed.data.name,
      client_name: parsed.data.clientName ?? null,
      brief_notes: parsed.data.briefNotes ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/shortlists");
  redirect(`/shortlists/${data.id}`);
}

export async function renameShortlist(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("shortlists")
    .update({
      name: String(formData.get("name") ?? "").trim() || "Untitled shortlist",
      client_name: String(formData.get("clientName") ?? "").trim() || null,
      brief_notes: String(formData.get("briefNotes") ?? "").trim() || null,
    })
    .eq("id", id);

  revalidatePath(`/shortlists/${id}`);
  revalidatePath("/shortlists");
}

export async function deleteShortlist(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("shortlists").delete().eq("id", id);
  revalidatePath("/shortlists");
  redirect("/shortlists");
}

export async function addCreatorsToShortlist(
  shortlistId: string,
  creatorIds: string[],
): Promise<ActionState> {
  if (creatorIds.length === 0) return { error: "No creators selected." };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("shortlist_items")
    .select("creator_id, position")
    .eq("shortlist_id", shortlistId)
    .order("position", { ascending: false })
    .limit(1);

  let nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const rows = creatorIds.map((creatorId) => ({
    shortlist_id: shortlistId,
    creator_id: creatorId,
    position: nextPosition++,
  }));

  // Already-present creators keep their position rather than jumping to the end.
  const { error } = await supabase
    .from("shortlist_items")
    .upsert(rows, { onConflict: "shortlist_id,creator_id", ignoreDuplicates: true });

  if (error) return { error: error.message };

  revalidatePath(`/shortlists/${shortlistId}`);
  revalidatePath("/shortlists");
  return { error: null, message: `Added ${creatorIds.length} creator(s).` };
}

export async function removeFromShortlist(
  shortlistId: string,
  creatorId: string,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("shortlist_items")
    .delete()
    .eq("shortlist_id", shortlistId)
    .eq("creator_id", creatorId);

  revalidatePath(`/shortlists/${shortlistId}`);
}

export async function reorderShortlist(
  shortlistId: string,
  orderedCreatorIds: string[],
): Promise<void> {
  const supabase = await createClient();
  await Promise.all(
    orderedCreatorIds.map((creatorId, index) =>
      supabase
        .from("shortlist_items")
        .update({ position: index })
        .eq("shortlist_id", shortlistId)
        .eq("creator_id", creatorId),
    ),
  );
  revalidatePath(`/shortlists/${shortlistId}`);
}

export async function setPitchNote(
  shortlistId: string,
  creatorId: string,
  note: string,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("shortlist_items")
    .update({ pitch_note: note.trim() || null })
    .eq("shortlist_id", shortlistId)
    .eq("creator_id", creatorId);

  revalidatePath(`/shortlists/${shortlistId}`);
}

const shareSchema = z.object({
  expiresInDays: z.coerce.number().int().min(1).max(365),
  includeRates: z.boolean(),
});

export async function createShareLink(
  shortlistId: string,
  formData: FormData,
): Promise<void> {
  const parsed = shareSchema.safeParse({
    expiresInDays: formData.get("expiresInDays") ?? 14,
    includeRates: formData.get("includeRates") === "on",
  });
  if (!parsed.success) return;

  const expiresAt = new Date(
    Date.now() + parsed.data.expiresInDays * 86_400_000,
  ).toISOString();

  const supabase = await createClient();
  await supabase
    .from("shortlists")
    .update({
      share_token: randomBytes(18).toString("base64url"),
      share_expires_at: expiresAt,
      include_rates_in_share: parsed.data.includeRates,
    })
    .eq("id", shortlistId);

  revalidatePath(`/shortlists/${shortlistId}`);
}

export async function revokeShareLink(shortlistId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("shortlists")
    .update({ share_token: null, share_expires_at: null })
    .eq("id", shortlistId);

  revalidatePath(`/shortlists/${shortlistId}`);
}
