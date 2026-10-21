"use client";

import { ImageSeries } from "./ImageSeries";

/**
 * Landing image chapter. Desktop and mobile share the same scroll-driven
 * Milligan series + About handoff; layout scale is handled inside ImageSeries.
 */
export function Hero() {
  return (
    <section
      data-story-hero
      className="hero-stage relative z-10 w-full overflow-visible"
    >
      <ImageSeries />
    </section>
  );
}
