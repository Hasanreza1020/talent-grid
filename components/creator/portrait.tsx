import Image from "next/image";
import { cn } from "@/lib/utils";
import { initialsOf } from "@/lib/format";

/**
 * The one place in the product where visual boldness is spent.
 *
 * Portraits render in colour. The card's identity — name, handle and the
 * follower counts — sits on the photograph rather than under it, so the image
 * carries a scrim along its lower edge to keep that text legible over whatever
 * happens to be behind it. The scrim is drawn only when there is something to
 * make legible; a portrait with no overlay is left unobstructed.
 *
 * Hover lifts the image slightly instead of washing it in accent colour, which
 * marks the card being pointed at without putting a second hue on a face.
 *
 * When there is no portrait, the fallback is a stone tile carrying the
 * creator's initials in the display serif, never a broken image and never a
 * stock silhouette.
 */
export function Portrait({
  name,
  src,
  sizes = "(min-width: 1280px) 400px, (min-width: 768px) 45vw, 90vw",
  priority = false,
  className,
  chips,
  children,
}: {
  name: string;
  src?: string | null;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** Chips laid over the top edge, clear of the compare checkbox. */
  chips?: React.ReactNode;
  /** The identity block, laid over the scrim along the lower edge. */
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "group relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-stone",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          fill
          sizes={sizes}
          priority={priority}
          className="portrait-media object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center bg-stone"
          aria-label={`No portrait on file for ${name}`}
          role="img"
        >
          <span className="font-display text-2xl text-ink/45 select-none">
            {initialsOf(name)}
          </span>
        </div>
      )}

      {chips ? (
        <div className="absolute inset-x-0 top-0 flex flex-wrap items-center gap-1.5 p-3 pr-12">
          {chips}
        </div>
      ) : null}

      {children ? (
        <>
          <div
            aria-hidden
            className="portrait-scrim pointer-events-none absolute inset-x-0 bottom-0 h-3/5"
          />
          <div className="absolute inset-x-0 bottom-0 p-3 text-white">{children}</div>
        </>
      ) : null}
    </div>
  );
}
