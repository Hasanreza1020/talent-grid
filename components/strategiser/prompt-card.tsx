"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUp,
  Moon,
  Rocket,
  Scale,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { Orb } from "./orb";

const CHIPS = [
  {
    label: "Product launch",
    Icon: Rocket,
    brief:
      "We make affordable skincare for women 18 to 30. We're launching a new serum next month and want people talking about it before it lands. Budget around 200000 BDT, looking for about 6 creators.",
  },
  {
    label: "Ramadan campaign",
    Icon: Moon,
    brief:
      "We're a local food delivery app. We want a Ramadan campaign around iftar ordering, aimed at families in Dhaka. Budget 300000 BDT, around 8 creators.",
  },
  {
    label: "App installs",
    Icon: Smartphone,
    brief:
      "We have a Bangla learning app for school students. The goal is installs, not awareness. Budget 100000 BDT, 5 creators.",
  },
  {
    label: "Small budget test",
    Icon: Wallet,
    brief:
      "We sell handmade jewellery on Facebook. We've never worked with creators and want to try it cheaply first. Budget 40000 BDT, 3 creators.",
  },
] as const;

const PLACEHOLDER =
  "We make affordable skincare for women 18 to 30. We're launching a new serum next month, budget around 200000 BDT, looking for about 6 creators.";

/**
 * The hero composition: orb, headline, subline, chips, prompt, action cards.
 *
 * The chips moved out of the card and above it, so the card holds one thing.
 * There is no attach or settings row: the brief said to add those only if they
 * genuinely do something, and here they would be decoration.
 */
export function PromptCard({
  value,
  onChange,
  onSubmit,
  onFocusChange,
  pending,
  rosterSize,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFocusChange: (focused: boolean) => void;
  pending: boolean;
  rosterSize: number;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(Math.max(node.scrollHeight, 72), 240)}px`;
  }, [value]);

  const ready = value.trim().split(/\s+/).filter(Boolean).length >= 4;

  const fill = (brief: string) => {
    onChange(brief);
    window.requestAnimationFrame(() => {
      const node = ref.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(brief.length, brief.length);
    });
  };

  const cards = [
    {
      Icon: Users,
      title: "Build a shortlist",
      body: "Describe a campaign and get matched creators with budget allocation.",
      tag: "Start",
      action: () => fill(CHIPS[0].brief),
      href: undefined as string | undefined,
    },
    {
      Icon: Scale,
      title: "Compare picks",
      body: "Send any shortlist straight into a side-by-side comparison.",
      tag: "Compare",
      action: undefined,
      href: "/compare",
    },
    {
      Icon: Wallet,
      title: "Plan a budget",
      body: "See what your spend buys in reach before you commit to it.",
      tag: "Plan",
      action: () => fill(CHIPS[3].brief),
      href: undefined as string | undefined,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[46rem]">
      <div className="flex flex-col items-center text-center">
        <div className="sg-enter" style={{ animationDelay: "0ms" }}>
          <Orb />
        </div>

        <h1
          className="sg-enter mt-8 font-display text-3xl leading-tight text-white sm:text-4xl"
          style={{ animationDelay: "60ms" }}
        >
          Describe the campaign. Get the creators.
        </h1>
        <p
          className="sg-enter mt-3 max-w-[34rem] text-base leading-relaxed text-white/55"
          style={{ animationDelay: "120ms" }}
        >
          Tell us what you sell, what you want to achieve, and what you can spend. We
          will build the shortlist from {rosterSize} creators on file.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {CHIPS.map((chip, index) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => fill(chip.brief)}
            className="sg-enter group/chip flex items-center gap-2 rounded-full border border-[#2e2724] bg-[#171311] px-3.5 py-1.5 text-sm text-white/65 transition-colors duration-150 hover:border-brand hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            style={{ animationDelay: `${180 + index * 40}ms` }}
          >
            <chip.Icon className="size-3.5 transition-colors duration-150 group-hover/chip:text-brand" />
            {chip.label}
          </button>
        ))}
      </div>

      <div
        className={`sg-enter sg-pane relative mt-4 rounded-3xl p-3 sm:p-4 ${
          focused ? "sg-pane-focused" : ""
        } ${pending ? "opacity-60" : ""}`}
        style={{ animationDelay: "340ms" }}
      >
        <span className="sg-bloom" />

        <label htmlFor="brief" className="sr-only">
          Describe your campaign
        </label>

        <div className="relative flex gap-2.5">
          <Sparkles className="mt-2.5 size-4 shrink-0 text-brand" aria-hidden />
          <textarea
            id="brief"
            ref={ref}
            value={value}
            disabled={pending}
            onChange={(event) => onChange(event.target.value)}
            onFocus={() => {
              setFocused(true);
              onFocusChange(true);
            }}
            onBlur={() => {
              setFocused(false);
              onFocusChange(false);
            }}
            onKeyDown={(event) => {
              if (
                (event.metaKey || event.ctrlKey) &&
                event.key === "Enter" &&
                ready &&
                !pending
              ) {
                event.preventDefault();
                onSubmit();
              }
            }}
            rows={3}
            placeholder={PLACEHOLDER}
            className="w-full resize-none bg-transparent pt-1.5 text-[15px] leading-6 text-white outline-none placeholder:text-white/50"
          />
        </div>

        <div className="relative mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-white/35">
            {ready ? "Ctrl + Enter to send" : "A sentence or two is enough"}
          </p>

          <button
            type="button"
            onClick={onSubmit}
            disabled={!ready || pending}
            aria-label="Build shortlist"
            className={`group/send grid size-8 shrink-0 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              ready && !pending
                ? "bg-brand text-white hover:bg-[#ff6a24]"
                : "cursor-not-allowed bg-[#241d1a] text-white/30"
            }`}
          >
            <ArrowUp className="size-4 transition-transform group-hover/send:-translate-y-px" />
          </button>
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((card, index) => {
          const inner = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-8 place-items-center rounded-lg border border-[#2e2724] text-white/45 transition-colors group-hover/card:text-brand">
                  <card.Icon className="size-4" />
                </span>
                <span className="rounded-full border border-[#2e2724] px-2 py-0.5 text-[11px] text-white/40">
                  {card.tag}
                </span>
              </div>
              <p className="mt-4 text-sm text-white">{card.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/45">{card.body}</p>
            </>
          );

          const className =
            "sg-enter sg-solid group/card block h-full w-full rounded-2xl p-4 text-left hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
          const style = { animationDelay: `${400 + index * 40}ms` };

          return (
            <li key={card.title}>
              {card.href ? (
                <Link href={card.href} className={className} style={style}>
                  {inner}
                </Link>
              ) : (
                <button type="button" onClick={card.action} className={className} style={style}>
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
