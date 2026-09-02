"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export function Muted({ children }: { children: ReactNode }) {
  return <span className="text-ink-muted">{children}</span>;
}

/** Click to edit, Enter to save, Escape to abandon. */
export function InlineText({
  value,
  onSave,
  render,
  placeholder,
}: {
  value: string;
  onSave: (value: string) => void;
  render: (value: string) => ReactNode;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <span className="group/inline flex items-center gap-2">
        {render(value)}
        <button
          type="button"
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
          aria-label="Edit"
          className="text-xs text-ink-muted opacity-0 transition-opacity group-hover/inline:opacity-100 focus-visible:opacity-100"
        >
          Edit
        </button>
      </span>
    );
  }

  return (
    <Input
      autoFocus
      value={draft}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        setEditing(false);
        if (draft !== value) onSave(draft.trim());
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          setEditing(false);
          if (draft !== value) onSave(draft.trim());
        }
        if (event.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className="h-8 w-full"
    />
  );
}
