"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/format";
import { createShareLink, revokeShareLink } from "@/app/(app)/shortlists/actions";

export function ShareControls({
  shortlistId,
  shareToken,
  shareExpiresAt,
  includeRates,
}: {
  shortlistId: string;
  shareToken: string | null;
  shareExpiresAt: string | null;
  includeRates: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [rates, setRates] = useState(includeRates);
  const [days, setDays] = useState(14);
  const router = useRouter();

  const shareUrl =
    shareToken && typeof window !== "undefined"
      ? `${window.location.origin}/share/${shareToken}`
      : shareToken
        ? `/share/${shareToken}`
        : null;

  const expired = shareExpiresAt !== null && new Date(shareExpiresAt) < new Date();

  return (
    <div className="space-y-5">
      <p className="max-w-prose text-sm text-ink-muted">
        A share link opens without a login and shows portraits, names, handles, follower
        counts, engagement rates and your pitch notes. It never shows internal notes,
        contact details or the agency score. Rates are included only if you switch them on.
      </p>

      {shareToken ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input readOnly value={shareUrl ?? ""} className="max-w-[28rem] bg-muted" />
            <Button
              variant="outline"
              onClick={() => {
                if (shareUrl) navigator.clipboard.writeText(shareUrl);
                toast.success("Share link copied.");
              }}
            >
              <Copy className="mr-2 size-4" />
              Copy
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await revokeShareLink(shortlistId);
                  toast.success("Share link revoked.");
                  router.refresh();
                })
              }
            >
              Revoke
            </Button>
          </div>
          <p className="text-sm text-ink-muted">
            {expired
              ? `This link expired on ${formatDate(shareExpiresAt)} and now shows an expiry page.`
              : `Expires ${formatDate(shareExpiresAt)}.`}{" "}
            Rates are {includeRates ? "included" : "hidden"}.
          </p>
        </div>
      ) : null}

      <form
        action={(formData) =>
          startTransition(async () => {
            await createShareLink(shortlistId, formData);
            toast.success(shareToken ? "New share link created." : "Share link created.");
            router.refresh();
          })
        }
        className="flex flex-wrap items-end gap-4 border-t border-hairline pt-5"
      >
        <div className="space-y-1.5">
          <Label htmlFor="expiresInDays" className="text-xs text-ink-muted">
            Expires in days
          </Label>
          <Input
            id="expiresInDays"
            name="expiresInDays"
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="w-28 bg-surface"
          />
        </div>

        <div className="flex items-center gap-3 pb-2">
          <Switch
            id="includeRates"
            name="includeRates"
            checked={rates}
            onCheckedChange={setRates}
          />
          <Label htmlFor="includeRates" className="cursor-pointer text-sm font-normal">
            Include rates
          </Label>
        </div>

        <Button type="submit" disabled={pending} className="mb-0.5">
          {shareToken ? "Replace link" : "Create share link"}
        </Button>
      </form>
    </div>
  );
}
