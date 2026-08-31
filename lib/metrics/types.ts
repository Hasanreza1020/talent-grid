/**
 * Every computed metric returns its value alongside the inputs that produced
 * it, because the spec requires each one to show its computation on hover so
 * the team can sanity-check it. A null value always carries a `basis` string
 * explaining what was missing, which is what the UI renders instead of a zero.
 */
export type MetricResult<T = number> = {
  value: T | null;
  /** Plain-sentence explanation of how the value was derived, or why it is null. */
  basis: string;
  /** Named inputs, rendered as a small table in the tooltip. */
  inputs: Record<string, number | string | null>;
  /**
   * Set when the value is real but not directly comparable with the primary
   * definition of the metric, e.g. an engagement rate computed over followers
   * rather than views.
   */
  qualifier?: string;
};

export function noData<T = number>(
  basis: string,
  inputs: Record<string, number | string | null> = {},
): MetricResult<T> {
  return { value: null, basis, inputs };
}
