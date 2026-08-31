"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FollowerTrend } from "@/components/charts";
import { formatCompact, formatDate, formatPercent, NO_DATA } from "@/lib/format";
import type { Platform } from "@/lib/types";

export type PlatformTabData = {
  id: string;
  platform: Platform;
  platformLabel: string;
  handle: string | null;
  profileUrl: string;
  followers: number | null;
  engagementRate: number | null;
  avgViews: number | null;
  postsLast30d: number | null;
  capturedOn: string | null;
  history: { capturedOn: string; followers: number }[];
};

export function PlatformTabs({ accounts }: { accounts: PlatformTabData[] }) {
  return (
    <Tabs defaultValue={accounts[0]?.id}>
      <TabsList>
        {accounts.map((account) => (
          <TabsTrigger key={account.id} value={account.id}>
            {account.platformLabel}
          </TabsTrigger>
        ))}
      </TabsList>

      {accounts.map((account) => (
        <TabsContent key={account.id} value={account.id} className="pt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <a
              href={account.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm underline underline-offset-4"
            >
              {account.handle ? `@${account.handle}` : "Open the recorded link"}
            </a>
            {account.capturedOn ? (
              <p className="text-xs text-ink-muted">
                Last updated {formatDate(account.capturedOn)}
              </p>
            ) : null}
          </div>

          {!account.handle ? (
            <p className="mt-2 text-xs text-ink-muted">
              The source held a post link rather than a profile link, so no handle is on
              file for this account.
            </p>
          ) : null}

          <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
            <Metric label="Followers" value={formatCompact(account.followers)} />
            <Metric label="Engagement rate" value={formatPercent(account.engagementRate)} />
            <Metric label="Average views" value={formatCompact(account.avgViews)} />
            <Metric
              label="Posts in last 30 days"
              value={account.postsLast30d === null ? NO_DATA : String(account.postsLast30d)}
            />
          </dl>

          <div className="mt-8">
            {account.history.length >= 2 ? (
              <FollowerTrend data={account.history} />
            ) : account.history.length === 1 ? (
              <div className="border border-dashed border-hairline px-4 py-6 text-center">
                <p className="numeral text-xl">{formatCompact(account.history[0].followers)}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Trend available after the next update
                </p>
              </div>
            ) : (
              <div className="border border-dashed border-hairline px-4 py-6 text-center">
                <p className="text-sm text-ink-muted">
                  No follower snapshots recorded for this account.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={value === NO_DATA ? "text-sm text-ink-muted" : "numeral text-lg"}>
        {value}
      </dd>
    </div>
  );
}
