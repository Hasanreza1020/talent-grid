import { cn } from "@/lib/utils";
import { NO_DATA } from "@/lib/format";
import type { MetricResult } from "@/lib/metrics/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Category chip shown over the portrait scrim. */
export function ScrimChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-black/45 px-2 py-0.5 text-xs text-white backdrop-blur-[2px]">
      {children}
    </span>
  );
}

/** Quiet chip used on light surfaces. */
export function Chip({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: "default" | "muted" | "warn";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs",
        tone === "default" && "border-hairline bg-surface text-ink",
        tone === "muted" && "border-hairline bg-muted text-ink-muted",
        tone === "warn" && "border-warn/25 bg-warn/8 text-warn",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Renders a metric, or the words "No data" when it is null.
 *
 * Never a zero, never a dash. The computation is always available on hover,
 * because the team needs to be able to sanity-check any number the tool shows
 * them before repeating it to a client.
 */
export function MetricValue({
  result,
  format,
  label,
  className,
  emphasis = false,
}: {
  result: MetricResult<unknown>;
  format: (value: never) => string;
  label?: string;
  className?: string;
  emphasis?: boolean;
}) {
  const rendered =
    result.value === null ? NO_DATA : format(result.value as never);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "cursor-help underline decoration-hairline decoration-dotted underline-offset-4",
            result.value === null && "text-ink-muted",
            emphasis && "numeral",
            className,
          )}
        >
          {rendered}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-2">
          {label ? <p className="font-medium">{label}</p> : null}
          <p className="text-xs leading-relaxed">{result.basis}</p>
          {Object.keys(result.inputs).length ? (
            <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-xs">
              {Object.entries(result.inputs).map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="opacity-70">{key}</dt>
                  <dd className="text-right tabular-nums">
                    {value === null ? NO_DATA : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/** Plain text for a value that may be absent. */
export function Value({
  children,
  className,
}: {
  children: string | number | null | undefined;
  className?: string;
}) {
  const missing = children === null || children === undefined || children === "";
  return (
    <span className={cn(missing && "text-ink-muted", className)}>
      {missing ? NO_DATA : children}
    </span>
  );
}

/**
 * Warning banner. Uses stone and a heavy left rule rather than a colour wash,
 * so it reads as serious without spending the accent orange, which is reserved
 * for pointers rather than for states.
 */
export function Notice({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children?: React.ReactNode;
  tone?: "neutral" | "warn";
}) {
  return (
    <div
      className={cn(
        "border-l-2 bg-stone/45 px-4 py-3",
        tone === "warn" ? "border-l-warn" : "border-l-ink",
      )}
    >
      <p className="text-sm font-medium text-ink">{title}</p>
      {children ? <div className="mt-1 text-sm text-ink-muted">{children}</div> : null}
    </div>
  );
}

/** Section heading. Sentence case, no tracked-out eyebrow above it. */
export function SectionHeading({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline pb-2">
      <h2 className="text-lg">{children}</h2>
      {action}
    </div>
  );
}

/** Empty state: a plain sentence and, where useful, one control. */
export function EmptyState({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-dashed border-hairline px-4 py-8 text-center">
      <p className="text-sm text-ink-muted">{children}</p>
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
    </div>
  );
}
