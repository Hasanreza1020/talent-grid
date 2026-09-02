"use client";

const STAGES = [
  "Reading your brief",
  "Searching the roster",
  "Weighing engagement and budget",
  "Building the mix",
];

/**
 * What the pipeline is doing, while it does it.
 *
 * The stages are a coarse read on two server round trips, not four measured
 * steps, so they are written as the honest sequence of work rather than
 * claimed as precise progress. A stage that has been reached stays lit rather
 * than being skipped past — the labels never run ahead of the work.
 */
export function StageLabels({ stage, rosterSize }: { stage: number; rosterSize: number }) {
  return (
    <ol className="mt-8 space-y-2 text-center text-sm" aria-live="polite">
      {STAGES.map((label, index) => {
        const active = index === stage;
        const reached = index <= stage;
        const text =
          label === "Searching the roster" ? `Searching ${rosterSize} creators` : label;

        return (
          <li
            key={label}
            className={`flex items-center justify-center gap-2 transition-opacity duration-500 ${
              reached ? "text-white" : "text-white/35"
            }`}
          >
            <span
              aria-hidden
              className={`size-1.5 shrink-0 rounded-full ${
                active ? "sg-dot bg-brand" : reached ? "bg-white/40" : "bg-white/15"
              }`}
            />
            {text}
          </li>
        );
      })}
    </ol>
  );
}
