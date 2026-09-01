"use client";

import { useState } from "react";
import { AgeBracketChart } from "@/components/charts";
import { EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import type { AudienceProfile } from "@/lib/types";

export function AudienceBlock({
  accounts,
}: {
  accounts: { id: string; label: string; profile: AudienceProfile | null }[];
}) {
  const withProfiles = accounts.filter((account) => account.profile !== null);
  const [selected, setSelected] = useState(withProfiles[0]?.id ?? null);

  if (withProfiles.length === 0) {
    return (
      <EmptyState>
        No audience data has been recorded for this creator. Age, gender and city splits
        come from a media kit or the platform&rsquo;s own analytics.
      </EmptyState>
    );
  }

  const account = withProfiles.find((entry) => entry.id === selected) ?? withProfiles[0];
  const profile = account.profile!;

  const ageData = Object.entries(profile.ageBrackets ?? {}).map(([bracket, percent]) => ({
    bracket,
    percent: Number(percent),
  }));
  const genderEntries = Object.entries(profile.genderSplit ?? {});

  return (
    <div className="space-y-6">
      {withProfiles.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {withProfiles.map((entry) => (
            <Button
              key={entry.id}
              size="sm"
              variant={entry.id === account.id ? "secondary" : "ghost"}
              onClick={() => setSelected(entry.id)}
            >
              {entry.label}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h3 className="text-sm text-ink-muted">Age brackets</h3>
          {ageData.length ? (
            <AgeBracketChart data={ageData} />
          ) : (
            <p className="pt-3 text-sm text-ink-muted">No age breakdown recorded.</p>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm text-ink-muted">Gender split</h3>
            {genderEntries.length ? (
              <dl className="mt-2 space-y-1 text-sm">
                {genderEntries.map(([gender, percent]) => (
                  <div key={gender} className="flex justify-between gap-4">
                    <dt className="capitalize">{gender}</dt>
                    <dd className="numeral">{Number(percent)}%</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">No gender split recorded.</p>
            )}
          </div>

          <div>
            <h3 className="text-sm text-ink-muted">Top cities</h3>
            {profile.topCities?.length ? (
              <dl className="mt-2 space-y-1 text-sm">
                {profile.topCities.map((entry) => (
                  <div key={entry.city} className="flex justify-between gap-4">
                    <dt>{entry.city}</dt>
                    <dd className="numeral">{entry.percent}%</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">No city breakdown recorded.</p>
            )}
          </div>

          <p className="text-xs text-ink-muted">
            Captured {formatDate(profile.capturedOn)}
          </p>
        </div>
      </div>
    </div>
  );
}
