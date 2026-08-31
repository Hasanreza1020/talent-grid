import Image from "next/image";
import { initialsOf } from "@/lib/format";

/**
 * The fanned wall of portraits behind the hero.
 *
 * It is decoration made of real records, not a stock image and not a device
 * mockup. A radial mask fades it toward the edges and behind the headline, so
 * the type stays the thing you read first. Marked aria-hidden because every
 * creator here is reachable through the search input directly below it.
 */
export function PortraitWall({
  creators,
}: {
  creators: { name: string; portraitUrl: string | null }[];
}) {
  if (creators.length === 0) return null;

  // Repeat until the wall is full, so a small database still fills the band.
  const tiles = Array.from({ length: 24 }, (_, index) => creators[index % creators.length]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 select-none"
      style={{
        maskImage:
          "radial-gradient(ellipse 70% 65% at 50% 50%, transparent 22%, black 78%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 70% 65% at 50% 50%, transparent 22%, black 78%)",
      }}
    >
      <div className="flex h-full items-center justify-center gap-3 opacity-[0.28]">
        {tiles.map((creator, index) => (
          <div
            key={index}
            className="aspect-[4/5] w-28 shrink-0 overflow-hidden rounded-lg bg-stone sm:w-32"
            style={{
              // A gentle fan: alternating vertical offset rather than rotation,
              // which keeps the grid legible at small sizes.
              transform: `translateY(${(index % 3) * 14 - 14}px)`,
            }}
          >
            {creator.portraitUrl ? (
              <Image
                src={creator.portraitUrl}
                alt=""
                width={128}
                height={160}
                className="size-full object-cover grayscale contrast-[1.08]"
              />
            ) : (
              <span className="flex size-full items-center justify-center font-display text-lg text-ink/30">
                {initialsOf(creator.name)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
