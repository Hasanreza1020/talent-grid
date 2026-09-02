"use client";

/**
 * The focal point, and the only place colour and self-starting motion live.
 *
 * A handful of divs and some radial gradients — no canvas, no library, no
 * video. The swirl sits inside a rotating wrapper while the specular highlight
 * stays put outside it, because a fixed light source over a turning surface is
 * what makes this read as a sphere rather than as a flat disc with things
 * sliding around on it.
 *
 * Decorative: it carries no information and is hidden from screen readers.
 */
export function Orb() {
  return (
    <div className="sg-orb-wrap" aria-hidden>
      <span className="sg-orb-bloom" />
      <span className="sg-orb">
        <span className="sg-orb-spin">
          <span className="sg-swirl sg-swirl-1" />
          <span className="sg-swirl sg-swirl-2" />
          <span className="sg-swirl sg-swirl-3" />
        </span>
        <span className="sg-orb-spec" />
      </span>
    </div>
  );
}
