import Link from "next/link";
import { listShortlists } from "@/lib/db/shortlists";
import { CreateShortlistDialog } from "@/components/shortlist/create-shortlist-dialog";
import { EmptyState, SectionHeading } from "@/components/ui-bits";
import { formatDate, formatNumber } from "@/lib/format";

export const metadata = { title: "Shortlists — Grid" };

export default async function ShortlistsPage() {
  const shortlists = await listShortlists();

  return (
    <div className="mx-auto max-w-[80rem] px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-xl">Shortlists</h1>
        <CreateShortlistDialog />
      </div>

      <div className="mt-8 space-y-4">
        <SectionHeading>
          {formatNumber(shortlists.length)} shortlist{shortlists.length === 1 ? "" : "s"}
        </SectionHeading>

        {shortlists.length === 0 ? (
          <EmptyState>
            No shortlists yet. A shortlist is how a client brief becomes something you can
            send: a named set of creators, each with a pitch note.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-hairline border-b border-hairline">
            {shortlists.map((shortlist) => (
              <li key={shortlist.id}>
                <Link
                  href={`/shortlists/${shortlist.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4 hover:bg-muted/40"
                >
                  <span className="min-w-0">
                    <span className="block text-base">{shortlist.name}</span>
                    {shortlist.clientName ? (
                      <span className="block text-sm text-ink-muted">
                        {shortlist.clientName}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-6 text-sm text-ink-muted">
                    <span className="numeral">
                      {formatNumber(shortlist.creatorCount)} creator
                      {shortlist.creatorCount === 1 ? "" : "s"}
                    </span>
                    <span>{formatDate(shortlist.createdAt)}</span>
                    {shortlist.shareToken ? (
                      <span className="rounded-full border border-hairline px-2 py-0.5 text-xs">
                        Shared
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
