import { listCategories, listTags } from "@/lib/db/categories";
import { CreatorForm } from "@/components/admin/creator-form";
import { Notice } from "@/components/ui-bits";
import type { CreatorFormValues } from "@/lib/schemas";

export const metadata = { title: "New creator — Talent Grid" };

const BLANK: CreatorFormValues = {
  identity: {
    displayName: "",
    legalName: null,
    bioShort: null,
    bioLong: null,
    city: null,
    country: "Bangladesh",
    gender: "undisclosed",
    primaryLanguage: "bangla",
    status: "active",
    dataConfidence: "unverified",
    acceptsBarter: null,
    typicalTurnaroundDays: null,
  },
  accounts: [],
  categories: { primaryCategoryId: "", secondaryCategoryIds: [], tagIds: [] },
  rates: [],
  contacts: [],
};

export default async function NewCreatorPage() {
  const [categories, tags] = await Promise.all([listCategories(), listTags()]);
  const byId = new Map(categories.map((category) => [category.id, category]));

  return (
    <div className="space-y-6">
      <h2 className="text-lg">Add a creator</h2>

      <Notice title="Portraits and follower figures come after the first save">
        Both need the record to exist first: a portrait needs somewhere to upload to, and
        a follower snapshot needs an account to attach itself to. Save this form, then
        both appear on the edit page.
      </Notice>

      <CreatorForm
        creatorId={null}
        initialValues={BLANK}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          parentName: category.parentId
            ? (byId.get(category.parentId)?.name ?? null)
            : null,
        }))}
        tags={tags}
      />
    </div>
  );
}
