"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { creatorFormSchema, type CreatorFormValues } from "@/lib/schemas";
import { saveCreator } from "@/app/(app)/admin/actions";
import { profileUrlFor } from "@/lib/handles";
import {
  CONTACT_TYPES,
  CONTACT_TYPE_LABEL,
  CREATOR_STATUSES,
  DATA_CONFIDENCES,
  DATA_CONFIDENCE_LABEL,
  DELIVERABLES,
  DELIVERABLE_LABEL,
  GENDERS,
  GENDER_LABEL,
  LANGUAGES,
  LANGUAGE_LABEL,
  PLATFORMS,
  PLATFORM_LABEL,
  PREFERRED_CHANNELS,
  PREFERRED_CHANNEL_LABEL,
  RATE_PLATFORMS,
  RATE_PLATFORM_LABEL,
  STATUS_LABEL,
  type Platform,
} from "@/lib/types";

const STEPS = [
  { key: "identity", label: "Identity" },
  { key: "accounts", label: "Accounts" },
  { key: "categories", label: "Categories and tags" },
  { key: "rates", label: "Rates" },
  { key: "contacts", label: "Contacts" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

export function CreatorForm({
  creatorId,
  initialValues,
  categories,
  tags,
  initialStep,
}: {
  creatorId: string | null;
  initialValues: CreatorFormValues;
  categories: { id: string; name: string; parentName: string | null }[];
  tags: { id: string; label: string }[];
  initialStep?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<StepKey>(
    (STEPS.find((entry) => entry.key === initialStep)?.key ?? "identity") as StepKey,
  );

  const draftKey = `talent-grid.creator-draft.${creatorId ?? "new"}`;

  const form = useForm<CreatorFormValues>({
    resolver: zodResolver(creatorFormSchema) as Resolver<CreatorFormValues>,
    defaultValues: initialValues,
    mode: "onBlur",
  });

  // Autosave the draft locally. A half-filled creator record represents real
  // research, and losing it to a closed tab is the kind of thing that stops
  // people using an admin tool at all.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(draftKey);
      if (stored) {
        form.reset(JSON.parse(stored));
        toast.info("Restored an unsaved draft.");
      }
    } catch {
      // No draft, or storage unavailable. Nothing to do.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    const subscription = form.watch((values) => {
      try {
        window.localStorage.setItem(draftKey, JSON.stringify(values));
      } catch {
        // Storage full or blocked; autosave is a convenience, not a guarantee.
      }
    });
    return () => subscription.unsubscribe();
  }, [form, draftKey]);

  const accounts = useFieldArray({ control: form.control, name: "accounts" });
  const rates = useFieldArray({ control: form.control, name: "rates" });
  const contacts = useFieldArray({ control: form.control, name: "contacts" });

  const usedPlatforms = new Set(form.watch("accounts").map((account) => account.platform));
  const availablePlatforms = PLATFORMS.filter((platform) => !usedPlatforms.has(platform));

  const onSubmit = form.handleSubmit(
    (values) =>
      startTransition(async () => {
        const result = await saveCreator(creatorId, values);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        try {
          window.localStorage.removeItem(draftKey);
        } catch {
          // Nothing to clear.
        }
        toast.success(creatorId ? "Creator saved." : "Creator created.");
        router.push(`/admin/creators/${result.creatorId}/edit`);
        router.refresh();
      }),
    () => toast.error("Some fields need attention. The step markers show which."),
  );

  const errors = form.formState.errors;
  const stepHasError: Record<StepKey, boolean> = {
    identity: Boolean(errors.identity),
    accounts: Boolean(errors.accounts),
    categories: Boolean(errors.categories),
    rates: Boolean(errors.rates),
    contacts: Boolean(errors.contacts),
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <nav className="flex flex-wrap gap-1 border-b border-hairline">
        {STEPS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setStep(entry.key)}
            className={cn(
              "relative px-3 py-2 text-sm",
              step === entry.key ? "text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {entry.label}
            {stepHasError[entry.key] ? (
              <span className="ml-1.5 text-warn" aria-label="This step has an error">
                !
              </span>
            ) : null}
            {step === entry.key ? (
              <span className="absolute inset-x-0 -bottom-px h-px bg-brand" />
            ) : null}
          </button>
        ))}
      </nav>

      {step === "identity" ? (
        <div className="grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Display name" error={errors.identity?.displayName?.message} required>
            <Input {...form.register("identity.displayName")} />
          </Field>
          <Field label="Legal name" error={errors.identity?.legalName?.message}>
            <Input {...form.register("identity.legalName")} />
          </Field>

          <Field
            label="Short bio"
            hint="Shown on cards. Up to 160 characters."
            error={errors.identity?.bioShort?.message}
            className="sm:col-span-2"
          >
            <Textarea rows={2} {...form.register("identity.bioShort")} />
          </Field>

          <Field label="Long bio" className="sm:col-span-2">
            <Textarea rows={4} {...form.register("identity.bioLong")} />
          </Field>

          <Field label="City">
            <Input {...form.register("identity.city")} placeholder="Dhaka" />
          </Field>
          <Field label="Country">
            <Input {...form.register("identity.country")} />
          </Field>

          <SelectField
            label="Gender"
            value={form.watch("identity.gender")}
            onChange={(value) => form.setValue("identity.gender", value as never)}
            options={GENDERS.map((gender) => ({ value: gender, label: GENDER_LABEL[gender] }))}
          />
          <SelectField
            label="Primary language"
            value={form.watch("identity.primaryLanguage")}
            onChange={(value) => form.setValue("identity.primaryLanguage", value as never)}
            options={LANGUAGES.map((language) => ({
              value: language,
              label: LANGUAGE_LABEL[language],
            }))}
          />
          <SelectField
            label="Status"
            value={form.watch("identity.status")}
            onChange={(value) => form.setValue("identity.status", value as never)}
            options={CREATOR_STATUSES.map((status) => ({
              value: status,
              label: STATUS_LABEL[status],
            }))}
          />
          <SelectField
            label="Data confidence"
            hint="Raise this only once the figures have been checked against the platform."
            value={form.watch("identity.dataConfidence")}
            onChange={(value) => form.setValue("identity.dataConfidence", value as never)}
            options={DATA_CONFIDENCES.map((confidence) => ({
              value: confidence,
              label: DATA_CONFIDENCE_LABEL[confidence],
            }))}
          />

          <Field
            label="Typical turnaround in days"
            error={errors.identity?.typicalTurnaroundDays?.message}
          >
            <Input type="number" min={0} {...form.register("identity.typicalTurnaroundDays")} />
          </Field>

          <div className="flex items-center gap-3 pt-6">
            <Switch
              id="accepts-barter"
              checked={form.watch("identity.acceptsBarter") === true}
              onCheckedChange={(checked) =>
                form.setValue("identity.acceptsBarter", checked ? true : null)
              }
            />
            <Label htmlFor="accepts-barter" className="cursor-pointer font-normal">
              Accepts barter
            </Label>
          </div>
        </div>
      ) : null}

      {step === "accounts" ? (
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
      ) : null}

      {step === "categories" ? (
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
      ) : null}

      {step === "rates" ? (
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
      ) : null}

      {step === "contacts" ? (
        <div className="max-w-3xl space-y-5">
          <p className="text-sm text-ink-muted">
            Contact details are visible to editors and admins only, and never appear on a
            client-facing share link.
          </p>

          {contacts.fields.map((field, index) => (
            <div key={field.id} className="space-y-4 border border-hairline bg-surface p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="Contact type"
                  value={form.watch(`contacts.${index}.contactType`)}
                  onChange={(value) =>
                    form.setValue(`contacts.${index}.contactType`, value as never)
                  }
                  options={CONTACT_TYPES.map((type) => ({
                    value: type,
                    label: CONTACT_TYPE_LABEL[type],
                  }))}
                />
                <Field label="Name">
                  <Input {...form.register(`contacts.${index}.name`)} />
                </Field>
                <Field label="Phone">
                  <Input {...form.register(`contacts.${index}.phone`)} />
                </Field>
                <Field label="WhatsApp">
                  <Input {...form.register(`contacts.${index}.whatsapp`)} />
                </Field>
                <Field label="Email" error={errors.contacts?.[index]?.email?.message}>
                  <Input type="email" {...form.register(`contacts.${index}.email`)} />
                </Field>
                <SelectField
                  label="Preferred channel"
                  value={form.watch(`contacts.${index}.preferredChannel`)}
                  onChange={(value) =>
                    form.setValue(`contacts.${index}.preferredChannel`, value as never)
                  }
                  options={PREFERRED_CHANNELS.map((channel) => ({
                    value: channel,
                    label: PREFERRED_CHANNEL_LABEL[channel],
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.watch(`contacts.${index}.isPrimary`)}
                    onCheckedChange={(checked) => {
                      // Only one contact can be primary, enforced by a partial
                      // unique index in the database as well as here.
                      if (checked) {
                        contacts.fields.forEach((_, otherIndex) =>
                          form.setValue(`contacts.${otherIndex}.isPrimary`, false),
                        );
                      }
                      form.setValue(`contacts.${index}.isPrimary`, Boolean(checked));
                    }}
                  />
                  Primary contact
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove this contact"
                  onClick={() => contacts.remove(index)}
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
              contacts.append({
                contactType: "creator",
                name: null,
                phone: null,
                whatsapp: null,
                email: null,
                preferredChannel: "whatsapp",
                isPrimary: contacts.fields.length === 0,
              })
            }
          >
            <Plus className="mr-1 size-3" />
            Add a contact
          </Button>
        </div>
      ) : null}

      <div className="flex items-center gap-3 border-t border-hairline pt-6">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : creatorId ? "Save changes" : "Create creator"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <span className="text-xs text-ink-muted">Draft saved in this browser as you type.</span>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>
        {label}
        {required ? <span className="text-brand"> *</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs text-warn">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SelectField({
  label,
  hint,
  error,
  value,
  onChange,
  options,
}: {
  label: string;
  hint?: string;
  error?: string;
  value: string | undefined;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      <Select value={value ?? ""} onValueChange={onChange}>
        <SelectTrigger className="w-full bg-surface">
          <SelectValue placeholder="Choose one" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
