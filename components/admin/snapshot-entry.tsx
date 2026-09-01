"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui-bits";
import { addSnapshot } from "@/app/admin/actions";
import { formatDate } from "@/lib/format";
import { SNAPSHOT_SOURCES } from "@/lib/types";

const SOURCE_LABEL: Record<string, string> = {
  manual: "Read manually",
  media_kit: "From a media kit",
  api: "From an API",
  legacy_import: "Legacy import",
};

/**
 * Records a new dated snapshot. There is deliberately no way to edit an
 * existing one from here: a new follower count is always a new row, because
 * every growth and trend figure is computed from that history.
 */
export function SnapshotEntry({
  creatorId,
  accounts,
}: {
  creatorId: string;
  accounts: { id: string; label: string; lastCaptured: string | null }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [source, setSource] = useState<string>("manual");

  if (accounts.length === 0) {
    return (
      <EmptyState>
        Add a platform account first. A snapshot has to attach to one.
      </EmptyState>
    );
  }

  const selected = accounts.find((account) => account.id === accountId);

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await addSnapshot(creatorId, {
            accountId,
            capturedOn: formData.get("capturedOn"),
            followers: formData.get("followers"),
            avgViews: formData.get("avgViews"),
            avgLikes: formData.get("avgLikes"),
            avgComments: formData.get("avgComments"),
            avgShares: formData.get("avgShares"),
            postsLast30d: formData.get("postsLast30d"),
            source,
          });
          if (result.error) toast.error(result.error);
          else {
            toast.success("Snapshot recorded.");
            router.refresh();
          }
        })
      }
      className="max-w-3xl space-y-5"
    >
      <p className="text-sm text-ink-muted">
        Leave a field blank if you did not read that figure. A blank stays null and shows
        as no data; it is not recorded as zero.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Account</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="w-full bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected?.lastCaptured ? (
            <p className="text-xs text-ink-muted">
              Last read {formatDate(selected.lastCaptured)}
            </p>
          ) : (
            <p className="text-xs text-ink-muted">Nothing recorded yet.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="capturedOn">Date read</Label>
          <Input
            id="capturedOn"
            name="capturedOn"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>

        <NumberField name="followers" label="Followers" />
        <NumberField name="avgViews" label="Average views" />
        <NumberField name="avgLikes" label="Average likes" />
        <NumberField name="avgComments" label="Average comments" />
        <NumberField name="avgShares" label="Average shares" />
        <NumberField name="postsLast30d" label="Posts in last 30 days" />

        <div className="space-y-1.5">
          <Label>Where the figures came from</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-full bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SNAPSHOT_SOURCES.map((entry) => (
                <SelectItem key={entry} value={entry}>
                  {SOURCE_LABEL[entry]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Recording" : "Record snapshot"}
      </Button>
    </form>
  );
}

function NumberField({ name, label }: { name: string; label: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="number" min={0} placeholder="Leave blank if unknown" />
    </div>
  );
}
