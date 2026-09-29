"use client";

import { useEffect, useRef } from "react";

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Viewport-space box — rail / face nav are fixed, so this stays stable across scroll. */
type OriginBox = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function effectiveOpacity(el: HTMLElement) {
  let opacity = 1;
  let node: HTMLElement | null = el;
  while (node && node !== document.documentElement) {
    const o = Number.parseFloat(getComputedStyle(node).opacity);
    if (Number.isFinite(o)) opacity *= o;
    if (opacity < 0.05) return opacity;
    node = node.parentElement;
  }
  return opacity;
}

/** Prefer the text glyph box so we line up under the word, not the hit target. */
function textBox(el: HTMLElement): OriginBox {
  const text = Array.from(el.childNodes).find(
    (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
  );
  if (text) {
    const range = document.createRange();
    range.selectNodeContents(text);
    const rect = range.getBoundingClientRect();
    if (rect.width >= 1 && rect.height >= 1) {
      return {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
    }
  }

  const labeled = el.querySelector("span");
  if (labeled) {
    const rect = labeled.getBoundingClientRect();
    if (rect.width >= 1 && rect.height >= 1) {
      return {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
    }
  }

  const rect = el.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

/** Snapshot the matching rail / sticky-nav word in viewport space. */
function readNavOrigin(id: string, preferRail: boolean): OriginBox | null {
  const nodes = document.querySelectorAll<HTMLElement>(
    `[data-nav-origin="${id}"]`,
  );

  const ordered = preferRail
    ? [
        ...Array.from(nodes).filter((n) => n.closest(".studio-rail")),
        ...Array.from(nodes).filter((n) => !n.closest(".studio-rail")),
      ]
    : Array.from(nodes);

  for (const node of ordered) {
    const rail = node.closest(".studio-rail");
    if (rail && getComputedStyle(rail).display === "none") continue;
    if (node.closest(".site-nav.is-hidden")) continue;
    if (node.closest(".site-nav.is-exited")) continue;

    const box = textBox(node);
    if (box.width < 1 || box.height < 1) continue;
    if (box.left + box.width < 8 || box.left > window.innerWidth - 8) continue;
    if (box.top + box.height < 0 || box.top > window.innerHeight) continue;
    if (effectiveOpacity(node) < 0.2) continue;

    const style = getComputedStyle(node);
    if (style.visibility === "hidden") continue;

    return box;
  }

  return null;
}

/** Surfaces that should keep a flying title invisible while covering it. */
const OCCLUDER_SEL =
  ".sound-player, .project-browser, .project-browser__file, .about-photo, .hero-collage__stage, .hero-series, .hero-single, .hero-staple";

type Box = { left: number; top: number; right: number; bottom: number };

function rectsOverlap(a: Box, b: Box, inset = 2) {
  return !(
    a.right < b.left + inset ||
    a.left > b.right - inset ||
    a.bottom < b.top + inset ||
    a.top > b.bottom - inset
  );
}

/**
 * Section title that peels off the matching left-rail label on scroll (desktop),
 * or materializes mid-viewport then settles into the section (mobile).
 * Hidden until the beat starts so titles don't ghost over the desktop rail.
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
  const extraElRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const slot = slotRef.current;
    const fly = flyRef.current;
    if (!slot || !fly) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 767px)");
    const section = slot.closest("section") ?? slot;

    let occluders: Box[] = [];
    let raf = 0;
    let flying = false;
    /** Frozen once per peel — never reset mid-flight (that caused the wrong→right hop). */
    let frozenOrigin: OriginBox | null = null;
    let seatSize = { width: 0, height: 0 };
    let written = "";
    let needsTick = false;
    /** Ignore ResizeObserver while we hold the seat open for fixed flight. */
    let holdingSeat = false;

    const clearFlyPin = () => {
      holdingSeat = false;
      fly.style.position = "";
      fly.style.left = "";
      fly.style.top = "";
      fly.style.zIndex = "";
      fly.style.transform = "";
      fly.style.transformOrigin = "";
      slot.style.height = "";
    };

    const measureOccluders = () => {
      const scrollY = window.scrollY;
      occluders = [];
      for (const card of document.querySelectorAll<HTMLElement>(OCCLUDER_SEL)) {
        if (slot.contains(card)) continue;
        const cr = card.getBoundingClientRect();
        if (cr.width < 12 || cr.height < 12) continue;
        occluders.push({
          left: cr.left,
          right: cr.right,
          top: cr.top + scrollY,
          bottom: cr.bottom + scrollY,
        });
      }
    };

    const occluded = (left: number, docTop: number, w: number, h: number) => {
      const titleBox = {
        left: left - 6,
        top: docTop - 4,
        right: left + Math.max(w, 1) + 6,
        bottom: docTop + Math.max(h, 1) + 4,
      };
      for (const card of occluders) {
        if (rectsOverlap(titleBox, card)) return true;
      }
      return false;
    };

    /** Begin a desktop peel: capture nav word + in-flow seat size once. */
    const beginDesktopPeel = () => {
      clearFlyPin();
      const box = fly.getBoundingClientRect();
      seatSize = { width: box.width, height: box.height };
      holdingSeat = true;
      slot.style.height = `${Math.max(box.height, 1)}px`;
      frozenOrigin = readNavOrigin(navId, true);
    };

    const paint = () => {
      const extraEl = extraElRef.current;

      if (reduce.matches) {
        needsTick = false;
        frozenOrigin = null;
        if (written === "reduce") return;
        written = "reduce";
        clearFlyPin();
        fly.style.opacity = "1";
        fly.style.visibility = "";
        fly.style.pointerEvents = "";
        if (extraEl) {
          extraEl.style.transform = "";
          extraEl.style.opacity = "1";
          extraEl.style.visibility = "";
        }
        return;
      }

      const scrollY = window.scrollY;
      const vh = window.innerHeight;
      // Live section top — always aims at the real seat, no stale cache.
      const secTop = section.getBoundingClientRect().top;

      const start = mobile.matches ? vh * 0.95 : vh * 1.05;
      const end = mobile.matches ? vh * 0.18 : vh * 0.28;
      const raw = clamp01((start - secTop) / Math.max(start - end, 1));
      const p = easeInOutCubic(raw);
      const leave = 1 - p;

      if (raw > 0 && !flying) measureOccluders();
      flying = raw > 0;
      needsTick = raw > 0 && leave > 0.001;

      if (raw <= 0) {
        frozenOrigin = null;
        if (written === "hidden") return;
        written = "hidden";
        clearFlyPin();
        fly.style.opacity = "0";
        fly.style.visibility = "hidden";
        fly.style.pointerEvents = "none";
        if (extraEl) {
          extraEl.style.opacity = "0";
          extraEl.style.visibility = "hidden";
        }
        return;
      }

      if (leave <= 0.001) {
        frozenOrigin = null;
        if (written === "rest") return;
        written = "rest";
        clearFlyPin();
        fly.style.opacity = "1";
        fly.style.visibility = "";
        fly.style.pointerEvents = "";
        if (extraEl) {
          extraEl.style.transform = "";
          extraEl.style.opacity = "1";
          extraEl.style.visibility = "";
        }
        return;
      }

      // Mobile: materialize at mid-viewport, then settle into the section seat.
      if (mobile.matches) {
        frozenOrigin = null;
        clearFlyPin();
        const seat = slot.getBoundingClientRect();
        const midX = window.innerWidth * 0.5 - seat.width * 0.5;
        const midY = vh * 0.42 - seat.height * 0.5;
        const dx = midX - seat.left;
        const dy = midY - seat.top;
        const s = 0.92 + 0.08 * p;
        const visX = seat.left + dx * leave;
        const visY = seat.top + dy * leave;
        const behind = occluded(
          visX,
          visY + scrollY,
          seat.width * s,
          seat.height * s,
        );
        const transform = `translate3d(${(dx * leave).toFixed(2)}px, ${(dy * leave).toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
        const fade = clamp01(raw / 0.32);
        const shown = behind ? 0 : fade;
        const key = `m|${transform}|${shown.toFixed(4)}|${behind ? 1 : 0}`;
        if (written === key) return;
        written = key;
        fly.style.visibility = behind ? "hidden" : "visible";
        fly.style.pointerEvents = "";
        fly.style.transformOrigin = "left top";
        fly.style.transform = transform;
        fly.style.opacity = String(shown);
        if (extraEl) {
          const reveal = behind ? 0 : clamp01((p - 0.12) / 0.88);
          extraEl.style.visibility = reveal > 0 ? "visible" : "hidden";
          extraEl.style.transform = `translate3d(0, ${((1 - reveal) * 64).toFixed(2)}px, 0)`;
          extraEl.style.opacity = String(reveal);
        }
        return;
      }

      // Desktop: one origin freeze, live seat from the slot — straight path, no hop.
      if (!frozenOrigin) beginDesktopPeel();
      const origin = frozenOrigin;
      if (!origin) {
        if (written === "rest") return;
        written = "rest";
        clearFlyPin();
        fly.style.opacity = "1";
        fly.style.visibility = "";
        fly.style.pointerEvents = "";
        if (extraEl) {
          extraEl.style.transform = "";
          extraEl.style.opacity = "1";
          extraEl.style.visibility = "";
        }
        return;
      }

      const seat = slot.getBoundingClientRect();
      const x = origin.left + (seat.left - origin.left) * p;
      const y = origin.top + (seat.top - origin.top) * p;
      const sx = origin.width / Math.max(seatSize.width, 1);
      const sy = origin.height / Math.max(seatSize.height, 1);
      const s = 1 + ((sx + sy) * 0.5 - 1) * leave * 0.85;

      const opacity = clamp01(0.92 + p * 0.08);
      const key = `d|${x.toFixed(2)}|${y.toFixed(2)}|${s.toFixed(4)}|${opacity.toFixed(4)}`;
      if (written === key) return;
      written = key;

      fly.style.position = "fixed";
      fly.style.left = `${x.toFixed(2)}px`;
      fly.style.top = `${y.toFixed(2)}px`;
      fly.style.zIndex = "50";
      fly.style.visibility = "visible";
      fly.style.pointerEvents = "";
      fly.style.transformOrigin = "left top";
      fly.style.transform = `scale(${s.toFixed(4)})`;
      fly.style.opacity = String(opacity);

      if (extraEl) {
        const reveal = clamp01((p - 0.18) / 0.82);
        extraEl.style.visibility = reveal > 0 ? "visible" : "hidden";
        extraEl.style.transform = `translate3d(0, ${((1 - reveal) * 48).toFixed(2)}px, 0)`;
        extraEl.style.opacity = String(reveal);
      }
    };

    const tick = () => {
      raf = 0;
      paint();
      if (needsTick) {
        raf = requestAnimationFrame(tick);
      }
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(tick);
    };

    const remeasure = () => {
      // Don't restart an in-flight peel — that was the wrong-spot → right-spot hop.
      if (!holdingSeat) {
        frozenOrigin = null;
      }
      written = "";
      measureOccluders();
      schedule();
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", remeasure);
    reduce.addEventListener("change", remeasure);
    mobile.addEventListener("change", remeasure);

    const observer = new ResizeObserver(() => {
      if (holdingSeat) return;
      remeasure();
    });
    observer.observe(slot);
    observer.observe(section);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", remeasure);
      reduce.removeEventListener("change", remeasure);
      mobile.removeEventListener("change", remeasure);
      observer.disconnect();
      clearFlyPin();
      fly.style.opacity = "";
      fly.style.visibility = "";
      fly.style.pointerEvents = "";
      const extraEl = extraElRef.current;
      if (extraEl) {
        extraEl.style.transform = "";
        extraEl.style.opacity = "";
        extraEl.style.visibility = "";
      }
    };
  }, [navId, extra]);

  return (
    <div
      ref={slotRef}
      className={
        extra
          ? "from-nav-mark from-nav-mark--stack mb-5"
          : "from-nav-mark mb-5 flex items-baseline justify-between gap-6"
      }
    >
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
      {extra ? (
        <p ref={extraElRef} className="from-nav-mark__extra">
          {extra}
        </p>
      ) : null}
    </div>
  );
}
