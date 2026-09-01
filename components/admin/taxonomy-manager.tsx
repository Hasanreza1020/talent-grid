"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionHeading } from "@/components/ui-bits";
import { createCategory, createTag } from "@/app/admin/actions";
import { formatNumber } from "@/lib/format";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parentName: string | null;
  creatorCount: number;
};

export function TaxonomyManager({
  categories,
  tags,
}: {
  categories: CategoryRow[];
  tags: { id: string; label: string; slug: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [categoryName, setCategoryName] = useState("");
  const [parentId, setParentId] = useState<string>("none");
  const [tagLabel, setTagLabel] = useState("");

  const parents = categories.filter((category) => category.parentId === null);

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
      <section className="space-y-4">
        <SectionHeading>Categories</SectionHeading>

        <ul className="divide-y divide-hairline border-y border-hairline">
          {parents.map((parent) => {
            const children = categories.filter((c) => c.parentId === parent.id);
            return (
              <li key={parent.id} className="py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-base">{parent.name}</span>
                  <span className="numeral text-sm text-ink-muted">
                    {formatNumber(parent.creatorCount)}
                  </span>
                </div>
                {children.length > 0 ? (
                  <ul className="mt-2 space-y-1 pl-4">
                    {children.map((child) => (
                      <li
                        key={child.id}
                        className="flex items-baseline justify-between gap-4 text-sm text-ink-muted"
                      >
                        <span>{child.name}</span>
                        <span className="numeral">{formatNumber(child.creatorCount)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="space-y-3 border border-hairline bg-surface p-4">
          <div className="space-y-1.5">
            <Label htmlFor="category-name">New category</Label>
            <Input
              id="category-name"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder="Motovlog"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sits under</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nothing, it is a top-level category</SelectItem>
                {parents.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={pending || !categoryName.trim()}
            onClick={() =>
              startTransition(async () => {
                const result = await createCategory(
                  categoryName,
                  parentId === "none" ? null : parentId,
                );
                if (result.error) toast.error(result.error);
                else {
                  toast.success("Category added.");
                  setCategoryName("");
                  router.refresh();
                }
              })
            }
          >
            Add category
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading>Tags</SectionHeading>
        <p className="text-sm text-ink-muted">
          Freeform chips shown over the portrait. Stored without the hash; the interface
          adds it.
        </p>

        {tags.length === 0 ? (
          <p className="text-sm text-ink-muted">No tags yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="rounded-full border border-hairline bg-surface px-2.5 py-1 text-sm"
              >
                #{tag.label}
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-3 border border-hairline bg-surface p-4">
          <div className="space-y-1.5">
            <Label htmlFor="tag-label">New tag</Label>
            <Input
              id="tag-label"
              value={tagLabel}
              onChange={(event) => setTagLabel(event.target.value)}
              placeholder="DhakaBased"
            />
          </div>
          <Button
            disabled={pending || !tagLabel.trim()}
            onClick={() =>
              startTransition(async () => {
                const result = await createTag(tagLabel);
                if (result.error) toast.error(result.error);
                else {
                  toast.success("Tag added.");
                  setTagLabel("");
                  router.refresh();
                }
              })
            }
          >
            Add tag
          </Button>
        </div>
      </section>
    </div>
  );
}
