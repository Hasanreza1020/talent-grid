import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  CREATOR_STATUSES,
  DATA_CONFIDENCES,
  DATA_CONFIDENCE_LABEL,
  GENDERS,
  GENDER_LABEL,
  LANGUAGES,
  LANGUAGE_LABEL,
  STATUS_LABEL,
} from "@/lib/types";
import { Field, SelectField, type CreatorFormApi } from "./field";

export function IdentityStep({ form }: { form: CreatorFormApi }) {
  const errors = form.formState.errors;

  return (
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
  );
}
