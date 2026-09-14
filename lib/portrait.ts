/**
 * The thumbnail that sits beside every stored portrait.
 *
 * `optimize-portraits.ts` writes two files per creator — `<slug>.webp` at
 * 720x900 and `<slug>-sm.webp` at 240x300 — and only the first is recorded in
 * the database. The second is derived by name, which keeps the pair out of the
 * schema: there is nothing to migrate, nothing to backfill, and no second
 * column that can disagree with the first.
 *
 * With the image optimiser off, whatever is asked for is what is downloaded in
 * full. A collage tile is eighty pixels wide; handing it the master is roughly
 * ten times the bytes it can use, several hundred times over on the home page.
 */
export function thumbOf(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.endsWith(".webp")) return url;
  if (url.endsWith("-sm.webp")) return url;
  return `${url.slice(0, -".webp".length)}-sm.webp`;
}
