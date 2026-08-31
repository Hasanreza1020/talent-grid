import { renderToBuffer } from "@react-pdf/renderer";
import { getCompareData } from "@/lib/db/compare";
import { listDirectory } from "@/lib/db/creators";
import { getCurrentUser } from "@/lib/db/user";
import { computeDirectoryMetrics } from "@/lib/metrics/directory";
import { buildComparison, summariseComparison } from "@/lib/compare";
import { ComparePdf } from "@/components/pdf/compare-pdf";
import {
  DELIVERABLE_LABEL,
  PLATFORM_LABEL,
  type Deliverable,
  type Platform,
} from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Not signed in.", { status: 401 });

  const url = new URL(request.url);
  const slugs = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (slugs.length < 2) {
    return new Response("Pick at least two creators to compare.", { status: 400 });
  }

  const platform = url.searchParams.get("platform") as Platform | null;
  const deliverable = url.searchParams.get("deliverable") as Deliverable | null;
  const normalised = url.searchParams.get("normalised") !== "false";

  const [creators, allRows] = await Promise.all([getCompareData(slugs), listDirectory()]);
  if (creators.length < 2) return new Response("Creators not found.", { status: 404 });

  const metrics = computeDirectoryMetrics(allRows);
  const groups = buildComparison(creators, metrics, { platform, deliverable, normalised });
  const summary = summariseComparison(creators, groups);

  // The export states the options it was produced under, so a printed sheet is
  // never ambiguous about what it is showing.
  const context = [
    platform ? `${PLATFORM_LABEL[platform]} only` : "Each creator's primary platform",
    deliverable ? `priced on ${DELIVERABLE_LABEL[deliverable].toLowerCase()}` : "no deliverable selected",
    normalised ? "percentiles within peer group" : "absolute values",
  ].join(", ");

  const buffer = await renderToBuffer(
    ComparePdf({
      creators: creators.map((creator) => ({
        id: creator.id,
        displayName: creator.displayName,
        portraitUrl: creator.portraitUrl,
      })),
      groups,
      summary,
      context,
      generatedOn: new Date().toISOString(),
    }),
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="comparison.pdf"`,
    },
  });
}
