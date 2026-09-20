"use client";

import { useEffect } from "react";
import { mixRgb, sampleTintAt, TINT_STOPS } from "@/content/tints";

function rgb(c: [number, number, number]) {
  return `rgb(${Math.round(c[0])} ${Math.round(c[1])} ${Math.round(c[2])})`;
}

export function PageTint() {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    let current = {
      paper: TINT_STOPS[0].paper as [number, number, number],
      wash: TINT_STOPS[0].wash as [number, number, number],
    };
    let target = { ...current };

    const readStops = () => {
      target = sampleTintAt(window.scrollY, window.innerHeight);
    };

    const paint = () => {
      current = {
        paper: mixRgb(current.paper, target.paper, 0.18),
        wash: mixRgb(current.wash, target.wash, 0.18),
      };

      root.style.setProperty("--paper", rgb(current.paper));
      root.style.setProperty(
        "--cream",
        rgb(mixRgb(current.paper, [234, 223, 206], 0.28)),
      );
      root.style.setProperty(
        "--tint-wash",
        `rgb(${Math.round(current.wash[0])} ${Math.round(current.wash[1])} ${Math.round(current.wash[2])} / 0.34)`,
      );
      root.style.setProperty(
        "--tint-nav",
        `rgb(${Math.round(current.paper[0])} ${Math.round(current.paper[1])} ${Math.round(current.paper[2])} / 0.86)`,
      );

      // Ink softens slightly on darker grades so type stays readable.
      const lum =
        (current.paper[0] * 0.2126 +
          current.paper[1] * 0.7152 +
          current.paper[2] * 0.0722) /
        255;
      const ink =
        lum < 0.35
          ? mixRgb([247, 240, 228], [34, 28, 22], lum / 0.35)
          : ([34, 28, 22] as [number, number, number]);
      root.style.setProperty("--ink", rgb(ink));

      raf = requestAnimationFrame(paint);
    };

    const onScroll = () => readStops();
    readStops();
    raf = requestAnimationFrame(paint);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return null;
}
