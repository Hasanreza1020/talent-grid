"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addCreatorsToShortlist } from "@/app/(app)/shortlists/actions";

export function AddToShortlist({
  creatorId,
  creatorName,
  creatorIds,
  shortlists,
  label = "Add to shortlist",
}: {
  creatorId?: string;
  creatorName?: string;
  /** Used by compare, which adds everything currently selected. */
  creatorIds?: string[];
  shortlists: { id: string; name: string; clientName: string | null }[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const ids = creatorIds ?? (creatorId ? [creatorId] : []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{label}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to a shortlist</DialogTitle>
          <DialogDescription>
            {creatorName
              ? `Add ${creatorName} to one of your shortlists.`
              : `Add ${ids.length} creator${ids.length === 1 ? "" : "s"} to one of your shortlists.`}
          </DialogDescription>
        </DialogHeader>

        {shortlists.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-muted">
              You have no shortlists yet. Create one first.
            </p>
            <Button onClick={() => router.push("/shortlists")}>Go to shortlists</Button>
          </div>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {shortlists.map((shortlist) => (
              <li key={shortlist.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await addCreatorsToShortlist(shortlist.id, ids);
                      if (result.error) toast.error(result.error);
                      else {
                        toast.success(`Added to ${shortlist.name}.`);
                        setOpen(false);
                        router.refresh();
                      }
                    })
                  }
                  className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-60"
                >
                  {shortlist.name}
                  {shortlist.clientName ? (
                    <span className="block text-xs text-ink-muted">
                      {shortlist.clientName}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
