"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { archiveCreator } from "@/app/(app)/admin/actions";

/**
 * Archiving sets deleted_at. Nothing in the product hard-deletes a creator,
 * because the collaboration history and audit trail hanging off them stay
 * meaningful long after the agency stops working with someone.
 */
export function ArchiveCreator({
  creatorId,
  creatorName,
}: {
  creatorId: string;
  creatorName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <div className="max-w-prose space-y-3">
        <p className="text-sm text-ink-muted">
          Archiving hides this creator from browse and search. The record, its history and
          its past campaigns are kept, and an admin can restore it.
        </p>
        <Button variant="outline" onClick={() => setConfirming(true)}>
          Archive this creator
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-prose space-y-3 border border-hairline bg-surface p-4">
      <p className="text-sm">
        Type <span className="font-medium">{creatorName}</span> to confirm.
      </p>
      <Input
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        aria-label="Type the creator name to confirm"
      />
      <div className="flex items-center gap-2">
        <Button
          variant="destructive"
          disabled={typed !== creatorName || pending}
          onClick={() => startTransition(() => archiveCreator(creatorId))}
        >
          {pending ? "Archiving" : "Archive"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setConfirming(false);
            setTyped("");
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
