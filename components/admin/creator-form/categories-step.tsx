import { Checkbox } from "@/components/ui/checkbox";
import { SelectField, type CreatorFormApi } from "./field";

export function CategoriesStep({
  form,
  categories,
  tags,
}: {
  form: CreatorFormApi;
  categories: { id: string; name: string; parentName: string | null }[];
  tags: { id: string; label: string }[];
}) {
  const errors = form.formState.errors;

  return (
    <div className="max-w-3xl space-y-6">
      <SelectField
        label="Primary category"
        hint="Every creator has exactly one. It sets the peer group for benchmarking."
        value={form.watch("categories.primaryCategoryId")}
        onChange={(value) => form.setValue("categories.primaryCategoryId", value)}
        error={errors.categories?.primaryCategoryId?.message}
        options={categories.map((category) => ({
          value: category.id,
          label: category.parentName
            ? `${category.parentName}: ${category.name}`
            : category.name,
        }))}
      />

      <fieldset>
        <legend className="text-sm font-medium">Secondary categories</legend>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {categories.map((category) => {
            const selected = form.watch("categories.secondaryCategoryIds") ?? [];
            return (
              <label key={category.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selected.includes(category.id)}
                  onCheckedChange={(checked) =>
                    form.setValue(
                      "categories.secondaryCategoryIds",
                      checked
                        ? [...selected, category.id]
                        : selected.filter((id) => id !== category.id),
                    )
                  }
                />
                {category.parentName ? `${category.parentName}: ` : ""}
                {category.name}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Tags</legend>
        {tags.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            No tags exist yet. Create them under categories and tags.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {tags.map((tag) => {
              const selected = form.watch("categories.tagIds") ?? [];
              return (
                <label key={tag.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selected.includes(tag.id)}
                    onCheckedChange={(checked) =>
                      form.setValue(
                        "categories.tagIds",
                        checked
                          ? [...selected, tag.id]
                          : selected.filter((id) => id !== tag.id),
                      )
                    }
                  />
                  #{tag.label}
                </label>
              );
            })}
          </div>
        )}
      </fieldset>
    </div>
  );
}
