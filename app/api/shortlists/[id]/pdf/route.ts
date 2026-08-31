import { renderToBuffer } from "@react-pdf/renderer";
import { getShortlist } from "@/lib/db/shortlists";
import { getCompareData } from "@/lib/db/compare";
import { getCurrentUser, isEditor } from "@/lib/db/user";
import { ShortlistPdf, type ShortlistPdfCreator } from "@/components/pdf/shortlist-pdf";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Not signed in.", { status: 401 });

  const { id } = await params;
  const shortlist = await getShortlist(id);
  if (!shortlist) return new Response("Shortlist not found.", { status: 404 });

  const data = await getCompareData(shortlist.items.map((item) => item.slug));
  const bySlug = new Map(data.map((creator) => [creator.slug, creator]));

  // Rates go in only when the person exporting is allowed to see them and the
  // shortlist is set to share them.
  const includeRates = isEditor(user) && shortlist.includeRatesInShare;

  const creators: ShortlistPdfCreator[] = shortlist.items.map((item) => {
    const creator = bySlug.get(item.slug);
    return {
      displayName: item.displayName,
      portraitUrl: item.portraitUrl,
      primaryHandle: item.primaryHandle,
      primaryPlatform: creator?.primaryPlatform ?? null,
      city: creator?.city ?? null,
      tier: creator?.tier ?? null,
      categories: creator?.categories.map((category) => category.name) ?? [],
      pitchNote: item.pitchNote,
      accounts:
        creator?.accounts.map((account) => ({
          platform: account.platform,
          followers: account.latest?.followers ?? null,
          engagementRate: account.latest?.engagementRate ?? null,
        })) ?? [],
      rates: includeRates
        ? (creator?.rates.map((rate) => ({
            deliverable: rate.deliverable,
            priceBdt: rate.priceBdt,
            negotiable: rate.negotiable,
          })) ?? [])
        : null,
    };
  });

  const buffer = await renderToBuffer(
    ShortlistPdf({
      name: shortlist.name,
      clientName: shortlist.clientName,
      briefNotes: shortlist.briefNotes,
      creators,
      includeRates,
      generatedOn: new Date().toISOString(),
    }),
  );

  const filename = shortlist.name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase() || "shortlist";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
    },
  });
}
