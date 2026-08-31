import Link from "next/link";
import { notFound } from "next/navigation";
import { getShortlist } from "@/lib/db/shortlists";
import { ShortlistEditor } from "@/components/shortlist/shortlist-editor";
import { ShareControls } from "@/components/shortlist/share-controls";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionHeading } from "@/components/ui-bits";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shortlist = await getShortlist(id);
  return { title: shortlist ? `${shortlist.name} — Talent Grid` : "Shortlist — Talent Grid" };
}

export default async function ShortlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shortlist = await getShortlist(id);
  if (!shortlist) notFound();

  const compareSlugs = shortlist.items.slice(0, 4).map((item) => item.slug);

  return (
    <div className="mx-auto max-w-[80rem] px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/shortlists" className="text-sm text-ink-muted hover:text-ink">
            Shortlists
          </Link>
          <h1 className="mt-1 font-display text-xl">{shortlist.name}</h1>
          {shortlist.clientName ? (
            <p className="text-sm text-ink-muted">{shortlist.clientName}</p>
          ) : null}
          {shortlist.briefNotes ? (
            <p className="mt-3 max-w-prose text-sm text-ink-muted">{shortlist.briefNotes}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <a href={`/api/shortlists/${shortlist.id}/pdf`}>Export PDF</a>
          </Button>
          {compareSlugs.length >= 2 ? (
            <Button asChild variant="outline">
              <Link href={`/compare?ids=${compareSlugs.join(",")}`}>
                Open {compareSlugs.length} in compare
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-10 space-y-4">
        <SectionHeading>Creators</SectionHeading>
        {shortlist.items.length === 0 ? (
          <EmptyState
            action={
              <Button asChild size="sm">
                <Link href="/creators">Browse creators</Link>
              </Button>
            }
          >
            This shortlist is empty. Add creators from browse or from a creator page.
          </EmptyState>
        ) : (
          <ShortlistEditor shortlistId={shortlist.id} items={shortlist.items} />
        )}
      </div>

      <div className="mt-12 space-y-4">
        <SectionHeading>Share with the client</SectionHeading>
        <ShareControls
          shortlistId={shortlist.id}
          shareToken={shortlist.shareToken}
          shareExpiresAt={shortlist.shareExpiresAt}
          includeRates={shortlist.includeRatesInShare}
        />
      </div>
    </div>
  );
}
