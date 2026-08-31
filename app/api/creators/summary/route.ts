import { NextResponse } from "next/server";
import { getDirectoryRowsBySlugs } from "@/lib/db/creators";
import { getCurrentUser } from "@/lib/db/user";

/**
 * Small creator summaries for the compare tray, which needs a portrait and a
 * name for whatever is selected on every page of the product. Reads through
 * the same RLS-bound query layer as everything else.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ creators: [] }, { status: 401 });

  const slugs = (new URL(request.url).searchParams.get("slugs") ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean)
    .slice(0, 8);

  if (slugs.length === 0) return NextResponse.json({ creators: [] });

  const rows = await getDirectoryRowsBySlugs(slugs);

  return NextResponse.json({
    creators: rows.map((row) => ({
      slug: row.slug,
      displayName: row.displayName,
      portraitUrl: row.portraitUrl,
      primaryHandle: row.primaryHandle,
    })),
  });
}
