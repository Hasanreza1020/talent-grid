"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** The hero's single call to action: search, which lands on browse. */
export function HomeSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const query = value.trim();
        router.push(query ? `/creators?q=${encodeURIComponent(query)}` : "/creators");
      }}
      className="flex items-center gap-2"
    >
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search a name or handle"
          aria-label="Search creators by name or handle"
          className="h-11 bg-surface pl-9"
        />
      </div>
      <Button type="submit" className="h-11">
        Search
      </Button>
    </form>
  );
}
