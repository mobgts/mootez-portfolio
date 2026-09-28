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
    if (node.closest(".site-nav.is-exited")) continue;

    const rect = node.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    if (rect.bottom < 0 || rect.top > window.innerHeight) continue;

    const style = getComputedStyle(node);
    if (style.visibility === "hidden" || style.opacity === "0") continue;

    return node;
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
 * Section title that peels off the matching left-rail / sticky-nav label on
 * scroll, while the nav label itself stays put.
 * On mobile, titles gather at mid-viewport then settle into the section — story beat.
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

    /** Resting geometry in document space, so a scroll needs no layout read. */
    type Rest = {
      docTop: number;
      left: number;
      width: number;
      height: number;
      secDocTop: number;
    };

    let rest: Rest | null = null;
    let occluders: Box[] = [];
    let raf = 0;
    let flying = false;
    /** Last state written, so a settled title stops touching the DOM. */
    let written = "";

    // Reading the box meant writing `transform: none` and reading it straight
    // back, which forces a synchronous layout. Once per layout change, not once
    // per frame, is the difference between smooth and stuttering on a phone.
    const measureRest = () => {
      const previous = fly.style.transform;
      fly.style.transform = "none";
      const box = fly.getBoundingClientRect();
      fly.style.transform = previous;

      const section = slot.closest("section");
      const sectionBox = (section ?? slot).getBoundingClientRect();
      const scrollY = window.scrollY;

      rest = {
        docTop: box.top + scrollY,
        left: box.left,
        width: box.width,
        height: box.height,
        secDocTop: sectionBox.top + scrollY,
      };
    };

    const measureOccluders = () => {
      const scrollY = window.scrollY;
      occluders = [];
      for (const card of document.querySelectorAll<HTMLElement>(OCCLUDER_SEL)) {
        // Ignore empty surfaces and our own mark subtree.
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

    /** True when the flying title box still sits over a card / media surface. */
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

    const paint = () => {
      const extraEl = extraElRef.current;

      if (reduce.matches) {
        if (written === "reduce") return;
        written = "reduce";
        fly.style.transform = "";
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

      if (!rest) measureRest();
      if (!rest) return;

      const scrollY = window.scrollY;
      const vh = window.innerHeight;
      const secTop = rest.secDocTop - scrollY;
      const restTop = rest.docTop - scrollY;

      // Start peeling as the section enters; land by the time the title seat is comfy.
      // Mobile: longer window so the mid-screen → seat beat can read as a story.
      const start = mobile.matches ? vh * 0.95 : vh * 0.9;
      const end = mobile.matches ? vh * 0.18 : vh * 0.22;
      const raw = clamp01((start - secTop) / Math.max(start - end, 1));
      const p = easeOutCubic(raw);
      const leave = 1 - p;

      // Cards can open and close between passes, so refresh their boxes on the way in.
      if (raw > 0 && !flying) measureOccluders();
      flying = raw > 0;

      if (mobile.matches) {
        // Only the active section plays the mid-screen beat — others stay hidden
        // so names don't stack/ghost in the middle.
        if (raw <= 0) {
          if (written === "hidden") return;
          written = "hidden";
          fly.style.opacity = "0";
          fly.style.visibility = "hidden";
          fly.style.pointerEvents = "none";
          if (extraEl) {
            extraEl.style.opacity = "0";
            extraEl.style.visibility = "hidden";
          }
          return;
        }

        // Story beat: title materializes at mid-viewport, then settles into the section.
        const midX = window.innerWidth * 0.5 - rest.width * 0.5;
        const midY = vh * 0.42 - rest.height * 0.5;
        const dx = midX - rest.left;
        const dy = midY - restTop;
        const s = 0.92 + 0.08 * p;

        const visX = rest.left + dx * leave;
        const visY = restTop + dy * leave;
        const behind = occluded(
          visX,
          visY + scrollY,
          rest.width * s,
          rest.height * s,
        );

        const transform = `translate3d(${(dx * leave).toFixed(2)}px, ${(dy * leave).toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
        // Stay fully transparent while the glyph still overlaps a card.
        const shown = behind ? 0 : p;
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

      // Settled: identity transform at full opacity, so skip the nav-origin lookup.
      const origin = leave > 0.001 ? findNavOrigin(navId) : null;
      if (!origin) {
        if (written === "rest") return;
        written = "rest";
        fly.style.transform = "";
        fly.style.opacity = "1";
        fly.style.visibility = "";
        if (extraEl) {
          extraEl.style.transform = "";
          extraEl.style.opacity = "1";
          extraEl.style.visibility = "";
        }
        return;
      }

      const from = origin.getBoundingClientRect();

      // Pin top-left of the title to the nav word, then ease into place.
      const dx = from.left - rest.left;
      const dy = from.top - restTop;
      const sx = from.width / Math.max(rest.width, 1);
      const sy = from.height / Math.max(rest.height, 1);
      const s = 1 + ((sx + sy) * 0.5 - 1) * leave;

      const transform = `translate3d(${(dx * leave).toFixed(2)}px, ${(dy * leave).toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
      // Fully on the word at the start of the peel, then settle at rest.
      const opacity = clamp01(0.55 + p * 0.45);
      const key = `d|${transform}|${opacity.toFixed(4)}`;
      if (written === key) return;
      written = key;

      fly.style.visibility = "visible";
      fly.style.transformOrigin = "left top";
      fly.style.transform = transform;
      fly.style.opacity = String(opacity);

      // Extra trails the peel and rises from behind the section card.
      if (extraEl) {
        const reveal = clamp01((p - 0.12) / 0.88);
        extraEl.style.visibility = "visible";
        extraEl.style.transform = `translate3d(0, ${((1 - reveal) * 64).toFixed(2)}px, 0)`;
        extraEl.style.opacity = String(reveal);
      }
    };

    // One paint per frame at most, and only for frames where something moved.
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        paint();
      });
    };

    const remeasure = () => {
      rest = null;
      written = "";
      measureOccluders();
      schedule();
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", remeasure);
    reduce.addEventListener("change", remeasure);
    mobile.addEventListener("change", remeasure);

    const observer = new ResizeObserver(remeasure);
    observer.observe(slot);
    const section = slot.closest("section");
    if (section) observer.observe(section);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", remeasure);
      reduce.removeEventListener("change", remeasure);
      mobile.removeEventListener("change", remeasure);
      observer.disconnect();
      fly.style.transform = "";
      fly.style.opacity = "";
      fly.style.transformOrigin = "";
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
