"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Notice, SectionHeading } from "@/components/ui-bits";
import { commitImport, previewImport } from "@/app/admin/import/actions";
import { PLATFORM_COLUMNS, type TransformResult } from "@/lib/import/transform";
import { formatNumber, NO_DATA } from "@/lib/format";
import { PLATFORM_LABEL } from "@/lib/types";

type Stage = "upload" | "review";

export function ImportWizard({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [stage, setStage] = useState<Stage>("upload");
  const [preview, setPreview] = useState<TransformResult | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [keepSeparate, setKeepSeparate] = useState<number[]>([]);

  const expectedColumns = PLATFORM_COLUMNS.flatMap((entry) => [
    entry.urlColumn,
    entry.followerColumn,
  ]);
  const recognised = ["Name", "Category", ...expectedColumns];
  const unrecognised = columns.filter((column) => !recognised.includes(column));

  if (stage === "upload" || !preview) {
    return (
      <form
        action={(formData) =>
          startTransition(async () => {
            const result = await previewImport(formData);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            setPreview(result.preview);
            setColumns(result.columns);
            setStage("review");
          })
        }
        className="max-w-2xl space-y-5"
      >
        <Notice title="Nothing is written until you have seen the preview">
          The file is parsed, cleaned and checked for duplicates first. You choose the
          category, review every merge, and only then commit.
        </Notice>

        <div className="space-y-1.5">
          <Label htmlFor="file">CSV file</Label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            className="block text-sm file:mr-3 file:rounded-md file:border file:border-hairline file:bg-surface file:px-3 file:py-1.5 file:text-sm"
          />
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Reading the file" : "Preview the import"}
        </Button>
      </form>
    );
  }

  const totalAccounts = preview.creators.reduce(
    (sum, creator) => sum + creator.accounts.length,
    0,
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg">Preview</h2>
        <Button
          variant="ghost"
          onClick={() => {
            setStage("upload");
            setPreview(null);
            setKeepSeparate([]);
          }}
        >
          Start over with a different file
        </Button>
      </div>

      <section className="space-y-3">
        <SectionHeading>What was read</SectionHeading>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Source rows" value={formatNumber(preview.sourceRowCount)} />
          <Stat label="Creators after merging" value={formatNumber(preview.creators.length)} />
          <Stat label="Accounts" value={formatNumber(totalAccounts)} />
          <Stat
            label="Values that failed to parse"
            value={formatNumber(preview.failures.length)}
            warn={preview.failures.length > 0}
          />
        </dl>

        {unrecognised.length > 0 ? (
          <p className="text-sm text-ink-muted">
            Columns not used by the importer:{" "}
            {unrecognised.map((column) => `"${column}"`).join(", ")}. The importer maps{" "}
            {PLATFORM_COLUMNS.map(
              (entry) =>
                `${entry.urlColumn} and ${entry.followerColumn} to ${PLATFORM_LABEL[entry.platform]}`,
            ).join("; ")}
            .
          </p>
        ) : null}

        {preview.emptyColumns.length > 0 ? (
          <p className="text-sm text-ink-muted">
            Empty in every row, so no fields are created for them:{" "}
            {preview.emptyColumns.map((column) => `"${column}"`).join(", ")}.
          </p>
        ) : null}
      </section>

      {preview.failures.length > 0 ? (
        <section className="space-y-3">
          <SectionHeading>Values that could not be parsed</SectionHeading>
          <p className="text-sm text-ink-muted">
            These will be left null rather than guessed at.
          </p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs text-ink-muted">
                <th scope="col" className="py-2 pr-4 font-normal">Row</th>
                <th scope="col" className="py-2 pr-4 font-normal">Creator</th>
                <th scope="col" className="py-2 pr-4 font-normal">Column</th>
                <th scope="col" className="py-2 pr-4 font-normal">Value</th>
                <th scope="col" className="py-2 font-normal">Why</th>
              </tr>
            </thead>
            <tbody>
              {preview.failures.map((failure, index) => (
                <tr key={index} className="border-b border-hairline">
                  <td className="numeral py-2 pr-4">{failure.rowNumber}</td>
                  <td className="py-2 pr-4">{failure.creatorName}</td>
                  <td className="py-2 pr-4">{failure.column}</td>
                  {/* Parse failures are marked in the accent, which is one of
                      its permitted uses: a pointer to what needs attention. */}
                  <td className="bg-brand-quiet py-2 pr-4 font-medium text-brand">
                    {failure.rawValue || "(blank)"}
                  </td>
                  <td className="py-2 text-ink-muted">{failure.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {preview.merges.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading>Suspected duplicates</SectionHeading>
          <p className="max-w-prose text-sm text-ink-muted">
            Each of these was detected automatically. Merging keeps the union of both rows
            and the highest follower value per platform. Choose keep separate if the
            detection is wrong.
          </p>

          <ul className="space-y-4">
            {preview.merges.map((merge) => {
              const separate = merge.rowNumbers.some((row) => keepSeparate.includes(row));
              return (
                <li
                  key={merge.rowNumbers.join("-")}
                  className="space-y-3 border border-hairline bg-surface p-4"
                >
                  <p className="text-sm font-medium">
                    Rows {merge.rowNumbers.join(" and ")} to &ldquo;{merge.keptName}&rdquo;
                  </p>
                  <ul className="space-y-1 text-sm text-ink-muted">
                    {merge.reasoning.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={separate ? "outline" : "default"}
                      onClick={() =>
                        setKeepSeparate((current) =>
                          current.filter((row) => !merge.rowNumbers.includes(row)),
                        )
                      }
                    >
                      Merge
                    </Button>
                    <Button
                      size="sm"
                      variant={separate ? "default" : "outline"}
                      onClick={() =>
                        setKeepSeparate((current) => [
                          ...new Set([...current, ...merge.rowNumbers]),
                        ])
                      }
                    >
                      Keep separate
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {preview.unresolvedHandles.length > 0 ? (
        <section className="space-y-3">
          <SectionHeading>Accounts with no resolvable handle</SectionHeading>
          <p className="max-w-prose text-sm text-ink-muted">
            {preview.unresolvedHandles.length} of these links are post permalinks or video
            links rather than profile URLs. The last segment of such a link is a post id,
            not a handle, so the handle is left null instead of storing something that
            looks like one. The follower count and the URL are still imported.
          </p>
        </section>
      ) : null}

      <section className="space-y-4">
        <SectionHeading>Creators that will be written</SectionHeading>
        <div className="max-h-[24rem] overflow-y-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-canvas">
              <tr className="border-b border-hairline text-left text-xs text-ink-muted">
                <th scope="col" className="py-2 pr-4 font-normal">Row</th>
                <th scope="col" className="py-2 pr-4 font-normal">Name</th>
                <th scope="col" className="py-2 pr-4 font-normal">Slug</th>
                <th scope="col" className="py-2 font-normal">Followers by platform</th>
              </tr>
            </thead>
            <tbody>
              {preview.creators.map((creator) => (
                <tr key={creator.slug} className="border-b border-hairline">
                  <td className="numeral py-2 pr-4">{creator.rowNumbers.join(", ")}</td>
                  <td className="py-2 pr-4">{creator.displayName}</td>
                  <td className="py-2 pr-4 text-ink-muted">{creator.slug}</td>
                  <td className="py-2">
                    {creator.accounts.length === 0 ? (
                      <span className="text-ink-muted">No accounts</span>
                    ) : (
                      creator.accounts.map((account) => (
                        <span key={account.platform} className="mr-4 inline-block">
                          {PLATFORM_LABEL[account.platform]}{" "}
                          <span
                            className={
                              account.followers === null ? "text-ink-muted" : "numeral"
                            }
                          >
                            {account.followers === null
                              ? NO_DATA
                              : formatNumber(account.followers)}
                          </span>
                        </span>
                      ))
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 border-t border-hairline pt-6">
        <div className="max-w-sm space-y-1.5">
          <Label>File these creators under</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-full bg-surface">
              <SelectValue placeholder="Choose a primary category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          disabled={pending || !categoryId}
          onClick={() =>
            startTransition(async () => {
              const result = await commitImport(categoryId, preview, keepSeparate);
              if (result.error) {
                toast.error(result.error);
                return;
              }
              toast.success(
                `Imported. ${result.inserted} created, ${result.updated} already existed, ` +
                  `${result.snapshots} snapshots recorded.`,
              );
              router.push("/admin/creators");
              router.refresh();
            })
          }
        >
          {pending ? "Importing" : "Commit this import"}
        </Button>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={warn ? "numeral text-lg text-warn" : "numeral text-lg"}>{value}</dd>
    </div>
  );
}
