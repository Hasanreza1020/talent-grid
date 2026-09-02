"use client";

import { useRef } from "react";
import Link from "next/link";
import { Scale, Users, Wallet } from "lucide-react";
import { Orb } from "./orb";
import { PromptBox, StarterChips } from "./prompt-box";
import { PROMPT_HEADLINE, STARTER_CHIPS, promptSubline } from "@/lib/strategiser/copy";

/**
 * The strategiser hero: orb, headline, subline, chips, prompt, action cards.
 *
 * Every part is sized to hold the whole proposition in one screen on a laptop.
 * The action cards are the thinnest thing here on purpose — they are the first
 * element to give up space when the fit gets tight, so they carry an icon, a
 * title and a tag and no body copy.
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
  const boxRef = useRef<HTMLDivElement | null>(null);

  const fill = (brief: string) => {
    onChange(brief);
    window.requestAnimationFrame(() => {
      boxRef.current?.querySelector("textarea")?.focus();
    });
  };

  const cards = [
    {
      Icon: Users,
      title: "Build a shortlist",
      tag: "Start",
      action: () => fill(STARTER_CHIPS[0].brief),
      href: undefined as string | undefined,
    },
    {
      Icon: Scale,
      title: "Compare picks",
      tag: "Compare",
      action: undefined,
      href: "/compare",
    },
    {
      Icon: Wallet,
      title: "Plan a budget",
      tag: "Plan",
      action: () => fill(STARTER_CHIPS[3].brief),
      href: undefined as string | undefined,
    },
  ];

  return (
    <div className="sg-stack mx-auto w-full max-w-[46rem]">
      <div className="flex flex-col items-center text-center">
        <div className="sg-enter" style={{ animationDelay: "0ms" }}>
          <Orb />
        </div>
      </div>

      <h1
        className="sg-enter sg-headline text-center font-display text-white"
        style={{ animationDelay: "60ms" }}
      >
        {PROMPT_HEADLINE}
      </h1>

      <p
        className="sg-enter sg-subline mx-auto max-w-[38rem] text-center text-white/55"
        style={{ animationDelay: "120ms" }}
      >
        {promptSubline(rosterSize)}
      </p>

      <div className="sg-enter" style={{ animationDelay: "180ms" }}>
        <StarterChips onPick={fill} compact baseDelay={180} />
      </div>

      <div ref={boxRef} className="sg-enter" style={{ animationDelay: "340ms" }}>
        <PromptBox
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          onFocusChange={onFocusChange}
          disabled={pending}
          size="page"
        />
      </div>

      <ul className="grid grid-cols-3 gap-3">
        {cards.map((card, index) => {
          const inner = (
            <span className="flex items-center gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-[#2e2724] text-white/45 transition-colors group-hover/card:text-brand">
                <card.Icon className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-white sm:text-sm">
                {card.title}
              </span>
              <span className="hidden shrink-0 rounded-full border border-[#2e2724] px-2 py-0.5 text-[10px] text-white/40 lg:block">
                {card.tag}
              </span>
            </span>
          );

          const className =
            "sg-enter sg-solid group/card block h-full w-full rounded-xl px-3 py-2.5 text-left hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
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
