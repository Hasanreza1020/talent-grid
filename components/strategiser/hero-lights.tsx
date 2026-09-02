"use client";

import { useEffect, useRef } from "react";

/**
 * The moving lights behind the prompt card.
 *
 * Three blurred radial gradients on near-black, drifting on CSS keyframes.
 * There is no JavaScript animation loop here and there should never be one:
 * the only work this component does at runtime is set an opacity variable on
 * scroll and pause the layer when the tab is hidden.
 *
 * Everything animated is transform or opacity. The blur is applied once, at
 * rest — animating a filter repaints the whole layer every frame, which is
 * exactly how this effect ends up stuttering on the mid-range Android phones
 * that make up most of this market.
 */
export function HeroLights({ working }: { working: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Fade the whole layer out across roughly one viewport of scrolling, so the
  // results below are read on a calm ground rather than through the lights.
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

  // Nothing should be animating behind a tab nobody is looking at.
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
      <div className="sg-grain" />
      <div className="sg-vignette" />
    </div>
  );
}
