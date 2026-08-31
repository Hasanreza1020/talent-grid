import Image from "next/image";
import { cn } from "@/lib/utils";
import { initialsOf } from "@/lib/format";

/**
 * The one place in the product where visual boldness is spent.
 *
 * Grayscale is a render-time CSS filter and is never baked into the stored
 * file; originals stay in colour in Supabase Storage. When there is no
 * portrait, the fallback is a stone tile carrying the creator's initials in
 * the display serif, never a broken image and never a stock silhouette.
 */
export function Portrait({
  name,
  src,
  handle,
  sizes = "(min-width: 1280px) 400px, (min-width: 768px) 45vw, 90vw",
  priority = false,
  className,
  children,
}: {
  name: string;
  src?: string | null;
  handle?: string | null;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** Scrim contents, typically category chips. */
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

      {/*
        The scrim keeps both the handle badge and the chips legible over any
        photograph. Both belong at the bottom left, so they stack rather than
        overlap: badge above, chips below.
      */}
      {handle || children ? (
        <div className="portrait-scrim absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 p-3">
          {handle ? (
            <span
              className={cn(
                "rounded-full bg-brand px-2.5 py-1 text-xs text-white",
                "opacity-0 transition-opacity duration-200",
                "group-hover:opacity-100 group-focus-within:opacity-100",
              )}
            >
              @{handle}
            </span>
          ) : null}
          {children ? (
            <div className="flex flex-wrap items-center gap-1.5">{children}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
