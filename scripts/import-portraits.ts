/**
 * Uploads creator portraits from a folder of images.
 *
 *   pnpm import:portraits -- --dir "C:\Users\Hasan\Downloads\Influencer Database\Travel"
 *   # dry run by default; add --commit to upload and write portrait_url
 *
 * Files are matched to creators by filename. The agency names them after the
 * creator, but not identically to the sheet ("bd traveller.jpg" against
 * "Bd travellers", "Mr. Mixer_s World.jpg" against "Mr. Mixer's World"), so the
 * same normalisation and similarity used by the duplicate matcher is used here.
 * Anything that does not match confidently is reported rather than guessed at:
 * attaching the wrong face to a creator is worse than attaching none.
 *
 * Images are cropped to 4:5 and stored in colour. The black-and-white
 * treatment is a render-time CSS filter and is never baked into the file.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, extname, join, resolve, dirname } from "node:path";
import sharp from "sharp";

import { createWriteClient } from "./supabase-admin";
import { normaliseName, nameSimilarity } from "../lib/dedup";

const OUTPUT_WIDTH = 1000;
const OUTPUT_HEIGHT = 1250; // 4:5
const MATCH_THRESHOLD = 0.82;
/**
 * Score given when one normalised name contains the other outright. Set just
 * above the threshold so a containment match is accepted but still loses to a
 * closer edit-distance match for the same file.
 */
const CONTAINMENT_SCORE = 0.85;
/**
 * How long the contained run must be. Short names produce accidental
 * containments; eight characters makes a coincidence unlikely.
 */
const MIN_CONTAINMENT_LENGTH = 8;

/**
 * Retries a transient failure a few times with a widening delay. Only network
 * flakiness is worth retrying; a rejected file or a permissions error will
 * fail identically every time and simply surfaces after the last attempt.
 */
async function withRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  throw lastError;
}

/** True when either normalised name wholly contains the other. */
function isContained(a: string, b: string): boolean {
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (shorter.length < MIN_CONTAINMENT_LENGTH) return false;
  return longer.includes(shorter);
}
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".jfif", ".avif"]);

type Args = {
  dir: string;
  commit: boolean;
  reportPath: string;
  category: string | null;
  /** Overwrite portraits that are already on file. Off by default. */
  replace: boolean;
};

function parseArgs(argv: string[]): Args {
  const get = (name: string) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const dir = get("dir");
  if (!dir) {
    console.error(
      'Usage: tsx scripts/import-portraits.ts --dir "<folder>" [--commit]\n' +
        "       Runs as a dry run unless --commit is given.\n" +
        "       Creators that already have a portrait are skipped unless --replace.",
    );
    process.exit(1);
  }
  return {
    dir: resolve(dir),
    commit: argv.includes("--commit"),
    replace: argv.includes("--replace"),
    reportPath: resolve(get("report") ?? "scripts/output/portrait-report.md"),
    category: get("category") ?? null,
  };
}

