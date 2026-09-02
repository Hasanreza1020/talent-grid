"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBdt, formatNumber } from "@/lib/format";
import type { Slots, Turn } from "@/lib/strategiser/types";

/**
 * The clarification exchange.
 *
 * A form that talks, not a chat app: no avatars, no bubbles, no typing
 * animation. The brief sits at the top, each question and answer beneath it,
 * and whatever has been captured collapses into a row of chips so the user can
 * see the shape of what will be run before it runs.
 */
export function ThreadView({
  thread,
  slots,
  question,
  quickReplies,
  pending,
  notice,
  onAnswer,
  onStartOver,
}: {
  thread: Turn[];
  slots: Slots;
  question: string | null;
  quickReplies: string[];
  pending: boolean;
  notice: string | null;
  onAnswer: (text: string) => void;
  onStartOver: () => void;
}) {
  const [draft, setDraft] = useState("");

  const chips = [
    slots.brandDescription
      ? { key: "brand", label: shorten(slots.brandDescription) }
      : null,
    slots.objective ? { key: "objective", label: slots.objective } : null,
    slots.budgetBdt !== null ? { key: "budget", label: formatBdt(slots.budgetBdt) } : null,
    slots.creatorCount !== null
      ? { key: "count", label: `${formatNumber(slots.creatorCount)} creators` }
      : null,
  ].filter((chip): chip is { key: string; label: string } => chip !== null);

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || pending) return;
    setDraft("");
    onAnswer(value);
  };

  return (
    <div className="mx-auto max-w-[46rem] space-y-6">
      <ol className="space-y-4">
        {thread.map((turn, index) => (
          <li
            key={index}
            className={turn.role === "user" ? "text-base" : "text-base text-ink-muted"}
          >
            {turn.role === "assistant" ? (
              <span className="block text-sm text-ink-muted">Strategist</span>
            ) : null}
            {turn.text}
          </li>
        ))}
      </ol>

      {chips.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5 border-t border-hairline pt-4">
          {chips.map((chip) => (
            <li
              key={chip.key}
              className="rounded-full border border-hairline px-3 py-1 text-xs text-ink-muted"
            >
              {chip.label}
            </li>
          ))}
        </ul>
      ) : null}

      {notice ? <p className="text-sm text-warn">{notice}</p> : null}

      {question && !pending ? (
        <div className="space-y-3">
          <p className="text-base">{question}</p>

          {quickReplies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => submit(reply)}
                  className="rounded-full border border-hairline px-3 py-1 text-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  {reply}
                </button>
              ))}
            </div>
          ) : null}

          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submit(draft);
            }}
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Or type your answer"
              aria-label="Your answer"
              className="bg-surface"
            />
            <Button type="submit" size="sm" variant="outline" disabled={!draft.trim()}>
              Send
            </Button>
          </form>
        </div>
      ) : null}

      <Button variant="ghost" size="sm" onClick={onStartOver} className="text-ink-muted">
        Start over
      </Button>
    </div>
  );
}

function shorten(text: string): string {
  const words = text.trim().split(/\s+/);
  return words.length <= 6 ? text.trim() : `${words.slice(0, 6).join(" ")}…`;
}
