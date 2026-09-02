"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Rocket, Smartphone, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        {/*
          A near-solid scrim rather than a gradient. The blobs are dim enough
          that white clears 4.5:1 on its own, but only until two of them drift
          across each other behind the headline; this holds at the worst frame
          rather than the first one.
        */}
        <div className="inline-block rounded-2xl bg-black/45 px-6 py-5 backdrop-blur-[2px]">
          <h1
            className="sg-enter font-display text-2xl leading-tight text-white sm:text-3xl"
            style={{ animationDelay: "0ms" }}
          >
            Describe the campaign. Get the creators.
          </h1>
          <p
            className="sg-enter mx-auto mt-4 max-w-[34rem] text-base text-white/70"
            style={{ animationDelay: "60ms" }}
          >
            Tell us what you sell, what you want to achieve, and what you can spend. We
            will build the shortlist from {rosterSize} creators on file.
          </p>
        </div>
      </div>

      <div
        className={`sg-enter sg-card relative mt-10 rounded-xl border border-[#e4d9cf] bg-surface p-4 shadow-[0_18px_40px_-24px_rgb(0_0_0_/_0.55)] backdrop-blur-sm sm:p-5 ${
          focused ? "sg-card-focused" : ""
        } ${pending ? "scale-[0.98] opacity-60" : ""}`}
        style={{ animationDelay: "120ms" }}
      >
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
          className="relative w-full resize-none bg-transparent text-base leading-6 outline-none placeholder:text-ink-muted/60"
        />

        <div className="relative mt-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((example, index) => (
              <button
                key={example.label}
                type="button"
                onClick={() => fill(example.brief)}
                className="sg-enter group/chip flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1 text-xs text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                style={{ animationDelay: `${180 + index * 40}ms` }}
              >
                <example.Icon className="size-3.5 transition-colors duration-150 group-hover/chip:text-brand" />
                {example.label}
              </button>
            ))}
          </div>

          <Button
            onClick={onSubmit}
            disabled={!ready || pending}
            className="sg-shimmer shrink-0 rounded-lg transition-transform disabled:pointer-events-auto disabled:cursor-not-allowed disabled:bg-muted disabled:text-ink-muted disabled:opacity-100"
          >
            {pending ? "Working" : "Build shortlist"}
          </Button>
        </div>
      </div>
    </div>
  );
}
