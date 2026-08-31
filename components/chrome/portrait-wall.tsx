import Image from "next/image";
import { initialsOf } from "@/lib/format";

/**
 * The fanned wall of portraits behind the hero.
 *
 * It is decoration made of real records, not a stock image and not a device
 * mockup. Two staggered rows fill the band rather than a single centred strip,
 * and a radial mask fades it toward the edges and behind the headline so the
 * type stays the thing you read first.
 *
 * Marked aria-hidden and the images carry empty alt text: every creator here is
 * reachable through the search input directly below it, so announcing twenty
 * names to a screen reader would be noise, not information.
 */
export function PortraitWall({
  creators,
}: {
  creators: { name: string; portraitUrl: string | null }[];
}) {
  if (creators.length === 0) return null;

  const perRow = 12;
  const rows = [0, 1].map((rowIndex) =>
    Array.from(
      { length: perRow },
      // Offset the second row so the same faces do not sit directly above
      // each other when the database is small enough to repeat.
      (_, index) => creators[(index + rowIndex * 5) % creators.length],
    ),
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      style={{
        maskImage:
          "radial-gradient(ellipse 62% 58% at 50% 50%, transparent 30%, black 82%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 62% 58% at 50% 50%, transparent 30%, black 82%)",
      }}
    >
      <div className="absolute inset-0 flex flex-col justify-center gap-3 opacity-[0.32]">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex shrink-0 justify-center gap-3"
            style={{ transform: `translateX(${rowIndex === 1 ? "-3rem" : "1.5rem"})` }}
          >
            {row.map((creator, index) => (
              <div
                key={`${rowIndex}-${index}`}
                className="aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-lg bg-stone sm:w-28 lg:w-32"
              >
                {creator.portraitUrl ? (
                  <Image
                    src={creator.portraitUrl}
                    alt=""
                    width={128}
                    height={160}
                    sizes="128px"
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
        ))}
      </div>
    </div>
  );
}
