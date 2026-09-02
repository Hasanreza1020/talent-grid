import type { UseFieldArrayReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { CreatorFormValues } from "@/lib/schemas";
import {
  CONTACT_TYPES,
  CONTACT_TYPE_LABEL,
  PREFERRED_CHANNELS,
  PREFERRED_CHANNEL_LABEL,
} from "@/lib/types";
import { Field, SelectField, type CreatorFormApi } from "./field";

export function ContactsStep({
  form,
  contacts,
}: {
  form: CreatorFormApi;
  contacts: UseFieldArrayReturn<CreatorFormValues, "contacts">;
}) {
  const errors = form.formState.errors;

  return (
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
  );
}
