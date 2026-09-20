"use client";

import { useEffect } from "react";

type Stop = {
  id: string;
  paper: [number, number, number];
  wash: [number, number, number];
};

const STOPS: Stop[] = [
  { id: "top", paper: [247, 240, 228], wash: [234, 223, 206] },
  { id: "about", paper: [236, 232, 214], wash: [214, 222, 196] },
  { id: "image", paper: [223, 229, 212], wash: [186, 198, 168] },
  { id: "sound", paper: [214, 218, 196], wash: [168, 176, 132] },
  { id: "dev", paper: [206, 210, 178], wash: [148, 156, 108] },
  { id: "process", paper: [220, 226, 208], wash: [176, 188, 152] },
  { id: "contact", paper: [236, 230, 214], wash: [206, 200, 170] },
];

function mix(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function rgb(c: [number, number, number]) {
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

export function PageTint() {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    let current = { paper: STOPS[0].paper, wash: STOPS[0].wash };
    let target = { paper: STOPS[0].paper, wash: STOPS[0].wash };

    const readStops = () => {
      const mid = window.innerHeight * 0.42;
      const points = STOPS.map((stop) => {
        const el = document.getElementById(stop.id);
        const top = el ? el.getBoundingClientRect().top + window.scrollY : 0;
        return { ...stop, top };
      }).sort((a, b) => a.top - b.top);

      const y = window.scrollY + mid;
      let i = 0;
      while (i < points.length - 1 && y >= points[i + 1].top) i += 1;

      const a = points[i];
      const b = points[Math.min(i + 1, points.length - 1)];
      const span = Math.max(1, b.top - a.top);
      const t = a === b ? 0 : clamp01((y - a.top) / span);

      target = {
        paper: mix(a.paper, b.paper, t),
        wash: mix(a.wash, b.wash, t),
      };
    };

    const paint = () => {
      current = {
        paper: mix(current.paper, target.paper, 0.12),
        wash: mix(current.wash, target.wash, 0.12),
      };

      root.style.setProperty("--paper", rgb(current.paper));
      root.style.setProperty("--cream", rgb(mix(current.paper, [247, 240, 228], 0.35)));
      root.style.setProperty(
        "--tint-wash",
        `rgb(${current.wash[0]} ${current.wash[1]} ${current.wash[2]} / 0.34)`,
      );
      root.style.setProperty(
        "--tint-nav",
        `rgb(${current.paper[0]} ${current.paper[1]} ${current.paper[2]} / 0.86)`,
      );

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
