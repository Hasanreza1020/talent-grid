import type { UseFieldArrayReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { CreatorFormValues } from "@/lib/schemas";
import {
  DELIVERABLES,
  DELIVERABLE_LABEL,
  RATE_PLATFORMS,
  RATE_PLATFORM_LABEL,
} from "@/lib/types";
import { Field, SelectField, type CreatorFormApi } from "./field";

export function RatesStep({
  form,
  rates,
}: {
  form: CreatorFormApi;
  rates: UseFieldArrayReturn<CreatorFormValues, "rates">;
}) {
  const errors = form.formState.errors;

  return (
    <div className="max-w-3xl space-y-5">
      <p className="text-sm text-ink-muted">
        Rates are whole taka amounts. Adding a new dated rate keeps the old one as
        history; the most recent one that has come into effect is the current rate.
      </p>

      {rates.fields.map((field, index) => (
        <div key={field.id} className="space-y-4 border border-hairline bg-surface p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Platform"
              value={form.watch(`rates.${index}.platform`)}
              onChange={(value) => form.setValue(`rates.${index}.platform`, value as never)}
              options={RATE_PLATFORMS.map((platform) => ({
                value: platform,
                label: RATE_PLATFORM_LABEL[platform],
              }))}
            />
            <SelectField
              label="Deliverable"
              value={form.watch(`rates.${index}.deliverable`)}
              onChange={(value) =>
                form.setValue(`rates.${index}.deliverable`, value as never)
              }
              options={DELIVERABLES.map((deliverable) => ({
                value: deliverable,
                label: DELIVERABLE_LABEL[deliverable],
              }))}
            />
            <Field
              label="Price in BDT"
              required
              error={errors.rates?.[index]?.priceBdt?.message}
            >
              <Input type="number" min={0} {...form.register(`rates.${index}.priceBdt`)} />
            </Field>
            <Field label="Effective from" required>
              <Input type="date" {...form.register(`rates.${index}.effectiveFrom`)} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Input {...form.register(`rates.${index}.notes`)} />
            </Field>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.watch(`rates.${index}.negotiable`)}
                onCheckedChange={(checked) =>
                  form.setValue(`rates.${index}.negotiable`, Boolean(checked))
                }
              />
              Negotiable
            </label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove this rate"
              onClick={() => rates.remove(index)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          rates.append({
            platform: "cross_platform",
            deliverable: "reel",
            priceBdt: 0,
            negotiable: true,
            notes: null,
            effectiveFrom: new Date().toISOString().slice(0, 10),
          })
        }
      >
        <Plus className="mr-1 size-3" />
        Add a rate
      </Button>
    </div>
  );
}
