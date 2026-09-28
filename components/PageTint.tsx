"use client";

import { useEffect } from "react";
import { mixRgb } from "@/content/tints";
import {
  CREAM_TINT_STOPS,
  getVibe,
  mapVibeColor,
  sampleVibeTintAt,
  subscribeVibe,
  vibeAccents,
} from "@/content/vibe";

function rgb(c: [number, number, number]) {
  return `rgb(${Math.round(c[0])} ${Math.round(c[1])} ${Math.round(c[2])})`;
}

const INK_DARK: [number, number, number] = [34, 28, 22];
const INK_LIGHT: [number, number, number] = [247, 246, 242];
const CREAM_LIFT: [number, number, number] = [250, 246, 238];
const LERP = 0.14;

export function PageTint() {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    let current = {
      paper: [...CREAM_TINT_STOPS[0].paper] as [number, number, number],
      wash: [...CREAM_TINT_STOPS[0].wash] as [number, number, number],
    };
    let target = { ...current };
    let warmth = getVibe().color;

    const seed = vibeAccents(warmth);
    let accent = {
      accent: [...seed.accent] as [number, number, number],
      accentDeep: [...seed.accentDeep] as [number, number, number],
      olive: [...seed.olive] as [number, number, number],
      oliveDeep: [...seed.oliveDeep] as [number, number, number],
      muted: [...seed.muted] as [number, number, number],
      stapleHue: seed.stapleHue,
      ink: [...INK_DARK] as [number, number, number],
    };

    const readStops = () => {
      warmth = getVibe().color;
      const vv = window.visualViewport;
      const viewH = Math.max(window.innerHeight, vv?.height ?? 0);
      target = sampleVibeTintAt(window.scrollY, viewH, warmth);
    };

    const paint = () => {
      current = {
        paper: mixRgb(current.paper, target.paper, LERP),
        wash: mixRgb(current.wash, target.wash, LERP),
      };

      const next = vibeAccents(warmth);
      accent = {
        accent: mixRgb(accent.accent, next.accent, LERP),
        accentDeep: mixRgb(accent.accentDeep, next.accentDeep, LERP),
        olive: mixRgb(accent.olive, next.olive, LERP),
        oliveDeep: mixRgb(accent.oliveDeep, next.oliveDeep, LERP),
        muted: mixRgb(accent.muted, next.muted, LERP),
        stapleHue: accent.stapleHue + (next.stapleHue - accent.stapleHue) * LERP,
        ink: accent.ink,
      };

      const lum =
        (current.paper[0] * 0.2126 +
          current.paper[1] * 0.7152 +
          current.paper[2] * 0.0722) /
        255;
      const inkTarget =
        lum < 0.42
          ? mixRgb(INK_LIGHT, INK_DARK, clamp01(lum / 0.42))
          : INK_DARK;
      accent.ink = mixRgb(accent.ink, inkTarget, LERP);

      const washAlpha = 0.12 + 0.2 * clamp01(mapVibeColor(warmth) / 0.55);

      root.style.setProperty("--paper", rgb(current.paper));
      root.style.setProperty("--wash", rgb(current.wash));
      root.style.setProperty(
        "--cream",
        rgb(mixRgb(current.paper, CREAM_LIFT, 0.5)),
      );
      root.style.setProperty(
        "--tint-wash",
        `rgb(${Math.round(current.wash[0])} ${Math.round(current.wash[1])} ${Math.round(current.wash[2])} / ${washAlpha.toFixed(3)})`,
      );
      root.style.setProperty(
        "--tint-nav",
        `rgb(${Math.round(current.paper[0])} ${Math.round(current.paper[1])} ${Math.round(current.paper[2])} / 0.92)`,
      );
      root.style.setProperty("--lavender", rgb(accent.accent));
      root.style.setProperty("--lavender-deep", rgb(accent.accentDeep));
      root.style.setProperty("--olive", rgb(accent.olive));
      root.style.setProperty("--olive-deep", rgb(accent.oliveDeep));
      root.style.setProperty("--muted", rgb(accent.muted));
      root.style.setProperty(
        "--cursor-glow",
        `${Math.round(accent.olive[0])} ${Math.round(accent.olive[1])} ${Math.round(accent.olive[2])}`,
      );
      root.style.setProperty("--staple-hue", `${accent.stapleHue.toFixed(1)}deg`);
      root.style.setProperty("--ink", rgb(accent.ink));

      raf = requestAnimationFrame(paint);
    };

    const onScroll = () => readStops();
    readStops();
    raf = requestAnimationFrame(paint);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onScroll);
    const unsub = subscribeVibe(() => readStops());

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      vv?.removeEventListener("resize", onScroll);
      unsub();
    };
  }, []);

  return null;
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}
