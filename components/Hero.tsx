"use client";

import { ImageSeries } from "./ImageSeries";

/**
 * Landing image chapter. Desktop and mobile share the same scroll-driven
 * Milligan series + About handoff; layout scale is handled inside ImageSeries.
 */
export function Hero() {
  return (
    <section
      id="image"
      data-story-hero
      className="hero-stage relative z-10 w-full overflow-visible"
    >
      {/* Keep #top for brand links while image nav scrolls here. */}
      <div id="top" className="pointer-events-none absolute inset-x-0 top-0 h-px" aria-hidden />
      <ImageSeries />
    </section>
  );
}
