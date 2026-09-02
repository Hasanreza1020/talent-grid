"use client";

import { useEffect, useRef } from "react";

/**
 * The whole background: one soft glow behind the orb, and grain.
 *
 * There is nothing else. Earlier builds layered drifting lights and a grid
 * here, which competed with the orb and turned the page brown; all the colour
 * and all the self-starting motion now belong to the orb alone.
 *
 * The grain is not decoration — it is the only thing stopping the glow banding
 * into visible rings on eight-bit panels.
 *
 * No JavaScript animation loop: the runtime work is one opacity variable
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
      const fade = Math.max(0.3, 1 - window.scrollY / height);
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
      className={`sg-hero pointer-events-none absolute inset-0 overflow-hidden ${
        working ? "sg-working" : ""
      } ${calm ? "sg-calm" : ""}`}
    >
      <div className="sg-ambient" />
      <div className="sg-grain" />
    </div>
  );
}
