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
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".jfif", ".avif"]);

type Args = { dir: string; commit: boolean; reportPath: string };

function parseArgs(argv: string[]): Args {
  const get = (name: string) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const dir = get("dir");
  if (!dir) {
    console.error(
      'Usage: tsx scripts/import-portraits.ts --dir "<folder>" [--commit]\n' +
        "       Runs as a dry run unless --commit is given.",
    );
    process.exit(1);
  }
  return {
    dir: resolve(dir),
    commit: argv.includes("--commit"),
    reportPath: resolve(get("report") ?? "scripts/output/portrait-report.md"),
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

  const { data: creators, error } = await supabase
    .from("creators")
    .select("id, display_name, slug, portrait_url")
    .is("deleted_at", null);
  if (error) throw error;

  const matches: Match[] = [];
  const unmatchedFiles: { file: string; closest: string; similarity: number }[] = [];
  const claimed = new Map<string, string>(); // creatorId -> file

  for (const file of files) {
    const stem = basename(file, extname(file));
    const normalisedStem = normaliseName(stem);

    let best: { creator: (typeof creators)[number]; similarity: number } | null = null;
    for (const creator of creators ?? []) {
      const similarity =
        normaliseName(creator.display_name) === normalisedStem
          ? 1
          : nameSimilarity(creator.display_name, stem);
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

  const withoutImage = (creators ?? []).filter(
    (creator) => !matches.some((match) => match.creatorId === creator.id),
  );

  let uploaded = 0;
  const failures: { file: string; reason: string }[] = [];

  if (args.commit) {
    for (const match of matches) {
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
        const { error: uploadError } = await supabase.storage
          .from("creator-media")
          .upload(path, processed, { contentType: "image/webp", upsert: true });
        if (uploadError) throw uploadError;

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
      (args.commit ? ` ${uploaded} uploaded, ${failures.length} failed.` : ""),
  );
  console.log(`Report written to ${args.reportPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
