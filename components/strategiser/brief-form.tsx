"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBdt } from "@/lib/format";
import { PLATFORMS, PLATFORM_LABEL, type Platform } from "@/lib/types";
import { MAX_CREATORS, OBJECTIVES, type Brief } from "@/lib/strategiser/types";

const STAGES = ["Reading your brief", "Searching the roster", "Building the mix"];

export function BriefForm({
  cheapestRate,
  rosterSize,
  pending,
  stage,
  error,
  onSubmit,
}: {
  cheapestRate: number | null;
  rosterSize: number;
  pending: boolean;
  stage: number;
  error: string | null;
  onSubmit: (brief: Brief) => void;
}) {
  const [brandDescription, setBrandDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [otherObjective, setOtherObjective] = useState("");
  const [budget, setBudget] = useState("");
  const [creatorCount, setCreatorCount] = useState("5");
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [audienceNotes, setAudienceNotes] = useState("");

  const budgetValue = Number(budget) || 0;
  const countValue = Number(creatorCount) || 0;
  const perCreator = countValue > 0 ? budgetValue / countValue : 0;

  // A warning, not a block. The roster's cheapest rate is a fact worth knowing
  // before the run, but a marketer may well be planning around it.
  const budgetWarning =
    budgetValue > 0 && countValue > 0 && cheapestRate !== null && perCreator < cheapestRate
      ? `That works out to about ${formatBdt(Math.round(perCreator))} per creator. Our lowest rate is ${formatBdt(cheapestRate)} — try fewer creators or a higher budget.`
      : null;

  const ready =
    brandDescription.trim().length > 0 &&
    objective.length > 0 &&
    (objective !== "Something else" || otherObjective.trim().length > 0) &&
    budgetValue > 0 &&
    countValue > 0;

  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (!ready || pending) return;
        onSubmit({
          brandDescription: brandDescription.trim(),
          objective:
            objective === "Something else" ? otherObjective.trim() : objective,
          budgetBdt: budgetValue,
          creatorCount: countValue,
          platforms,
          audienceNotes: audienceNotes.trim(),
        });
      }}
    >
      <Field
        label="What does your company do?"
        hint={`${brandDescription.length} of 600 characters`}
      >
        <Textarea
          value={brandDescription}
          onChange={(event) => setBrandDescription(event.target.value.slice(0, 600))}
          rows={4}
          required
          placeholder="We make affordable skincare for women aged 18 to 30, sold mainly through Facebook and our own site."
          className="bg-surface"
        />
      </Field>

      <Field label="What is this campaign for?">
        <Select value={objective} onValueChange={setObjective}>
          <SelectTrigger className="w-full bg-surface">
            <SelectValue placeholder="Choose an objective" />
          </SelectTrigger>
          <SelectContent>
            {OBJECTIVES.map((entry) => (
              <SelectItem key={entry} value={entry}>
                {entry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {objective === "Something else" ? (
          <Input
            value={otherObjective}
            onChange={(event) => setOtherObjective(event.target.value)}
            placeholder="Describe the objective"
            aria-label="Describe the objective"
            className="mt-2 bg-surface"
          />
        ) : null}
      </Field>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Total budget" hint="Creator fees only, not production.">
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-muted">BDT</span>
            <Input
              value={budget}
              onChange={(event) => setBudget(event.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              required
              placeholder="200000"
              className="bg-surface"
            />
          </div>
        </Field>

        <Field label="How many creators?">
          <Input
            value={creatorCount}
            onChange={(event) => setCreatorCount(event.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            required
            min={1}
            max={MAX_CREATORS}
            className="bg-surface"
          />
        </Field>
      </div>

      {budgetWarning ? (
        <p className="text-sm text-warn">{budgetWarning}</p>
      ) : null}

      <Field label="Platforms" hint="Leave blank and we'll pick based on your audience.">
        <div className="flex flex-wrap gap-x-5 gap-y-3 pt-1">
          {PLATFORMS.map((platform) => (
            <label key={platform} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={platforms.includes(platform)}
                onCheckedChange={() =>
                  setPlatforms((current) =>
                    current.includes(platform)
                      ? current.filter((entry) => entry !== platform)
                      : [...current, platform],
                  )
                }
              />
              {PLATFORM_LABEL[platform]}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Anything else about the audience?" hint="Optional.">
        <Textarea
          value={audienceNotes}
          onChange={(event) => setAudienceNotes(event.target.value.slice(0, 300))}
          rows={2}
          placeholder="Mostly Dhaka and Chittagong, Bangla-first content."
          className="bg-surface"
        />
      </Field>

      {error ? <p className="text-sm text-warn">{error}</p> : null}

      <div className="space-y-4">
        <Button
          type="submit"
          size="lg"
          disabled={!ready || pending}
          className="rounded-lg px-8 max-sm:w-full disabled:pointer-events-auto disabled:cursor-not-allowed disabled:bg-muted disabled:text-ink-muted disabled:opacity-100"
        >
          {pending ? "Building" : "Build my shortlist"}
        </Button>

        {/*
          The stages are the real steps, marked as each completes. It is a wait
          of a few seconds and saying what is happening is more use than a
          spinner — but only because these correspond to work actually done.
        */}
        {pending ? (
          <ol className="space-y-1.5 text-sm" aria-live="polite">
            {STAGES.map((label, index) => (
              <li
                key={label}
                className={index <= stage ? "text-ink" : "text-ink-muted/60"}
              >
                {index < stage ? "Done — " : index === stage ? "" : ""}
                {label === "Searching the roster"
                  ? `Searching ${rosterSize} creators`
                  : label}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      {hint ? <p className="mb-2 mt-0.5 text-xs text-ink-muted">{hint}</p> : <div className="mb-2" />}
      {children}
    </div>
  );
}
