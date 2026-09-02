"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Rocket, Smartphone, Wallet } from "lucide-react";

const EXAMPLES = [
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

const TYPE_MS = 28;
const HOLD_MS = 2500;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Types the example briefs into the placeholder, one after another.
 *
 * The placeholder, never the value: the field must still read as empty, and a
 * user who starts typing must not be racing an animation for control of their
 * own input. It stops for good the moment they touch the field.
 */
function useTypedPlaceholder(stopped: boolean): string {
  const [text, setText] = useState("");

  useEffect(() => {
    if (stopped) return;
    if (prefersReducedMotion()) {
      setText(EXAMPLES[0].brief);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const run = async () => {
      const wait = (ms: number) =>
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, ms);
        });

      let index = 0;
      while (!cancelled) {
        const brief = EXAMPLES[index % EXAMPLES.length].brief;
        for (let i = 1; i <= brief.length && !cancelled; i += 2) {
          setText(brief.slice(0, i));
          await wait(TYPE_MS);
        }
        if (cancelled) break;
        await wait(HOLD_MS);
        for (let i = brief.length; i >= 0 && !cancelled; i -= 6) {
          setText(brief.slice(0, i));
          await wait(12);
        }
        index += 1;
      }
    };

    void run();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [stopped]);

  return text;
}

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
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);

  const placeholder = useTypedPlaceholder(touched || value.length > 0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "auto";
    const line = 24;
    node.style.height = `${Math.min(Math.max(node.scrollHeight, line * 3), line * 10)}px`;
  }, [value]);

  const ready = value.trim().split(/\s+/).filter(Boolean).length >= 4;

  const fill = (brief: string) => {
    setTouched(true);
    onChange(brief);
    window.requestAnimationFrame(() => {
      const node = ref.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(brief.length, brief.length);
    });
  };

  return (
    <div className="mx-auto max-w-[46rem]">
      <div className="text-center">
        <h1
          className="sg-enter font-display text-3xl leading-tight text-white sm:text-4xl"
          style={{ animationDelay: "0ms" }}
        >
          Describe the campaign. Get the creators.
        </h1>
        <p
          className="sg-enter mx-auto mt-3 max-w-[34rem] text-base leading-relaxed text-white/60"
          style={{ animationDelay: "60ms" }}
        >
          Tell us what you sell, what you want to achieve, and what you can spend. We
          will build the shortlist from {rosterSize} creators on file.
        </p>
      </div>

      <div
        className={`sg-enter sg-ring mt-8 ${pending ? "scale-[0.98] opacity-60" : ""}`}
        style={{ animationDelay: "120ms" }}
      >
        <div className={`sg-card p-3 sm:p-4 ${focused ? "sg-card-focused" : ""}`}>
        <span className="sg-bloom" />

        <label htmlFor="brief" className="sr-only">
          Describe your campaign
        </label>
        <textarea
          id="brief"
          ref={ref}
          value={value}
          disabled={pending}
          onChange={(event) => {
            setTouched(true);
            onChange(event.target.value);
          }}
          onFocus={() => {
            setTouched(true);
            setFocused(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && ready && !pending) {
              event.preventDefault();
              onSubmit();
            }
          }}
          rows={3}
          placeholder={placeholder}
          className="relative w-full resize-none bg-transparent px-2 pt-2 text-[15px] leading-6 text-white outline-none placeholder:text-white/55"
        />

        <div className="relative mt-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((example, index) => (
              <button
                key={example.label}
                type="button"
                onClick={() => fill(example.brief)}
                className="sg-enter group/chip flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition-colors duration-150 hover:border-brand hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                style={{ animationDelay: `${180 + index * 40}ms` }}
              >
                <example.Icon className="size-3.5 transition-colors duration-150 group-hover/chip:text-brand" />
                {example.label}
              </button>
            ))}
          </div>

          {/*
            Orange either way. Grey here read as broken, because the typed
            placeholder makes the field look filled while the button waits on
            an empty value — so the two states differ in weight, not in hue.
          */}
          <button
            type="button"
            onClick={onSubmit}
            disabled={!ready || pending}
            aria-describedby={ready ? undefined : "brief-hint"}
            className={`sg-shimmer shrink-0 rounded-xl px-5 py-2.5 text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              ready && !pending
                ? "bg-brand text-white shadow-[0_8px_24px_-8px_rgb(255_77_13_/_0.7)]"
                : "cursor-not-allowed border border-brand/40 bg-brand/15 text-brand"
            }`}
          >
            {pending ? "Working" : "Build shortlist"}
          </button>
        </div>
        </div>
      </div>

      {!ready ? (
        <p id="brief-hint" className="mt-3 text-center text-xs text-white/45">
          Write a sentence or two about the campaign to continue.
        </p>
      ) : null}
    </div>
  );
}
