import Image from "next/image";
import { cn } from "@/lib/utils";
import { initialsOf } from "@/lib/format";

/**
 * The one place in the product where visual boldness is spent.
 *
 * The photograph is left unobstructed. Nothing is laid over it at rest, so a
 * grid of these reads as a wall of faces rather than a wall of darkened
 * thumbnails. The only overlay is a warm glow along the bottom edge on hover,
 * which marks the card you are pointing at without hiding the face.
 *
 * Grayscale is a render-time CSS filter and is never baked into the stored
 * file; originals stay in colour in Supabase Storage. When there is no
 * portrait, the fallback is a stone tile carrying the creator's initials in
 * the display serif, never a broken image and never a stock silhouette.
 */
export function Portrait({
  name,
  src,
  sizes = "(min-width: 1280px) 400px, (min-width: 768px) 45vw, 90vw",
  priority = false,
  className,
  children,
}: {
  name: string;
  src?: string | null;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** Chips laid over the lower edge of the image. */
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

      {/* The hover marker: a warm wash rising from the bottom edge. Absent at
          rest, so the image is never dimmed just to sit in a grid. */}
      <div
        aria-hidden
        className="portrait-glow pointer-events-none absolute inset-x-0 bottom-0 h-2/5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
      />

      {children ? (
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-1.5 p-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
