"use client";

import { useEffect, useRef } from "react";

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function findNavOrigin(id: string) {
  const nodes = document.querySelectorAll<HTMLElement>(
    `[data-nav-origin="${id}"]`,
  );

  for (const node of nodes) {
    const rail = node.closest(".studio-rail");
    if (rail && getComputedStyle(rail).display === "none") continue;
    if (node.closest(".site-nav.is-hidden")) continue;

    const rect = node.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    if (rect.bottom < 0 || rect.top > window.innerHeight) continue;

    const style = getComputedStyle(node);
    if (style.visibility === "hidden" || style.opacity === "0") continue;

    return node;
  }

  return null;
}

/**
 * Section title that peels off the matching left-rail / sticky-nav label on
 * scroll, while the nav label itself stays put.
 */
export function FromNavMark({
  navId,
  label,
  extra,
  onActivate,
  activateLabel,
}: {
  navId: string;
  label: string;
  extra?: string;
  onActivate?: () => void;
  activateLabel?: string;
}) {
  const slotRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const slot = slotRef.current;
    const fly = flyRef.current;
    if (!slot || !fly) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;

    const paint = (now = performance.now()) => {
      void now;

      if (reduce.matches) {
        fly.style.transform = "";
        fly.style.opacity = "1";
        return;
      }

      const origin = findNavOrigin(navId);
      if (!origin) {
        fly.style.transform = "";
        fly.style.opacity = "1";
        return;
      }

      const section = slot.closest("section");
      const secTop = section
        ? section.getBoundingClientRect().top
        : slot.getBoundingClientRect().top;
      const vh = window.innerHeight;

      // Start peeling as the section enters; land by the time the title seat is comfy.
      const start = vh * 0.9;
      const end = vh * 0.22;
      const raw = clamp01((start - secTop) / Math.max(start - end, 1));
      const p = easeOutCubic(raw);
      const leave = 1 - p;

      // Clear transform to read the real glyph box (not the full-width row).
      fly.style.transform = "none";
      const rest = fly.getBoundingClientRect();
      const from = origin.getBoundingClientRect();

      // Pin top-left of the title to the nav word, then ease into place.
      const dx = from.left - rest.left;
      const dy = from.top - rest.top;
      const sx = from.width / Math.max(rest.width, 1);
      const sy = from.height / Math.max(rest.height, 1);
      const s = 1 + ((sx + sy) * 0.5 - 1) * leave;

      fly.style.transformOrigin = "left top";
      fly.style.transform = `translate3d(${(dx * leave).toFixed(2)}px, ${(dy * leave).toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
      // Fully on the word at the start of the peel, then settle at rest.
      fly.style.opacity = String(clamp01(0.55 + p * 0.45));
    };

    const tick = (now: number) => {
      paint(now);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    reduce.addEventListener("change", paint);

    return () => {
      cancelAnimationFrame(raf);
      reduce.removeEventListener("change", paint);
      fly.style.transform = "";
      fly.style.opacity = "";
      fly.style.transformOrigin = "";
    };
  }, [navId]);

  return (
    <div ref={slotRef} className="from-nav-mark mb-5 flex items-baseline justify-between gap-6">
      <h2
        ref={flyRef}
        className={
          onActivate
            ? "from-nav-mark__fly from-nav-mark__fly--action"
            : "from-nav-mark__fly"
        }
        onClick={onActivate}
        onKeyDown={
          onActivate
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onActivate();
                }
              }
            : undefined
        }
        role={onActivate ? "button" : undefined}
        tabIndex={onActivate ? 0 : undefined}
        aria-label={onActivate ? (activateLabel ?? label) : undefined}
      >
        {label}
      </h2>
      {extra ? <p className="from-nav-mark__extra">{extra}</p> : null}
    </div>
  );
}
