import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/db/user";
import { listCategories } from "@/lib/db/categories";
import { ImportWizard } from "@/components/admin/import-wizard";

export const metadata = { title: "Import — Talent Grid" };

export default async function ImportPage() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) redirect("/admin");

  const categories = await listCategories();

  return (
    <div className="space-y-6">
      <div className="max-w-prose space-y-2">
        <h2 className="text-lg">Import a category spreadsheet</h2>
        <p className="text-sm text-ink-muted">
          One CSV per category, in the wide format the agency already uses. Follower
          shorthand such as 4.7m and 445k is converted to integers; anything that does not
          match a known pattern is reported and left null rather than guessed at.
        </p>
      </div>

      <ImportWizard
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
      />
    </div>
  );
}
