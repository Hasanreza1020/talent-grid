/**
 * Slug generation.
 *
 * Several creator names are written in Bangla, which slugifies to an empty
 * string. Rather than emit "creator-1" for all of them, the primary handle is
 * used as the fallback, which is both stable and recognisable. A short random
 * suffix is the last resort.
 */

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    // Apostrophes close up rather than becoming separators, so "Mr. Mixer's
    // World" slugifies to mr-mixers-world and not mr-mixer-s-world.
    .replace(/['‘’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type SlugSources = {
  displayName: string;
  /** Tried in order when the display name yields nothing slugifiable. */
  fallbackHandles?: (string | null | undefined)[];
};

/**
 * Produces a slug that is unique against `taken`, appending -2, -3 and so on
 * when the base collides. `taken` is mutated so successive calls stay unique.
 */
export function uniqueSlug(sources: SlugSources, taken: Set<string>): string {
  let base = slugify(sources.displayName);

  if (!base) {
    for (const handle of sources.fallbackHandles ?? []) {
      if (!handle) continue;
      base = slugify(handle);
      if (base) break;
    }
  }

  if (!base) {
    base = `creator-${Math.random().toString(36).slice(2, 8)}`;
  }

  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }

  let counter = 2;
  while (taken.has(`${base}-${counter}`)) counter += 1;
  const result = `${base}-${counter}`;
  taken.add(result);
  return result;
}
