"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { PROMPT_PLACEHOLDER, STARTER_CHIPS, isUsableBrief } from "@/lib/strategiser/copy";

/**
 * The one prompt box, used at two sizes.
 *
 * "hero" is the home page: wider, an extra row, glass over the collage behind
 * it. "page" is the strategiser: a solid pane, sized to leave room for the rest
 * of the composition in a single viewport. Building it twice would guarantee
 * the two drifted apart the first time either was touched.
 */
export function PromptBox({
  value,
  onChange,
  onSubmit,
  onFocusChange,
  disabled = false,
  size = "page",
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFocusChange?: (focused: boolean) => void;
  disabled?: boolean;
  size?: "hero" | "page";
  error?: string | null;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [focused, setFocused] = useState(false);

  const hero = size === "hero";
  const minHeight = hero ? 88 : 56;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(Math.max(node.scrollHeight, minHeight), 220)}px`;
  }, [value, minHeight]);

  const ready = isUsableBrief(value);

  return (
    <div
      className={[
        "sg-prompt relative",
        hero ? "sg-glass rounded-3xl p-4 sm:p-5" : "sg-pane rounded-2xl p-3",
        focused ? "sg-pane-focused" : "",
        disabled ? "opacity-60" : "",
      ].join(" ")}
    >
      <span className="sg-bloom" />

      <label htmlFor={hero ? "home-brief" : "brief"} className="sr-only">
        Describe your campaign
      </label>

      <div className="relative flex gap-2.5">
        <Sparkles
          className={`shrink-0 text-brand ${hero ? "mt-3 size-4" : "mt-2 size-3.5"}`}
          aria-hidden
        />
        <textarea
          id={hero ? "home-brief" : "brief"}
          ref={ref}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => {
            setFocused(true);
            onFocusChange?.(true);
          }}
          onBlur={() => {
            setFocused(false);
            onFocusChange?.(false);
          }}
          onKeyDown={(event) => {
            if (
              (event.metaKey || event.ctrlKey) &&
              event.key === "Enter" &&
              ready &&
              !disabled
            ) {
              event.preventDefault();
              onSubmit();
            }
          }}
          rows={hero ? 3 : 2}
          placeholder={PROMPT_PLACEHOLDER}
          className={`w-full resize-none bg-transparent text-white outline-none placeholder:text-white/40 ${
            hero ? "pt-1.5 text-base leading-7" : "pt-1 text-[15px] leading-6"
          }`}
        />
      </div>

      <div className="relative mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-white/40">
          {error ?? (ready ? "Ctrl + Enter to send" : "A sentence or two is enough")}
        </p>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!ready || disabled}
          aria-label="Build shortlist"
          className={`group/send grid shrink-0 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
            hero ? "size-10" : "size-9"
          } ${
            ready && !disabled
              ? "bg-brand text-white hover:bg-[#ff6a24]"
              : "cursor-not-allowed bg-[#241d1a] text-white/30"
          }`}
        >
          <ArrowUp
            className={`transition-transform group-hover/send:-translate-y-px ${
              hero ? "size-5" : "size-4"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

/** The starter chips, above the box on both pages. */
export function StarterChips({
  onPick,
  compact = false,
  baseDelay = 0,
}: {
  onPick: (brief: string) => void;
  compact?: boolean;
  baseDelay?: number;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {STARTER_CHIPS.map((chip, index) => (
        <button
          key={chip.label}
          type="button"
          onClick={() => onPick(chip.brief)}
          className={`sg-enter group/chip flex items-center gap-1.5 rounded-full border border-[#2e2724] bg-[#171311] text-white/65 transition-colors duration-150 hover:border-brand hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
            compact ? "px-3 py-1 text-xs" : "px-3.5 py-1.5 text-sm"
          }`}
          style={{ animationDelay: `${baseDelay + index * 40}ms` }}
        >
          <chip.Icon
            className={`transition-colors duration-150 group-hover/chip:text-brand ${
              compact ? "size-3" : "size-3.5"
            }`}
          />
          {chip.label}
        </button>
      ))}
    </div>
  );
}
