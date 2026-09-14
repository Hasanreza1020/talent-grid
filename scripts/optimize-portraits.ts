/**
 * Re-encodes the stored portraits and writes a thumbnail beside each one.
 *
 *   pnpm tsx scripts/optimize-portraits.ts            # dry run
 *   pnpm tsx scripts/optimize-portraits.ts --commit
 *
 * With the image optimiser switched off, whatever is in the bucket is what
 * every visitor downloads. The import script wrote a megapixel at quality 88,
 * which is about 190KB — reasonable for the one place a portrait is shown
 * large, and absurd for an eighty-pixel collage tile. A single visit to the
 * home page asks for several hundred of them.
 *
 * So each portrait becomes two files:
 *
 *   portraits/<slug>.webp     720x900  — the card and the detail hero
 *   portraits/<slug>-sm.webp  240x300  — collage tiles, trays, table rows
 *
 * The master keeps its path, so nothing stored in the database changes and no
 * migration is needed; the thumbnail is derived from the same URL by name.
 *
 * Re-runnable. A portrait that already has a thumbnail and a master at the new
 * size is skipped, so a run interrupted by a dropped connection can simply be
 * started again.
 */

import { createWriteClient } from "./supabase-admin";
import sharp from "sharp";

const BUCKET = "creator-media";

const MASTER = { width: 720, height: 900, quality: 72 };
const THUMB = { width: 240, height: 300, quality: 70 };

/** Already small enough that re-encoding would only lose quality. */
const MASTER_CEILING_BYTES = 90_000;

type Row = { id: string; slug: string; display_name: string; portrait_url: string | null };

function parseArgs(argv: string[]) {
  return {
    commit: argv.includes("--commit"),
    force: argv.includes("--force"),
  };
}

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = await createWriteClient();

  const { data, error } = await supabase
    .from("creators")
    .select("id, slug, display_name, portrait_url")
    .not("portrait_url", "is", null)
    .is("deleted_at", null);
  if (error) throw error;

  const rows = (data ?? []) as Row[];

  // One listing rather than a HEAD per creator: the bucket knows every object
  // and its size already, and 227 extra round trips on a home connection is
  // the difference between a minute and ten.
  const existing = new Map<string, number>();
  for (let offset = 0; ; offset += 100) {
    const page = await supabase.storage
      .from(BUCKET)
      .list("portraits", { limit: 100, offset });
    if (page.error) throw page.error;
    for (const object of page.data ?? []) {
      existing.set(object.name, (object.metadata?.size as number) ?? 0);
    }
    if ((page.data?.length ?? 0) < 100) break;
  }

  let done = 0;
  let skipped = 0;
  let savedBefore = 0;
  let savedAfter = 0;
  const failures: string[] = [];

  for (const row of rows) {
    const masterName = `${row.slug}.webp`;
    const thumbName = `${row.slug}-sm.webp`;
    const masterSize = existing.get(masterName) ?? 0;

    const alreadyDone =
      !args.force && existing.has(thumbName) && masterSize > 0 && masterSize <= MASTER_CEILING_BYTES;
    if (alreadyDone) {
      skipped += 1;
      continue;
    }

    if (!args.commit) {
      done += 1;
      savedBefore += masterSize;
      continue;
    }

    try {
      const source = await withRetry(async () => {
        const { data: blob, error: downloadError } = await supabase.storage
          .from(BUCKET)
          .download(`portraits/${masterName}`);
        if (downloadError) throw downloadError;
        return Buffer.from(await blob.arrayBuffer());
      });

      const [master, thumb] = await Promise.all([
        sharp(source)
          .resize(MASTER.width, MASTER.height, { fit: "cover", position: "attention" })
          .webp({ quality: MASTER.quality })
          .toBuffer(),
        sharp(source)
          .resize(THUMB.width, THUMB.height, { fit: "cover", position: "attention" })
          .webp({ quality: THUMB.quality })
          .toBuffer(),
      ]);

      await withRetry(async () => {
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(`portraits/${thumbName}`, thumb, {
            contentType: "image/webp",
            upsert: true,
          });
        if (uploadError) throw uploadError;
      });

      // The master is written second on purpose. If the run dies between the
      // two, the thumbnail exists but the master is still the old size, and
      // the skip check above will pick this creator up again next time.
      await withRetry(async () => {
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(`portraits/${masterName}`, master, {
            contentType: "image/webp",
            upsert: true,
          });
        if (uploadError) throw uploadError;
      });

      savedBefore += masterSize;
      savedAfter += master.length + thumb.length;
      done += 1;
      if (done % 25 === 0) console.log(`  ${done} done…`);
    } catch (failure) {
      failures.push(
        `${row.display_name}: ${failure instanceof Error ? failure.message : String(failure)}`,
      );
    }
  }

  const kb = (bytes: number) => `${Math.round(bytes / 1024)}KB`;
  console.log(
    `${args.commit ? "Rewrote" : "Would rewrite"} ${done}, skipped ${skipped}, failed ${failures.length}.`,
  );
  if (args.commit && savedBefore > 0) {
    console.log(
      `Masters were ${kb(savedBefore)}; master plus thumbnail is now ${kb(savedAfter)}.`,
    );
  }
  for (const failure of failures.slice(0, 10)) console.log(`  ${failure}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
