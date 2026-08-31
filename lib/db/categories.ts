import { createClient } from "@/lib/supabase/server";

export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string | null;
  coverUrl: string | null;
};

export type CategoryTree = Category & { children: Category[]; creatorCount: number };

export async function listCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id, description, cover_url")
    .order("name");

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parent_id,
    description: row.description,
    coverUrl: row.cover_url,
  }));
}

/**
 * Parent categories with their children and a live creator count. The count
 * includes creators filed under any child, because a client asking for
 * "travel" means the whole tree.
 */
export async function listCategoryTree(): Promise<CategoryTree[]> {
  const supabase = await createClient();
  const [categories, links] = await Promise.all([
    listCategories(),
    supabase.from("creator_categories").select("category_id, creator_id"),
  ]);

  const creatorsByCategory = new Map<string, Set<string>>();
  for (const link of links.data ?? []) {
    const bucket = creatorsByCategory.get(link.category_id) ?? new Set<string>();
    bucket.add(link.creator_id);
    creatorsByCategory.set(link.category_id, bucket);
  }

  const parents = categories.filter((category) => category.parentId === null);

  return parents.map((parent) => {
    const children = categories.filter((category) => category.parentId === parent.id);
    const creators = new Set<string>(creatorsByCategory.get(parent.id) ?? []);
    for (const child of children) {
      for (const creatorId of creatorsByCategory.get(child.id) ?? []) creators.add(creatorId);
    }
    return { ...parent, children, creatorCount: creators.size };
  });
}

export async function listTags(): Promise<{ id: string; label: string; slug: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tags").select("id, label, slug").order("label");
  if (error) throw error;
  return data ?? [];
}
