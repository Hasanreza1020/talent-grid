"use client";

import { useEffect, useRef } from "react";

/**
 * The background for the whole route: two lights, a grid, and grain.
 *
 * The grid spans the entire page so the scroll from prompt to shortlist has
 * one continuous structure and no seam. The lights are confined to the top of
 * the page and, once results are on screen, drop to a little over a third of
 * their brightness and stop moving altogether — a client reads prices in that
 * region, and light drifting behind small figures makes them tiring to read
 * and the data feel less trustworthy.
 *
 * No JavaScript animation loop. The only runtime work is an opacity variable
 * written on scroll and a class toggled when the tab is hidden.
 */
export function HeroLights({ working, calm }: { working: boolean; calm: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let frame = 0;
    const apply = () => {
      frame = 0;
      const height = window.innerHeight || 1;
      // Never all the way to nothing: the grid carries the long scroll.
      const fade = Math.max(0.35, 1 - window.scrollY / height);
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
      className={`sg-hero pointer-events-none absolute inset-0 ${working ? "sg-working" : ""} ${
        calm ? "sg-calm" : ""
      }`}
    >
      {/* Lights stay in the first screen; the page below them is plain dark. */}
      <div className="sg-lights h-dvh" style={{ bottom: "auto" }}>
        <span className="sg-blob sg-blob-a" />
        <span className="sg-blob sg-blob-c" />
      </div>

      <div className="sg-grid">
        <div className="sg-grid-lines">
          <div className="sg-scan" />
        </div>
      </div>

      <div className="sg-grain" />
    </div>
  );
}
