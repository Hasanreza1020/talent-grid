"use client";

import { CompareProvider } from "@/components/compare/compare-context";

/**
 * Client state shared across the product shell. Only the compare selection
 * lives here now: the tray caches its own fetches, so there is no query client
 * to hold.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return <CompareProvider>{children}</CompareProvider>;
}
