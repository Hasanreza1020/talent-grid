import Link from "next/link";
import { listDirectory } from "@/lib/db/creators";
import { listCategories } from "@/lib/db/categories";
import { CreatorGrid } from "@/components/admin/creator-grid";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Creator management — Grid" };

export default async function AdminCreatorsPage() {
  const [rows, categories] = await Promise.all([
    listDirectory({ includeArchived: true }),
    listCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-ink-muted">
          Edit simple fields in place. Anything structural opens the full form.
        </p>
        <Button asChild>
          <Link href="/admin/creators/new">Add a creator</Link>
        </Button>
      </div>

      <CreatorGrid
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        rows={rows.map((row) => ({
          id: row.id,
          slug: row.slug,
          displayName: row.displayName,
          handle: row.primaryHandle,
          city: row.city,
          category: row.primaryCategoryName,
          tier: row.tier,
          followers: row.primaryFollowers,
          accountCount: row.accountCount,
          status: row.status,
          dataConfidence: row.dataConfidence,
          hasPortrait: row.portraitUrl !== null,
          lastCaptured: row.primaryCapturedOn,
          updatedAt: row.updatedAt,
          archived: row.deletedAt !== null,
        }))}
      />
    </div>
  );
}
