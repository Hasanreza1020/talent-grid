"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CompareProvider } from "@/components/compare/compare-context";

export function AppProviders({ children }: { children: React.ReactNode }) {
  // One client per browser session. The compare tray is the main consumer:
  // it needs creator summaries for whatever is selected, on every page, and
  // caching those is the difference between a tray that flickers and one that
  // does not.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CompareProvider>{children}</CompareProvider>
    </QueryClientProvider>
  );
}
