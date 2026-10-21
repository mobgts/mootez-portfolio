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

/**
 * Section title that peels off the matching nav label on scroll —
 * desktop rail or mobile sticky nav — then settles into the section seat.
 * Hidden until the beat starts so titles don't ghost over the nav.
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

    let raf = 0;
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

    /** Freeze nav word + in-flow seat size once per peel. */
    const beginDesktopPeel = () => {
      clearFlyPin();
      const box = fly.getBoundingClientRect();
      seatSize = { width: box.width, height: box.height };
      holdingSeat = true;
      slot.style.height = `${Math.max(box.height, 1)}px`;
      // Prefer rail when visible; readNavOrigin skips display:none rail on phone.
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

      const vh = window.innerHeight;
      // Live section top — always aims at the real seat, no stale cache.
      const secTop = section.getBoundingClientRect().top;

      // Same peel window on phone + desktop; origin comes from rail or sticky nav.
      const start = mobile.matches ? vh * 1.0 : vh * 1.05;
      const end = mobile.matches ? vh * 0.22 : vh * 0.28;
      const raw = clamp01((start - secTop) / Math.max(start - end, 1));
      const p = easeInOutCubic(raw);
      const leave = 1 - p;

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

      // Peel from the matching nav word (rail on desktop, sticky nav on phone).
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
      // Above nav chrome while peeling (rail z-45 / sticky nav z-70).
      fly.style.zIndex = mobile.matches ? "75" : "50";
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