type Match = {
  file: string;
  creatorId: string;
  creatorName: string;
  slug: string;
  similarity: number;
  exact: boolean;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = await createWriteClient();

  const files = readdirSync(args.dir).filter((file) =>
    IMAGE_EXTENSIONS.has(extname(file).toLowerCase()),
  );

  // Scoping to one category matters once the database is large: names repeat
  // across categories, and an unscoped match can put a Beauty creator's face
  // on the Lifestyle creator who happens to share her first name.
  const { data: allCreators, error } = await supabase
    .from("creators")
    .select(
      "id, display_name, slug, portrait_url, creator_categories!inner(is_primary, categories(name))",
    )
    .is("deleted_at", null);
  if (error) throw error;

  const creators = (allCreators ?? []).filter((creator) => {
    if (!args.category) return true;
    const links = Array.isArray(creator.creator_categories)
      ? creator.creator_categories
      : [creator.creator_categories];
    return links.some((link) => {
      if (!link?.is_primary) return false;
      const category = Array.isArray(link.categories) ? link.categories[0] : link.categories;
      return category?.name?.toLowerCase() === args.category!.toLowerCase();
    });
  });

  if (args.category && creators.length === 0) {
    console.error(
      `No creators have "${args.category}" as their primary category, so there ` +
        `is nothing for these images to attach to. Import that category's sheet first.`,
    );
    process.exit(1);
  }

  const matches: Match[] = [];
  const unmatchedFiles: { file: string; closest: string; similarity: number }[] = [];
  const claimed = new Map<string, string>(); // creatorId -> file

  for (const file of files) {
    const stem = basename(file, extname(file));
    // The agency writes the social handle after the name — "Eza (Its Eza)",
    // "Sanzida Arfin (Primu)" — and the sheet records only the name. Comparing
    // with the handle still attached drags a genuine match well below the
    // threshold, so the parenthetical is dropped before comparing. It is a
    // handle, not part of the person's name. A trailing "(1)" from a duplicate
    // download goes the same way, which is right for the same reason.
    const stripped = stem.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
    const normalisedStem = normaliseName(stripped || stem);

    let best: { creator: (typeof creators)[number]; similarity: number } | null = null;
    for (const creator of creators ?? []) {
      const normalisedCreator = normaliseName(creator.display_name);
      let similarity: number;

      if (normalisedCreator === normalisedStem) {
        similarity = 1;
      } else if (isContained(normalisedStem, normalisedCreator)) {
        // One name sits wholly inside the other: "Khudalagse.jpg" against
        // "Khudalagse (Fahrin Zannat Faiza)", or "Highway Foodie Masum.jpg"
        // against "Highway Foodie". Edit distance scores these poorly because
        // of the extra words, but containment of a long enough run of
        // characters is a stronger signal than the distance is.
        similarity = Math.max(
          CONTAINMENT_SCORE,
          nameSimilarity(creator.display_name, stripped || stem),
        );
      } else {
        similarity = nameSimilarity(creator.display_name, stripped || stem);
      }

      if (!best || similarity > best.similarity) best = { creator, similarity };
    }

    if (!best || best.similarity < MATCH_THRESHOLD) {
      unmatchedFiles.push({
        file,
        closest: best?.creator.display_name ?? "nothing",
        similarity: best?.similarity ?? 0,
      });
      continue;
    }

    // Two files competing for one creator is ambiguous; keep the better match
    // and report the loser rather than silently overwriting.
    const existing = matches.find((match) => match.creatorId === best!.creator.id);
    if (existing) {
      const loser = existing.similarity >= best.similarity ? { file, similarity: best.similarity } : { file: existing.file, similarity: existing.similarity };
      if (existing.similarity < best.similarity) {
        existing.file = file;
        existing.similarity = best.similarity;
        existing.exact = best.similarity === 1;
      }
      unmatchedFiles.push({
        file: loser.file,
        closest: `${best.creator.display_name} (already claimed by a closer filename)`,
        similarity: loser.similarity,
      });
      continue;
    }

    matches.push({
      file,
      creatorId: best.creator.id,
      creatorName: best.creator.display_name,
      slug: best.creator.slug,
      similarity: best.similarity,
      exact: best.similarity === 1,
    });
    claimed.set(best.creator.id, file);
  }

  // Creators that will still have no portrait after this run. A creator whose
  // portrait was uploaded by an earlier run is not missing one, so counting
  // only "not matched in this folder" would overstate the backlog badly once
  // more than one category is loaded.
  const withoutImage = (creators ?? []).filter(
    (creator) =>
      creator.portrait_url === null &&
      !matches.some((match) => match.creatorId === creator.id),
  );

  let uploaded = 0;
  let skipped = 0;
  const failures: { file: string; reason: string }[] = [];

  // A creator who already has a portrait is left alone unless --replace is
  // given. Uploading a hundred images over a home connection reliably throws
  // the odd transient "fetch failed", and without this a re-run to pick up the
  // handful that failed would push the whole folder again — more work, more
  // chances to fail, on the connection that just proved unreliable.
  const alreadyHas = new Set(
    (creators ?? []).filter((creator) => creator.portrait_url !== null).map((c) => c.id),
  );

  if (args.commit) {
    for (const match of matches) {
      if (!args.replace && alreadyHas.has(match.creatorId)) {
        skipped += 1;
        continue;
      }
      try {
        const source = readFileSync(join(args.dir, match.file));
        // Centre crop to 4:5, then resize. `cover` keeps the subject centred
        // and never letterboxes, which is what the fixed portrait ratio needs.
        const processed = await sharp(source)
          .rotate() // honour EXIF orientation
          .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: "cover", position: "attention" })
          .webp({ quality: 88 })
          .toBuffer();

        const path = `portraits/${match.slug}.webp`;
        // Uploading a hundred files over a home connection produces the odd
        // transient "fetch failed". Retrying is safe because the upload is an
        // upsert to a deterministic path.
        await withRetry(async () => {
          const { error: uploadError } = await supabase.storage
            .from("creator-media")
            .upload(path, processed, { contentType: "image/webp", upsert: true });
          if (uploadError) throw uploadError;
        });

        const {
          data: { publicUrl },
        } = supabase.storage.from("creator-media").getPublicUrl(path);

        const { error: updateError } = await supabase
          .from("creators")
          .update({ portrait_url: publicUrl })
          .eq("id", match.creatorId);
        if (updateError) throw updateError;

        uploaded += 1;
      } catch (uploadFailure) {
        failures.push({
          file: match.file,
          reason: uploadFailure instanceof Error ? uploadFailure.message : String(uploadFailure),
        });
      }
    }
  }

  // Report -----------------------------------------------------------------

  const lines: string[] = [];
  lines.push("# Portrait import report");
  lines.push("");
  lines.push(`- Source folder: \`${args.dir}\``);
  lines.push(`- Run at: ${new Date().toISOString()}`);
  lines.push(`- Mode: ${args.commit ? "uploaded" : "dry run, nothing uploaded"}`);
  lines.push("");
  lines.push("| | |");
  lines.push("| --- | --- |");
  lines.push(`| Image files found | ${files.length} |`);
  lines.push(`| Matched to a creator | ${matches.length} |`);
  lines.push(`| Files with no confident match | ${unmatchedFiles.length} |`);
  lines.push(`| Creators still without a portrait | ${withoutImage.length} |`);
  if (args.commit) {
    lines.push(`| Uploaded | ${uploaded} |`);
    lines.push(`| Upload failures | ${failures.length} |`);
  }
  lines.push("");

  lines.push("## Matches");
  lines.push("");
  lines.push("| File | Creator | Match |");
  lines.push("| --- | --- | --- |");
  for (const match of matches.sort((a, b) => a.creatorName.localeCompare(b.creatorName))) {
    lines.push(
      `| \`${match.file}\` | ${match.creatorName} | ` +
        `${match.exact ? "exact" : `${(match.similarity * 100).toFixed(1)}% similar`} |`,
    );
  }
  lines.push("");

  lines.push("## Files with no confident match");
  lines.push("");
  if (unmatchedFiles.length === 0) {
    lines.push("Every file matched a creator.");
  } else {
    lines.push(
      `Below the ${(MATCH_THRESHOLD * 100).toFixed(0)}% similarity threshold, so no ` +
        `portrait was attached. Attaching the wrong face to a creator is worse than ` +
        `attaching none, so these need a human decision.`,
    );
    lines.push("");
    lines.push("| File | Closest creator | Similarity |");
    lines.push("| --- | --- | --- |");
    for (const item of unmatchedFiles) {
      lines.push(
        `| \`${item.file}\` | ${item.closest} | ${(item.similarity * 100).toFixed(1)}% |`,
      );
    }
  }
  lines.push("");

  lines.push("## Creators still without a portrait");
  lines.push("");
  if (withoutImage.length === 0) {
    lines.push("Every creator has one.");
  } else {
    for (const creator of withoutImage) lines.push(`- ${creator.display_name}`);
  }
  lines.push("");

  if (failures.length) {
    lines.push("## Upload failures");
    lines.push("");
    for (const failure of failures) lines.push(`- \`${failure.file}\`: ${failure.reason}`);
    lines.push("");
  }

  mkdirSync(dirname(args.reportPath), { recursive: true });
  writeFileSync(args.reportPath, lines.join("\n"), "utf8");

  console.log(
    `${args.commit ? "Uploaded" : "Dry run"}: ${files.length} files, ` +
      `${matches.length} matched, ${unmatchedFiles.length} unmatched, ` +
      `${withoutImage.length} creator(s) still without a portrait.` +
      (args.commit
        ? ` ${uploaded} uploaded, ${skipped} already had one, ${failures.length} failed.`
        : ""),
  );
  console.log(`Report written to ${args.reportPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
