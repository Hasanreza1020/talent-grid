import type { UseFieldArrayReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { profileUrlFor } from "@/lib/handles";
import type { CreatorFormValues } from "@/lib/schemas";
import { PLATFORMS, PLATFORM_LABEL, type Platform } from "@/lib/types";
import { Field, type CreatorFormApi } from "./field";

export function AccountsStep({
  form,
  accounts,
}: {
  form: CreatorFormApi;
  accounts: UseFieldArrayReturn<CreatorFormValues, "accounts">;
}) {
  const errors = form.formState.errors;
  const usedPlatforms = new Set(form.watch("accounts").map((account) => account.platform));
  const availablePlatforms = PLATFORMS.filter((platform) => !usedPlatforms.has(platform));

  return (
    <div className="max-w-3xl space-y-5">
      <p className="text-sm text-ink-muted">
        One account per platform. Handles are stored without the @, and the follower
        counts live on dated snapshots rather than here.
      </p>

      {accounts.fields.length === 0 ? (
        <p className="text-sm text-ink-muted">No accounts yet.</p>
      ) : null}

      {accounts.fields.map((field, index) => (
        <div key={field.id} className="space-y-4 border border-hairline bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {PLATFORM_LABEL[form.watch(`accounts.${index}.platform`)]}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove this account"
              onClick={() => accounts.remove(index)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Handle" hint="Without the @">
              <Input
                {...form.register(`accounts.${index}.handle`)}
                onBlur={(event) => {
                  const handle = event.target.value.trim().replace(/^@/, "");
                  if (handle && !form.getValues(`accounts.${index}.profileUrl`)) {
                    form.setValue(
                      `accounts.${index}.profileUrl`,
                      profileUrlFor(form.getValues(`accounts.${index}.platform`), handle),
                    );
                  }
                }}
              />
            </Field>
            <Field
              label="Profile URL"
              required
              error={errors.accounts?.[index]?.profileUrl?.message}
            >
              <Input {...form.register(`accounts.${index}.profileUrl`)} />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.watch(`accounts.${index}.verifiedBadge`)}
              onCheckedChange={(checked) =>
                form.setValue(`accounts.${index}.verifiedBadge`, Boolean(checked))
              }
            />
            Has a verified badge
          </label>
        </div>
      ))}

      {availablePlatforms.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {availablePlatforms.map((platform) => (
            <Button
              key={platform}
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                accounts.append({
                  platform: platform as Platform,
                  handle: null,
                  profileUrl: "",
                  verifiedBadge: false,
                })
              }
            >
              <Plus className="mr-1 size-3" />
              {PLATFORM_LABEL[platform]}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
