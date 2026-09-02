import { cn } from "@/lib/utils";

/**
 * A placeholder for something being read from the database.
 *
 * It is deliberately quiet: this product's surfaces are mostly white, and a
 * grid of strongly animated blocks reads as an error rather than as a wait.
 * The shape matters more than the shimmer, so callers size these to the thing
 * that is arriving and the layout does not move when it does.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
