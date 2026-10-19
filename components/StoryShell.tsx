"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatedGradient, type GradientConfig } from "@/components/ui/animated-gradient";

const GRADIENT_CONFIG: GradientConfig = {
  preset: "custom",
  color1: "#fcfaf7",
  color2: "#9aa38e",
  color3: "#f9f5ef",
  rotation: -45,
  proportion: 60,
  scale: 0.6,
  speed: 2,
  distortion: 40,
  swirl: 80,
  swirlIterations: 10,
  softness: 100,
  offset: 200,
  shape: "Edge",
  shapeSize: 50,
};

export function StoryShell({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const gradientConfig = useMemo(() => GRADIENT_CONFIG, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setReady(true);
      return;
    }
    const id = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={`story-page color-still relative min-h-svh w-full${
        ready ? " is-ready" : ""
      }`}
    >
      <div className="pointer-events-none fixed inset-0 z-0 h-svh w-full" aria-hidden>
        <AnimatedGradient
          key="page-gradient"
          config={gradientConfig}
          introFromSides
          introDelay={0.75}
          introDuration={3.2}
          cursorRipple={5}
        />
      </div>
      <div className="story-page__content relative z-10">{children}</div>
    </div>
  );
}
