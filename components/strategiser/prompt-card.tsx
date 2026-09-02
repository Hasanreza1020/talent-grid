"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

const EXAMPLES: { label: string; brief: string }[] = [
  {
    label: "Product launch",
    brief:
      "We make affordable skincare for women 18 to 30. We're launching a new serum next month and want people talking about it before it lands. Budget around 200000 BDT, looking for about 6 creators.",
  },
  {
    label: "Ramadan campaign",
    brief:
      "We're a local food delivery app. We want a Ramadan campaign around iftar ordering, aimed at families in Dhaka. Budget 300000 BDT, around 8 creators.",
  },
  {
    label: "App installs",
    brief:
      "We have a Bangla learning app for school students. The goal is installs, not awareness. Budget 100000 BDT, 5 creators.",
  },
  {
    label: "Small budget test",
    brief:
      "We sell handmade jewellery on Facebook. We've never worked with creators and want to try it cheaply first. Budget 40000 BDT, 3 creators.",
  },
];

/**
 * The whole input surface: a short hero and one card.
 *
 * There are no filters here on purpose. A marketer describing a campaign in
 * their own words gives more to work with than a form, and whatever they leave
 * out is asked for afterwards rather than guessed at or demanded up front.
 */
export function PromptCard({
  value,
  onChange,
  onSubmit,
  pending,
  rosterSize,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  pending: boolean;
  rosterSize: number;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  // Grows with the text between three and ten rows, then scrolls.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "auto";
    const lineHeight = 24;
    node.style.height = `${Math.min(Math.max(node.scrollHeight, lineHeight * 3), lineHeight * 10)}px`;
  }, [value]);

  const ready = value.trim().split(/\s+/).filter(Boolean).length >= 4;

  return (
    <div className="mx-auto max-w-[46rem]">
      <div className="text-center">
        <h1 className="font-display text-2xl leading-tight sm:text-3xl">
          Describe the campaign. Get the creators.
        </h1>
        <p className="mx-auto mt-4 max-w-[34rem] text-base text-ink-muted">
          Tell us what you sell, what you want to achieve, and what you can spend. We
          will build the shortlist from {rosterSize} creators on file.
        </p>
      </div>

      <div className="mt-10 rounded-xl border border-hairline bg-surface p-4 sm:p-5">
        <label htmlFor="brief" className="sr-only">
          Describe your campaign
        </label>
        <textarea
          id="brief"
          ref={ref}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && ready && !pending) {
              event.preventDefault();
              onSubmit();
            }
          }}
          rows={3}
          placeholder="We make affordable skincare for women 18 to 30. We want awareness before a Ramadan launch, budget around 200000 BDT, looking for about 6 creators."
          className="w-full resize-none bg-transparent text-base leading-6 outline-none placeholder:text-ink-muted/70"
        />

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => {
                  onChange(example.brief);
                  window.requestAnimationFrame(() => {
                    const node = ref.current;
                    if (!node) return;
                    node.focus();
                    node.setSelectionRange(example.brief.length, example.brief.length);
                  });
                }}
                className="rounded-full border border-hairline px-3 py-1 text-xs text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {example.label}
              </button>
            ))}
          </div>

          <Button
            onClick={onSubmit}
            disabled={!ready || pending}
            className="shrink-0 rounded-lg disabled:pointer-events-auto disabled:cursor-not-allowed disabled:bg-muted disabled:text-ink-muted disabled:opacity-100"
          >
            {pending ? "Working" : "Build shortlist"}
          </Button>
        </div>
      </div>
    </div>
  );
}
