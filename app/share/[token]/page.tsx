import Image from "next/image";
import { getSharedShortlist } from "@/lib/db/shortlists";
import { formatCompact, formatBdt, formatDate, formatPercent, initialsOf, NO_DATA } from "@/lib/format";
import { DELIVERABLE_LABEL, PLATFORM_LABEL, TIER_LABEL } from "@/lib/types";
import type { Deliverable, Platform, Tier } from "@/lib/types";

export const metadata = { title: "Creator shortlist" };

/**
 * The single public surface.
 *
 * Everything on this page comes from one SECURITY DEFINER function, which
 * returns only what a client is allowed to see. Internal notes, contacts and
 * the agency score are not withheld by this component: they are never in the
 * payload at all.
 */
export default async function SharedShortlistPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getSharedShortlist(token);

  if (result.status === "expired") {
    return (
      <Centered title="This link has expired">
        <p>
          It stopped working on {formatDate(result.expiredAt ?? null)}. Ask the person who
          sent it for a fresh link.
        </p>
      </Centered>
    );
  }

  if (result.status !== "ok" || !result.shortlist) {
    return (
      <Centered title="Link not found">
        <p>
          This shortlist link is not recognised. It may have been revoked, or the address
          may have been mistyped.
        </p>
      </Centered>
    );
  }

  const { shortlist, creators = [] } = result;

  return (
    <main className="mx-auto max-w-[70rem] px-6 py-16">
      <header className="border-b border-hairline pb-8">
        <h1 className="font-display text-2xl leading-tight">{shortlist.name}</h1>
        {shortlist.clientName ? (
          <p className="mt-2 text-base text-ink-muted">Prepared for {shortlist.clientName}</p>
        ) : null}
        {shortlist.briefNotes ? (
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink-muted">
            {shortlist.briefNotes}
          </p>
        ) : null}
      </header>

      {creators.length === 0 ? (
        <p className="py-16 text-sm text-ink-muted">
          There are no creators on this shortlist yet.
        </p>
      ) : (
        <ol className="mt-12 space-y-16">
          {creators.map((creator) => {
            const primary =
              creator.accounts.find((account) => account.isPrimary) ?? creator.accounts[0];

            return (
              <li
                key={creator.slug}
                className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,240px)_1fr]"
              >
                <div className="aspect-[4/5] w-full overflow-hidden rounded-xl bg-stone">
                  {creator.portraitUrl ? (
                    <Image
                      src={creator.portraitUrl}
                      alt={creator.displayName}
                      width={240}
                      height={300}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center font-display text-2xl text-ink/45">
                      {initialsOf(creator.displayName)}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="font-display text-xl leading-tight">
                    {creator.displayName}
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    {primary?.handle ? `@${primary.handle}` : "Handle available on request"}
                    {primary ? ` on ${PLATFORM_LABEL[primary.platform as Platform]}` : ""}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {creator.categories.map((category) => (
                      <span
                        key={category}
                        className="rounded-full border border-hairline px-2 py-0.5 text-xs"
                      >
                        {category}
                      </span>
                    ))}
                    {creator.tier ? (
                      <span className="rounded-full border border-hairline px-2 py-0.5 text-xs">
                        {TIER_LABEL[creator.tier as Tier]}
                      </span>
                    ) : null}
                    {creator.city ? (
                      <span className="rounded-full border border-hairline px-2 py-0.5 text-xs">
                        {creator.city}
                      </span>
                    ) : null}
                  </div>

                  {creator.bioShort ? (
                    <p className="mt-4 max-w-prose text-sm leading-relaxed">
                      {creator.bioShort}
                    </p>
                  ) : null}

                  {creator.pitchNote ? (
                    <p className="mt-4 max-w-prose border-l-2 border-brand pl-4 text-sm leading-relaxed">
                      {creator.pitchNote}
                    </p>
                  ) : null}

                  <table className="mt-6 w-full max-w-[34rem] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-hairline text-left text-xs text-ink-muted">
                        <th scope="col" className="py-2 pr-4 font-normal">Platform</th>
                        <th scope="col" className="py-2 pr-4 text-right font-normal">Followers</th>
                        <th scope="col" className="py-2 text-right font-normal">Engagement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creator.accounts.map((account) => (
                        <tr key={account.platform} className="border-b border-hairline">
                          <td className="py-2 pr-4">
                            {PLATFORM_LABEL[account.platform as Platform]}
                          </td>
                          <td className="numeral py-2 pr-4 text-right">
                            {formatCompact(account.followers)}
                          </td>
                          <td className="numeral py-2 text-right">
                            {account.engagementRate === null ? (
                              <span className="text-ink-muted">{NO_DATA}</span>
                            ) : (
                              formatPercent(Number(account.engagementRate))
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {creator.rates && creator.rates.length > 0 ? (
                    <div className="mt-6">
                      <h3 className="text-sm text-ink-muted">Rates</h3>
                      <ul className="mt-2 space-y-1 text-sm">
                        {creator.rates.map((rate, index) => (
                          <li key={index} className="flex max-w-[34rem] justify-between gap-4">
                            <span>{DELIVERABLE_LABEL[rate.deliverable as Deliverable]}</span>
                            <span className="numeral">
                              {formatBdt(rate.priceBdt)}
                              {rate.negotiable ? (
                                <span className="ml-2 text-xs text-ink-muted">negotiable</span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <footer className="mt-20 border-t border-hairline pt-6 text-xs text-ink-muted">
        {shortlist.expiresAt
          ? `This page is available until ${formatDate(shortlist.expiresAt)}.`
          : null}
      </footer>
    </main>
  );
}

function Centered({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[32rem] flex-col justify-center px-6 text-center">
      <h1 className="font-display text-xl">{title}</h1>
      <div className="mt-3 text-sm text-ink-muted">{children}</div>
    </main>
  );
}
