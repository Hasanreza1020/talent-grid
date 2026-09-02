import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The mark: a three-by-three grid with the last cell left out.
 *
 * The supplied file is a 4.9 MB SVG wrapping eight base64 raster tiles, which
 * is a design-tool export artefact rather than a logo. The shape is eight
 * squares on a regular grid, so it is drawn here as eight rects: about four
 * hundred bytes, crisp at any size, and painted in `currentColor` so the same
 * component works on the light product chrome and on the ink CMS sidebar
 * without a second file.
 *
 * Geometry is the source file's, rounded to whole units: a 156 cell on a 186
 * pitch, so 3 x 156 + 2 x 30 = 528 on both axes.
 */
export function GridMark({ className }: { className?: string }) {
  const positions = [0, 186, 372];
  return (
    <svg
      viewBox="0 0 528 528"
      fill="currentColor"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      {positions.flatMap((y, row) =>
        positions
          // The bottom-right cell is the gap in the mark, not an omission.
          .filter((_, column) => !(row === 2 && column === 2))
          .map((x) => <rect key={`${x}-${y}`} x={x} y={y} width={156} height={156} />),
      )}
    </svg>
  );
}

/**
 * The full lockup: mark, name, and the line that says what the product is.
 * `tone` picks the tagline's contrast, because the CMS flies it on ink while
 * the product flies it on canvas.
 */
export function Wordmark({
  href = "/",
  suffix,
  tone = "light",
  className,
}: {
  href?: string;
  suffix?: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <GridMark className="size-7" />
      <span className="flex flex-col justify-center">
        <span className="font-display text-lg leading-none">
          Grid
          {suffix ? (
            <span className={tone === "dark" ? "text-white/45" : "text-ink-muted"}>
              {" "}
              {suffix}
            </span>
          ) : null}
        </span>
        {/* Short enough to keep at sm; below that the header is one crowded
            row and the lockup falls back to the mark and the name. */}
        <span
          className={cn(
            "mt-1 hidden text-[10px] leading-none sm:block",
            tone === "dark" ? "text-white/45" : "text-ink-muted",
          )}
        >
          A product of One Tech
        </span>
      </span>
    </Link>
  );
}
