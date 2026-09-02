"use client";

import { useEffect, useRef } from "react";

/**
 * The layered background behind the prompt card.
 *
 * Bottom to top: near-black base, three coloured lights, the masked grid, the
 * scan sweep, grain, vignette. Three colours is the ceiling — a fourth is what
 * turned the first version to mud.
 *
 * There is no JavaScript animation loop and there should never be one. The
 * only runtime work is an opacity variable written on scroll and a class
 * toggled when the tab is hidden. Everything else is CSS keyframes moving
 * transform and opacity, because anything else repaints every frame and will
 * stutter on the mid-range Android phones that are most of this market.
 */
export function HeroLights({ working }: { working: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let frame = 0;
    const apply = () => {
      frame = 0;
      const height = window.innerHeight || 1;
      const fade = Math.max(0, 1 - window.scrollY / height);
      node.style.setProperty("--sg-fade", fade.toFixed(3));
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const sync = () => {
      node.classList.toggle("sg-paused", document.visibilityState === "hidden");
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`sg-hero absolute inset-0 ${working ? "sg-working" : ""}`}
    >
      <div className="sg-lights">
        <span className="sg-blob sg-blob-a" />
        <span className="sg-blob sg-blob-b" />
        <span className="sg-blob sg-blob-c" />
      </div>

      <div className="sg-ends" />

      {/* One element, one background pattern. The inner layer carries the
          drift so the mask on the parent does not move with it. */}
      <div className="sg-grid">
        <div className="sg-grid-lines">
          <div className="sg-scan" />
        </div>
      </div>

      <div className="sg-grain" />
      <div className="sg-vignette" />
    </div>
  );
}
