"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PromptBox, StarterChips } from "@/components/strategiser/prompt-box";
import {
  HANDOFF_KEY,
  PROMPT_HEADLINE,
  isUsableBrief,
  promptSubline,
} from "@/lib/strategiser/copy";

/**
 * The home page's version of the prompt: larger, glass, and a one-way door.
 *
 * Submitting parks the brief in sessionStorage and navigates. The strategiser
 * picks it up on mount and starts the pipeline itself, so nobody types or
 * submits twice — and because sessionStorage survives a same-tab redirect, the
 * brief lives through the sign-in wall rather than being lost at it.
 */
export function HomePrompt({ rosterSize }: { rosterSize: number }) {
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const fill = (brief: string) => {
    setError(null);
    setValue(brief);
    window.requestAnimationFrame(() => {
      boxRef.current?.querySelector("textarea")?.focus();
    });
  };

  const submit = () => {
    const brief = value.trim();
    // A brief too thin to act on is handled here rather than by navigating to
    // a page that would only bounce the person back.
    if (!isUsableBrief(brief)) {
      setError("Tell us a little more — what you sell, and what the campaign is for.");
      return;
    }

    try {
      window.sessionStorage.setItem(HANDOFF_KEY, brief);
    } catch {
      // Private mode or blocked storage: the strategiser still opens, the
      // person just types it again. Better than refusing to navigate.
    }
    setLeaving(true);
    router.push("/strategiser?start=1");
  };

  return (
    <div className="mx-auto w-full max-w-[46rem]">
      <h1 className="text-center font-display text-2xl leading-tight text-white sm:text-4xl">
        {PROMPT_HEADLINE}
      </h1>
      <p className="mx-auto mt-4 max-w-[38rem] text-center text-base leading-relaxed text-white/60">
        {promptSubline(rosterSize)}
      </p>

      <div className="mt-8" ref={boxRef}>
        <PromptBox
          value={value}
          onChange={(next) => {
            setValue(next);
            if (error) setError(null);
          }}
          onSubmit={submit}
          disabled={leaving}
          size="hero"
          error={error}
        />
      </div>

      <div className="mt-4">
        <StarterChips onPick={fill} />
      </div>
    </div>
  );
}
