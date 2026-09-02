import Image from "next/image";
import Link from "next/link";
import { initialsOf } from "@/lib/format";

export type WallCreator = {
  slug: string;
  name: string;
  portraitUrl: string | null;
};

/**
 * The drifting wall of portraits behind the hero.
 *
 * Two rows scroll in opposite directions at different speeds, which keeps the
 * band alive without any row reading as a queue you are meant to follow. Each
 * tile is a real link to that creator, so the wall is a way into the database
 * rather than wallpaper.
 *
 * The list is rendered twice per row and the animation translates by exactly
 * half its width, so the loop closes on itself with no visible jump. Motion is
 * dropped entirely under prefers-reduced-motion, where the wall simply sits
 * still and stays fully usable.
 */
export function PortraitWall({
  creators,
  dim = false,
}: {
  creators: WallCreator[];
  /** Held back and low contrast, for use as something for glass to blur. */
  dim?: boolean;
}) {
  if (creators.length === 0) return null;

  // Enough tiles that a short database still fills a wide screen.
  const base = creators.length >= 10 ? creators : [...creators, ...creators, ...creators];
  const rows = [base, [...base].reverse()];

  return (
    <div
      className={`pointer-events-none absolute inset-0 select-none overflow-hidden ${
        dim ? "opacity-30" : ""
      }`}
      style={{
        // Dimmed, the wall is the thing behind the glass, so it must run the
        // full width rather than being cleared out of the centre.
        maskImage: dim
          ? "radial-gradient(ellipse 90% 90% at 50% 50%, black 40%, transparent 92%)"
          : "radial-gradient(ellipse 62% 58% at 50% 50%, transparent 30%, black 82%)",
        WebkitMaskImage: dim
          ? "radial-gradient(ellipse 90% 90% at 50% 50%, black 40%, transparent 92%)"
          : "radial-gradient(ellipse 62% 58% at 50% 50%, transparent 30%, black 82%)",
      }}
    >
      <div className="absolute inset-0 flex flex-col justify-center gap-3 opacity-[0.34]">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex overflow-hidden">
            <div
              className={
                rowIndex === 0
                  ? "portrait-marquee flex shrink-0 gap-3"
                  : "portrait-marquee portrait-marquee--reverse flex shrink-0 gap-3"
              }
              style={{ animationDuration: rowIndex === 0 ? "90s" : "120s" }}
            >
              {/* Rendered twice: the second copy is what the first scrolls
                  into, which is what makes the loop seamless. */}
              {[...row, ...row].map((creator, index) => {
                // The second pass exists only to close the loop visually. It
                // is hidden from assistive tech and skipped by the keyboard so
                // every creator is announced and tabbed to exactly once.
                const isDuplicate = index >= row.length;
                return (
                <Link
                  key={`${rowIndex}-${index}-${creator.slug}`}
                  href={`/creators/${creator.slug}`}
                  // The container turns pointer events off so the headline and
                  // search stay clickable through the gaps; the tiles turn them
                  // back on for themselves.
                  className="pointer-events-auto group/tile aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-lg bg-stone sm:w-28 lg:w-32"
                  aria-label={creator.name}
                  aria-hidden={isDuplicate || undefined}
                  tabIndex={isDuplicate ? -1 : undefined}
                >
                  {creator.portraitUrl ? (
                    <Image
                      src={creator.portraitUrl}
                      alt=""
                      width={128}
                      height={160}
                      sizes="128px"
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center font-display text-lg text-ink/30">
                      {initialsOf(creator.name)}
                    </span>
                  )}
                </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
