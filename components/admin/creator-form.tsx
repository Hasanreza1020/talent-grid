"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { creatorFormSchema, type CreatorFormValues } from "@/lib/schemas";
import { saveCreator } from "@/app/admin/actions";
import { IdentityStep } from "./creator-form/identity-step";
import { AccountsStep } from "./creator-form/accounts-step";
import { CategoriesStep } from "./creator-form/categories-step";
import { RatesStep } from "./creator-form/rates-step";
import { ContactsStep } from "./creator-form/contacts-step";

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

      {step === "identity" ? <IdentityStep form={form} /> : null}
      {step === "accounts" ? <AccountsStep form={form} accounts={accounts} /> : null}
      {step === "categories" ? (
        <CategoriesStep form={form} categories={categories} tags={tags} />
      ) : null}
      {step === "rates" ? <RatesStep form={form} rates={rates} /> : null}
      {step === "contacts" ? <ContactsStep form={form} contacts={contacts} /> : null}

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
