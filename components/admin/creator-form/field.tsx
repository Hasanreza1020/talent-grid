import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function Field({
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
  children: ReactNode;
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

export function SelectField({
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

/** The shared form handle every step receives from the parent CreatorForm. */
export type CreatorFormApi = import("react-hook-form").UseFormReturn<
  import("@/lib/schemas").CreatorFormValues
>;
