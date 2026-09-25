"use client";

import { useEffect, useState, type ReactNode } from "react";
import { heroPhoto } from "@/content/photos";
import { HeroWarp } from "./HeroWarp";

export function StoryShell({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

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
      <HeroWarp
        src={heroPhoto.src}
        flowSrc={heroPhoto.flowSrc}
        bleedSrc={heroPhoto.bleedSrc}
        maskSrc={heroPhoto.maskSrc}
        alt={heroPhoto.alt}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
