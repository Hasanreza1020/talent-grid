"use client";

import { Button } from "@/components/ui/button";
import { useCompare } from "./compare-context";

export function CompareToggleButton({
  slug,
  displayName,
}: {
  slug: string;
  displayName: string;
}) {
  const { isSelected, toggle } = useCompare();
  const selected = isSelected(slug);

  return (
    <Button variant="outline" onClick={() => toggle(slug, displayName)}>
      {selected ? "Remove from compare" : "Add to compare"}
    </Button>
  );
}
