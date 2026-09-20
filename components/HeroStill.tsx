"use client";

import NextImage from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useCursorReveal } from "./CursorReveal";
import { layoutStrips, type HeroStrip } from "./heroRibs";

type HeroStillProps = {
  src: string;
  alt: string;
  open: boolean;
  radius?: number;
  landing?: boolean;
};

type StripLayout = {
  strips: HeroStrip[];
  heroW: number;
  heroH: number;
};

export function HeroStill({
  src,
  alt,
  open,
  radius = 260,
  landing = false,
}: HeroStillProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const cursor = useCursorReveal();
  const [layout, setLayout] = useState<StripLayout | null>(null);
  const [awake, setAwake] = useState(false);
  const [breathing, setBreathing] = useState(false);
  const userMoved = useRef(false);

  useEffect(() => {
    const img = new window.Image();
    img.src = src;
    let observer: ResizeObserver | null = null;
    let gone = false;
    let lastKey = "";

    const measure = () => {
      const box = wrapRef.current?.getBoundingClientRect();
      if (!box || !img.naturalWidth) return;
      const key = `${Math.round(box.width)}x${Math.round(box.height)}`;
      if (key === lastKey) return;
      lastKey = key;

      const strips = layoutStrips(img, box.width, box.height);
      setLayout({
        strips: strips?.strips ?? [{ left: 0, width: Math.round(box.width) }],
        heroW: strips?.heroW ?? Math.round(box.width),
        heroH: strips?.heroH ?? Math.round(box.height),
      });
    };

    img
      .decode()
      .then(() => {
        if (gone) return;
        measure();
        observer = new ResizeObserver(measure);
        if (wrapRef.current) observer.observe(wrapRef.current);
      })
      .catch(() => undefined);

    return () => {
      gone = true;
      observer?.disconnect();
    };
  }, [src]);

  useEffect(() => {
    if (!landing || !layout) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setAwake(true);
      return;
    }
    const boot = window.setTimeout(() => {
      setAwake(true);
      setBreathing(true);
    }, 80);
    const settle = window.setTimeout(() => setBreathing(false), 2000);
    return () => {
      window.clearTimeout(boot);
      window.clearTimeout(settle);
    };
  }, [landing, layout]);

  useEffect(() => {
    if (!landing || !layout) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const root = rootRef.current ?? wrapRef.current;
    if (!root) return;

    let raf = 0;
    const start = performance.now();
    const duration = 2400;

    const tick = (now: number) => {
      if (userMoved.current) return;
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      const box = root.getBoundingClientRect();
      const x =
        box.width * (0.42 + Math.sin(ease * Math.PI * 1.15) * 0.18);
      const y =
        box.height * (0.38 + Math.cos(ease * Math.PI * 0.9) * 0.1);

      root.style.setProperty("--spot-on", String(0.55 + ease * 0.35));
      root.style.setProperty("--spot-x", `${x}px`);
      root.style.setProperty("--spot-y", `${y}px`);

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else if (!userMoved.current) {
        root.style.setProperty("--spot-on", "0.35");
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [landing, layout]);

  useEffect(() => {
    if (!cursor) return;

    return cursor.subscribe(({ x, y, fine, kind }) => {
      const root = rootRef.current ?? wrapRef.current;
      if (!root) return;

      if (x > -1000 && y > -1000) {
        userMoved.current = true;
      }

      if (!fine || kind === "text") {
        if (userMoved.current) root.style.setProperty("--spot-on", "0");
        return;
      }

      const box = root.getBoundingClientRect();
      const inside =
        x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;

      root.style.setProperty("--spot-on", inside ? "1" : "0");
      if (!inside) return;

      root.style.setProperty("--spot-x", `${x - box.left}px`);
      root.style.setProperty("--spot-y", `${y - box.top}px`);
    });
  }, [cursor]);

  return (
    <div
      ref={wrapRef}
      className={`hero-still absolute inset-0 overflow-hidden bg-ink${
        awake ? " is-awake" : ""
      }`}
    >
      <NextImage
        src={src}
        alt={alt}
        fill
        priority
        sizes="100vw"
        className={`pointer-events-none object-cover object-[68%_center] still ${
          layout ? "opacity-0" : ""
        }`}
      />
      {layout ? (
        <div
          ref={rootRef}
          className={`hero-strips color-still${open ? " is-open" : ""}${
            breathing && !open ? " is-breathing" : ""
          }`}
          style={
            {
              "--spot-r": `${radius}px`,
              "--hero-w": `${layout.heroW}px`,
              "--hero-h": `${layout.heroH}px`,
            } as CSSProperties
          }
          aria-hidden
        >
          {layout.strips.map((strip, i) => (
            <div
              key={`${strip.left}-${strip.width}`}
              className="hero-strip"
              style={
                {
                  "--left": `${strip.left}px`,
                  "--width": `${strip.width}px`,
                  "--dir": i % 2 === 0 ? 1 : -1,
                  "--i": i,
                } as CSSProperties
              }
            >
              <div
                className="hero-strip__fill still"
                style={{ backgroundImage: `url(${src})` }}
              />
              <div
                className="hero-strip__fill hero-strip__color"
                style={{ backgroundImage: `url(${src})` }}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
