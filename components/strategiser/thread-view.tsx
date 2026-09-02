"use client";

import { useState } from "react";
import { formatBdt, formatNumber } from "@/lib/format";
import type { Slots, Turn } from "@/lib/strategiser/types";

/**
 * The clarification exchange, on the same dark glass as the prompt card.
 *
 * Still a form that talks rather than a chat app — no avatars, no typing
 * animation — but the turns now read as a thread, which is the shape people
 * already understand from every other assistant they use.
 *
 * The thinking line is not decoration. Step 0 is a model call that can take
 * several seconds, and without it the card sits there looking broken.
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
    slots.brandDescription ? shorten(slots.brandDescription) : null,
    slots.objective,
    slots.budgetBdt !== null ? formatBdt(slots.budgetBdt) : null,
    slots.creatorCount !== null ? `${formatNumber(slots.creatorCount)} creators` : null,
  ].filter((label): label is string => Boolean(label));

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || pending) return;
    setDraft("");
    onAnswer(value);
  };

  return (
    <div className="mx-auto w-full max-w-[46rem] space-y-6">
      <ol className="space-y-5">
        {thread.map((turn, index) =>
          turn.role === "user" ? (
            <li key={index} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md border border-white/15 bg-white/12 px-4 py-2.5 text-[15px] leading-relaxed text-white backdrop-blur-md">
                {turn.text}
              </p>
            </li>
          ) : (
            <li key={index} className="max-w-[85%] text-[15px] leading-relaxed text-white/75">
              {turn.text}
            </li>
          ),
        )}
      </ol>

      {chips.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {chips.map((label) => (
            <li
              key={label}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70"
            >
              {label}
            </li>
          ))}
        </ul>
      ) : null}

      {notice ? <p className="text-sm text-orange-200">{notice}</p> : null}

      {pending ? (
        <p className="flex items-center gap-2 text-[15px] text-white/60">
          <span aria-hidden className="sg-dot size-1.5 rounded-full bg-brand" />
          Thinking
        </p>
      ) : null}

      {question && !pending ? (
        <div className="space-y-3">
          <p className="text-[15px] leading-relaxed text-white/75">{question}</p>

          {quickReplies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => submit(reply)}
                  className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm text-white/80 transition-colors hover:border-brand hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {reply}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <form
        className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur-xl"
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={pending}
          placeholder="Type your answer"
          aria-label="Your answer"
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[15px] text-white outline-none placeholder:text-white/40"
        />
        <button
          type="submit"
          disabled={!draft.trim() || pending}
          className="shrink-0 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
        >
          Send
        </button>
      </form>

      <button
        type="button"
        onClick={onStartOver}
        className="text-sm text-white/50 underline-offset-4 transition-colors hover:text-white/80 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Start over
      </button>
    </div>
  );
}

function shorten(text: string): string {
  const words = text.trim().split(/\s+/);
  return words.length <= 6 ? text.trim() : `${words.slice(0, 6).join(" ")}…`;
}
