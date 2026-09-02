import { listCategories, listTags } from "@/lib/db/categories";
import { createClient } from "@/lib/supabase/server";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";

export const metadata = { title: "Categories and tags — Grid" };

export default async function TaxonomyPage() {
  const supabase = await createClient();
  const [categories, tags, links] = await Promise.all([
    listCategories(),
    listTags(),
    supabase.from("creator_categories").select("category_id"),
  ]);

  const counts = new Map<string, number>();
  for (const link of links.data ?? []) {
    counts.set(link.category_id, (counts.get(link.category_id) ?? 0) + 1);
  }

  const byId = new Map(categories.map((category) => [category.id, category]));

  return (
    <TaxonomyManager
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        parentName: category.parentId ? (byId.get(category.parentId)?.name ?? null) : null,
        parentId: category.parentId,
        creatorCount: counts.get(category.id) ?? 0,
      }))}
      tags={tags}
    />
  );
}
