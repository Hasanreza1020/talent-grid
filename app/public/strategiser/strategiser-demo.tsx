"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { PromptBox, StarterChips } from "@/components/strategiser/prompt-box";
import { Orb } from "@/components/strategiser/orb";
import { PROMPT_HEADLINE } from "@/lib/strategiser/copy";
import { formatCompact, formatNumber, initialsOf } from "@/lib/format";
import { buildPublicShortlist, type PublicPlan } from "./actions";

export function StrategiserDemo({ rosterSize }: { rosterSize: number }) {
  const [value, setValue] = useState("");
  const [plan, setPlan] = useState<PublicPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [spent, setSpent] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const outcome = await buildPublicShortlist(value);
      if (outcome.ok) {
        setPlan(outcome);
        setSpent(true);
      } else {
        setError(outcome.error);
        if (outcome.used) setSpent(true);
      }
    });
  };

  if (plan) {
    return (
      <div className="mx-auto max-w-[47.5rem] px-6 py-12">
        <p className="flex justify-end">
          <span className="max-w-[85%] rounded-2xl rounded-br-md border border-white/12 bg-white/8 px-4 py-2.5 text-[15px] leading-relaxed">
            {plan.brief}
          </span>
        </p>

        <p className="mt-8 text-lg leading-relaxed text-white/85">
          Six creators from the roster, {formatCompact(plan.totalReach ?? 0)} combined
          followers.
        </p>
        <p className="mt-2 text-sm text-white/45">{plan.note}</p>

        <ul className="mt-8 space-y-3">
          {plan.picks.map((creator) => (
            <li key={creator.slug}>
              <Link
                href={`/creators/${creator.slug}`}
                className="sg-solid flex items-center gap-4 rounded-2xl p-4 transition-colors hover:border-brand"
              >
                <span className="size-12 shrink-0 overflow-hidden rounded-xl bg-white/5">
                  {creator.portraitUrl ? (
                    <Image
                      src={creator.portraitUrl}
                      alt=""
                      width={48}
                      height={48}
                      sizes="48px"
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center font-display text-xs text-white/40">
                      {initialsOf(creator.name)}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base">{creator.name}</span>
                  <span className="block truncate text-sm text-white/45">
                    {creator.category ?? "Uncategorised"}
                    {creator.city ? ` · ${creator.city}` : ""}
                  </span>
                </span>
                <span className="numeral shrink-0 text-sm">
                  {creator.totalReach === null
                    ? "—"
                    : formatCompact(creator.totalReach)}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/*
          The wall, stated plainly. Pretending the demo did more than it did
          would be the easy version and the dishonest one: everything that
          makes a real shortlist a decision — the rates, the engagement, the
          budget split — is exactly what is not on this site.
        */}
        <div className="sg-solid mt-10 rounded-2xl p-6 text-center">
          <h2 className="font-display text-xl">That is the free one.</h2>
          <p className="mx-auto mt-3 max-w-[34rem] text-sm leading-relaxed text-white/55">
            This ranked by reach, because reach is all this site publishes. The real
            strategiser weighs engagement, splits your budget across the shortlist and
            tells you what each creator costs — with the rate cards attached.
          </p>
          <a
            href="mailto:hello@onetech.com.bd?subject=Grid%20access"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[#ff6a24]"
          >
            Request access
            <ArrowRight className="size-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate">
      <div className="sg-ambient" />
      <div className="sg-grain" />

      <div className="relative mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-[46rem] flex-col justify-center px-6 py-16">
        <div className="flex flex-col items-center text-center">
          <Orb />
          <h1 className="mt-8 font-display text-3xl leading-tight sm:text-4xl">
            {PROMPT_HEADLINE}
          </h1>
          <p className="mt-3 max-w-[34rem] text-base leading-relaxed text-white/55">
            One shortlist, free, from the {formatNumber(rosterSize)} creators on file.
          </p>
        </div>

        <div className="mt-8">
          <StarterChips onPick={setValue} compact />
        </div>

        <div className="mt-4">
          <PromptBox
            value={value}
            onChange={(next) => {
              setValue(next);
              if (error) setError(null);
            }}
            onSubmit={submit}
            disabled={pending || spent}
            error={error}
          />
        </div>

        {spent && !plan ? (
          <p className="mt-6 text-center text-sm text-white/55">
            <a href="mailto:hello@onetech.com.bd?subject=Grid%20access" className="text-brand">
              Request access
            </a>{" "}
            to keep building shortlists.
          </p>
        ) : null}
      </div>
    </div>
  );
}
