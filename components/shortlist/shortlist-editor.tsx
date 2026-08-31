"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { initialsOf } from "@/lib/format";
import {
  removeFromShortlist,
  reorderShortlist,
  setPitchNote,
} from "@/app/(app)/shortlists/actions";
import type { ShortlistItem } from "@/lib/db/shortlists";

/**
 * Reordering uses explicit move buttons rather than drag and drop: it is
 * keyboard accessible without extra work, and the spec rules out adding a
 * drag-and-drop library.
 */
export function ShortlistEditor({
  shortlistId,
  items: initialItems,
}: {
  shortlistId: string;
  items: ShortlistItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    startTransition(async () => {
      await reorderShortlist(
        shortlistId,
        next.map((item) => item.creatorId),
      );
      router.refresh();
    });
  };

  return (
    <ol className="divide-y divide-hairline border-y border-hairline">
      {items.map((item, index) => (
        <li key={item.creatorId} className="flex items-start gap-4 py-4">
          <span className="numeral w-6 pt-1 text-sm text-ink-muted">{index + 1}</span>

          <Link href={`/creators/${item.slug}`} className="shrink-0">
            <span className="block size-16 overflow-hidden rounded-lg bg-stone">
              {item.portraitUrl ? (
                <Image
                  src={item.portraitUrl}
                  alt={item.displayName}
                  width={64}
                  height={80}
                  className="size-full object-cover grayscale"
                />
              ) : (
                <span className="flex size-full items-center justify-center font-display text-sm text-ink/45">
                  {initialsOf(item.displayName)}
                </span>
              )}
            </span>
          </Link>

          <div className="min-w-0 flex-1">
            <Link href={`/creators/${item.slug}`} className="text-base hover:underline">
              {item.displayName}
            </Link>
            <p className="text-sm text-ink-muted">
              {item.primaryHandle ? `@${item.primaryHandle}` : "No handle on file"}
            </p>
            <Textarea
              defaultValue={item.pitchNote ?? ""}
              placeholder="Why this creator, for this client"
              rows={2}
              className="mt-2 bg-surface"
              onBlur={(event) =>
                startTransition(async () => {
                  await setPitchNote(shortlistId, item.creatorId, event.target.value);
                })
              }
            />
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Move ${item.displayName} up`}
              disabled={index === 0 || pending}
              onClick={() => move(index, -1)}
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Move ${item.displayName} down`}
              disabled={index === items.length - 1 || pending}
              onClick={() => move(index, 1)}
            >
              <ArrowDown className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${item.displayName}`}
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setItems((current) =>
                    current.filter((entry) => entry.creatorId !== item.creatorId),
                  );
                  await removeFromShortlist(shortlistId, item.creatorId);
                  router.refresh();
                })
              }
            >
              <X className="size-4" />
            </Button>
          </div>
        </li>
      ))}
    </ol>
  );
}
