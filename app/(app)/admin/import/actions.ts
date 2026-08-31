"use server";

import { revalidatePath } from "next/cache";
import { parseSpreadsheet } from "@/lib/import/parse-file";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isAdmin } from "@/lib/db/user";
import { transformRows, type SourceRow, type TransformResult } from "@/lib/import/transform";
import { normaliseName } from "@/lib/dedup";
import { uniqueSlug } from "@/lib/slug";

export type PreviewResult =
  | { ok: true; preview: TransformResult; columns: string[] }
  | { ok: false; error: string };

/**
 * Parses an uploaded file and returns exactly what would be written, without
 * writing anything. The wizard cannot reach the commit step without going
 * through this first.
 */
export async function previewImport(formData: FormData): Promise<PreviewResult> {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return { ok: false, error: "Only an admin can import a file." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a CSV or TSV file." };
  }
  if (file.size > 5_000_000) {
    return { ok: false, error: "That file is larger than 5 MB. Split it and try again." };
  }

  let rows: SourceRow[];
  try {
    rows = parseSpreadsheet(await file.text()).rows;
  } catch (error) {
    return {
      ok: false,
      error: `That file could not be read as a spreadsheet: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    };
  }

  if (rows.length === 0) return { ok: false, error: "That file has no data rows." };

  const columns = Object.keys(rows[0]);
  return { ok: true, preview: transformRows(rows), columns };
}

export type CommitResult = {
  error: string | null;
  inserted?: number;
  updated?: number;
  snapshots?: number;
};

/**
 * Writes a previously previewed import.
 *
 * `keepSeparateRows` carries the rows a human chose not to merge, so a
 * detected duplicate can be overruled rather than being forced through.
 */
export async function commitImport(
  categoryId: string,
  preview: TransformResult,
  keepSeparateRows: number[],
): Promise<CommitResult> {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return { error: "Only an admin can import a file." };

  const supabase = await createClient();
  const capturedOn = new Date().toISOString().slice(0, 10);

  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("id", categoryId)
    .maybeSingle();
  if (!category) return { error: "Choose a category to file these creators under." };

  // Split back out any merge the reviewer rejected.
  const creators = preview.creators.flatMap((creator) => {
    const rejected = creator.rowNumbers.filter((row) => keepSeparateRows.includes(row));
    if (creator.rowNumbers.length < 2 || rejected.length === 0) return [creator];

    return creator.rowNumbers.map((rowNumber) => ({
      ...creator,
      rowNumbers: [rowNumber],
      accounts: creator.accounts.filter((account) => account.sourceRow === rowNumber),
      displayName:
        rowNumber === creator.rowNumbers[0]
          ? creator.displayName
          : `${creator.displayName} (row ${rowNumber})`,
    }));
  });

  const { data: existingRows } = await supabase.from("creators").select("id, display_name, slug");
  const existingByName = new Map<string, string>();
  const takenSlugs = new Set<string>();
  for (const row of existingRows ?? []) {
    existingByName.set(normaliseName(row.display_name), row.id);
    takenSlugs.add(row.slug);
  }

  const outcome = { inserted: 0, updated: 0, snapshots: 0 };

  for (const creator of creators) {
    const key = normaliseName(creator.displayName);
    let creatorId = existingByName.get(key);

    if (creatorId) {
      outcome.updated += 1;
    } else {
      const slug = uniqueSlug(
        {
          displayName: creator.displayName,
          fallbackHandles: creator.accounts.map((account) => account.handle),
        },
        takenSlugs,
      );
      const { data: inserted, error } = await supabase
        .from("creators")
        .insert({
          slug,
          display_name: creator.displayName,
          country: "Bangladesh",
          primary_language: "bangla",
          gender: "undisclosed",
          status: "active",
          data_confidence: "unverified",
          source: "legacy_import",
        })
        .select("id")
        .single();
      if (error) return { error: error.message };
      const newId: string = inserted.id;
      creatorId = newId;
      existingByName.set(key, newId);
      outcome.inserted += 1;
    }

    await supabase
      .from("creator_categories")
      .upsert(
        { creator_id: creatorId, category_id: categoryId, is_primary: true },
        { onConflict: "creator_id,category_id" },
      );

    for (const account of creator.accounts) {
      const { data: accountRow, error } = await supabase
        .from("accounts")
        .upsert(
          {
            creator_id: creatorId,
            platform: account.platform,
            handle: account.handle,
            profile_url: account.profileUrl,
          },
          { onConflict: "creator_id,platform" },
        )
        .select("id")
        .single();
      if (error) return { error: error.message };
      if (account.followers === null) continue;

      // Snapshots are append-only; an existing row for today is left as it is.
      const { data: existingSnapshot } = await supabase
        .from("metric_snapshots")
        .select("id")
        .eq("account_id", accountRow.id)
        .eq("captured_on", capturedOn)
        .maybeSingle();
      if (existingSnapshot) continue;

      const { error: snapshotError } = await supabase.from("metric_snapshots").insert({
        account_id: accountRow.id,
        captured_on: capturedOn,
        followers: account.followers,
        source: "legacy_import",
      });
      if (snapshotError) return { error: snapshotError.message };
      outcome.snapshots += 1;
    }
  }

  revalidatePath("/creators");
  revalidatePath("/admin/creators");
  return { error: null, ...outcome };
}
