import {
  Baby,
  Car,
  Cpu,
  Dumbbell,
  GraduationCap,
  Laugh,
  Plane,
  Shirt,
  Sparkles,
  Sun,
  Trophy,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Platform } from "@/lib/types";

/**
 * Platform marks.
 *
 * lucide-react 1.x removed every brand icon, and the spec allows no icon set
 * beyond lucide, so the four marks are drawn here as single paths rather than
 * pulled from a second package. They are simplified identification marks in
 * currentColor, sized to sit on a 14px line of text.
 */
const PLATFORM_PATHS: Record<Platform, React.ReactNode> = {
  facebook: (
    <path d="M14 21v-7.6h2.6l.4-3h-3V8.5c0-.87.24-1.46 1.5-1.46H17V4.35A20 20 0 0 0 14.66 4.2c-2.32 0-3.9 1.42-3.9 4.02v2.24H8.2v3h2.56V21z" />
  ),
  instagram: (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7.5 2.6h9a4.9 4.9 0 0 1 4.9 4.9v9a4.9 4.9 0 0 1-4.9 4.9h-9a4.9 4.9 0 0 1-4.9-4.9v-9a4.9 4.9 0 0 1 4.9-4.9m0 1.8a3.1 3.1 0 0 0-3.1 3.1v9a3.1 3.1 0 0 0 3.1 3.1h9a3.1 3.1 0 0 0 3.1-3.1v-9a3.1 3.1 0 0 0-3.1-3.1zM12 7.3a4.7 4.7 0 1 1 0 9.4 4.7 4.7 0 0 1 0-9.4m0 1.8a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8m5.2-2.5a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2"
    />
  ),
  tiktok: (
    <path d="M16.6 2h-3.1v13.2a2.65 2.65 0 1 1-2.65-2.65c.16 0 .32.02.47.05V9.44a5.9 5.9 0 0 0-.47-.02 5.79 5.79 0 1 0 5.79 5.79V8.9a7.2 7.2 0 0 0 4.2 1.35V7.14A4.15 4.15 0 0 1 16.6 2" />
  ),
  youtube: (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M21.6 7.4a2.8 2.8 0 0 0-2-2C17.9 5 12 5 12 5s-5.9 0-7.6.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .4 4.6 2.8 2.8 0 0 0 2 2C6.1 19 12 19 12 19s5.9 0 7.6-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22 12a29 29 0 0 0-.4-4.6M10.1 15.1V8.9l5.2 3.1z"
    />
  ),
};

export function PlatformIcon({
  platform,
  className,
}: {
  platform: Platform;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={cn("size-3.5 shrink-0", className)}
    >
      {PLATFORM_PATHS[platform]}
    </svg>
  );
}

/**
 * Category marks. Generic lucide glyphs rather than photographs, so a category
 * reads as a thing to click rather than as a picture of one creator who
 * happens to be filed under it.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  travel: Plane,
  food: UtensilsCrossed,
  beauty: Sparkles,
  fashion: Shirt,
  fitness: Dumbbell,
  lifestyle: Sun,
  sports: Trophy,
  tech: Cpu,
  comedy: Laugh,
  education: GraduationCap,
  parenting: Baby,
  automotive: Car,
};

export function CategoryIcon({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  // Sparkles is the fallback rather than a question mark: a category with no
  // dedicated glyph is not an error, it just has not earned one yet.
  const Icon = CATEGORY_ICONS[slug] ?? Sparkles;
  return <Icon className={cn("size-5 shrink-0", className)} aria-hidden strokeWidth={1.5} />;
}
