/**
 * Phone: a horizontal swipe scrubs the same runway vertical scroll drives —
 * finger left advances, right reverses — across albums → about → contact.
 * A flick keeps gliding after release so the motion stays continuous.
 *
 * Listeners are passive: `touch-action: pan-y` on body (globals.css) already
 * keeps the browser from claiming horizontal travel, so native vertical
 * scroll never waits on this script.
 */

import { viewportH } from "@/lib/viewport";

const MOBILE_MQ = "(max-width: 767px)";
/** Match ImageSeries MOBILE_SCROLL_VH. */
const SERIES_SCROLL_VH = 0.48;
/** Match About.tsx MOBILE_HANDOFF_VH / VISUAL_STEP_GAP. */
const ABOUT_HANDOFF_VH = 2.6;
const VISUAL_STEP_GAP = 1.9;
/** Finger travel (px) before the gesture picks an axis. */
const AXIS_LOCK_PX = 10;
/** Velocity window for the release flick (ms). */
const FLICK_SAMPLE_MS = 90;
/** Per-16ms velocity retention while gliding. */
const GLIDE_FRICTION = 0.94;
/** px/ms — stop gliding below this. */
const GLIDE_MIN_V = 0.02;
const GLIDE_MAX_V = 3;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function isMobile() {
  return window.matchMedia(MOBILE_MQ).matches;
}

function overlayOpen() {
  const html = document.documentElement;
  return (
    html.classList.contains("series-expand-open") ||
    html.classList.contains("series-expand-nav-exit") ||
    html.classList.contains("series-viewer-open")
  );
}

function seriesCoveringView() {
  const sticky = document.querySelector<HTMLElement>(".image-series__sticky");
  if (!sticky) return false;
  if (sticky.style.visibility === "hidden") return false;
  return sticky.getBoundingClientRect().bottom > viewportH() * 0.35;
}

/** Full scroll range of albums + about/contact runways. */
function axisBounds(): { min: number; max: number } | null {
  const viewH = viewportH();
  const series = document.querySelector<HTMLElement>(".image-series__panel");
  const about = document.querySelector<HTMLElement>(".about-handoff");
  let min = Infinity;
  let max = -Infinity;

  for (const panel of [series, about]) {
    if (!panel) continue;
    const top = panel.getBoundingClientRect().top + window.scrollY;
    min = Math.min(min, top);
    max = Math.max(max, top + Math.max(panel.offsetHeight - viewH, 0));
  }

  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return null;
  }
  return { min, max };
}

/** True while the albums → about → contact axis owns the screen (landing included). */
function axisActive(): boolean {
  if (!isMobile() || overlayOpen()) return false;

  const viewH = viewportH();
  const series = document.querySelector<HTMLElement>(".image-series__panel");
  const about = document.querySelector<HTMLElement>(".about-handoff");

  if (series) {
    const top = series.getBoundingClientRect().top;
    const total = Math.max(series.offsetHeight - viewH, 1);
    if (top <= 12 && -top < total - 1) return true;
  }

  if (about && !seriesCoveringView()) {
    const top = about.getBoundingClientRect().top;
    const total = Math.max(about.offsetHeight - viewH, 1);
    if (top <= 16 && top > -total + 1) return true;
  }

  return false;
}

/** Scroll px per finger-px left — tuned to the section currently on screen. */
function scrubGain(): number {
  const viewH = viewportH();
  const iw = window.innerWidth;

  if (seriesCoveringView()) {
    // Keep in sync with ImageSeries mobile spacing.
    const spacing = Math.min(iw * 0.78, 340);
    return (SERIES_SCROLL_VH * viewH) / Math.max(spacing * 0.9, 1);
  }

  const spacing = Math.min(iw * 0.88, 380);
  const scrollPerStep = (ABOUT_HANDOFF_VH / VISUAL_STEP_GAP) * viewH;
  return scrollPerStep / Math.max(spacing * 0.9, 1);
}

type TouchScrub = {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  axis: "pending" | "h" | "v";
  bounds: { min: number; max: number } | null;
  samples: { t: number; x: number }[];
};

let bindCount = 0;
let touchScrub: TouchScrub | null = null;
let started = false;
let glideRaf = 0;

function stopGlide() {
  if (glideRaf) {
    cancelAnimationFrame(glideRaf);
    glideRaf = 0;
  }
}

function scrubBy(fingerDx: number, bounds: { min: number; max: number }) {
  // Finger left → content further left → scroll down. Right reverses.
  const next = clamp(
    window.scrollY - fingerDx * scrubGain(),
    bounds.min,
    bounds.max,
  );
  window.scrollTo({ top: next, behavior: "auto" });
  return next;
}

/** Continue the swipe with decaying velocity (px/ms of finger travel). */
function glide(velocity: number, bounds: { min: number; max: number }) {
  stopGlide();
  let v = clamp(velocity, -GLIDE_MAX_V, GLIDE_MAX_V);
  if (Math.abs(v) < GLIDE_MIN_V) return;
  let last = performance.now();

  const step = (now: number) => {
    const dt = Math.min(now - last, 40);
    last = now;
    if (overlayOpen()) {
      glideRaf = 0;
      return;
    }
    const next = scrubBy(v * dt, bounds);
    v *= Math.pow(GLIDE_FRICTION, dt / 16);
    const hitEdge = next <= bounds.min || next >= bounds.max;
    if (Math.abs(v) < GLIDE_MIN_V || hitEdge) {
      glideRaf = 0;
      return;
    }
    glideRaf = requestAnimationFrame(step);
  };

  glideRaf = requestAnimationFrame(step);
}

function onTouchStart(event: TouchEvent) {
  stopGlide();
  if (!axisActive()) {
    touchScrub = null;
    return;
  }
  const t = event.changedTouches[0];
  if (!t) return;
  touchScrub = {
    id: t.identifier,
    startX: t.clientX,
    startY: t.clientY,
    lastX: t.clientX,
    axis: "pending",
    bounds: null,
    samples: [{ t: event.timeStamp, x: t.clientX }],
  };
}

function onTouchMove(event: TouchEvent) {
  if (!touchScrub) return;
  let t: Touch | undefined;
  for (let i = 0; i < event.touches.length; i++) {
    if (event.touches[i]?.identifier === touchScrub.id) {
      t = event.touches[i];
      break;
    }
  }
  if (!t) return;

  const dx = t.clientX - touchScrub.startX;
  const dy = t.clientY - touchScrub.startY;

  if (touchScrub.axis === "pending") {
    if (Math.hypot(dx, dy) < AXIS_LOCK_PX) return;
    touchScrub.axis = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    if (touchScrub.axis === "v") return;
    touchScrub.bounds = axisBounds();
    // Count the lock distance too so the scrub doesn't feel like it lags.
    touchScrub.lastX = touchScrub.startX;
  }
  if (touchScrub.axis !== "h" || !touchScrub.bounds || overlayOpen()) return;

  const dX = t.clientX - touchScrub.lastX;
  touchScrub.lastX = t.clientX;
  scrubBy(dX, touchScrub.bounds);

  const now = event.timeStamp;
  touchScrub.samples.push({ t: now, x: t.clientX });
  while (
    touchScrub.samples.length > 2 &&
    now - touchScrub.samples[0].t > FLICK_SAMPLE_MS
  ) {
    touchScrub.samples.shift();
  }
}

function onTouchEnd(event: TouchEvent) {
  if (!touchScrub) return;
  for (let i = 0; i < event.changedTouches.length; i++) {
    if (event.changedTouches[i]?.identifier !== touchScrub.id) continue;
    const scrub = touchScrub;
    touchScrub = null;
    if (event.type === "touchend" && scrub.axis === "h" && scrub.bounds) {
      const first = scrub.samples[0];
      const last = scrub.samples[scrub.samples.length - 1];
      const dt = last.t - first.t;
      // Finger stopped before lifting — no flick.
      if (dt > 0 && event.timeStamp - last.t < 60) {
        glide((last.x - first.x) / dt, scrub.bounds);
      }
    }
    return;
  }
}

function start() {
  if (started) return;
  started = true;
  const opts = { passive: true, capture: true } as const;
  window.addEventListener("touchstart", onTouchStart, opts);
  window.addEventListener("touchmove", onTouchMove, opts);
  window.addEventListener("touchend", onTouchEnd, opts);
  window.addEventListener("touchcancel", onTouchEnd, opts);
}

function stop() {
  if (!started) return;
  started = false;
  touchScrub = null;
  stopGlide();
  window.removeEventListener("touchstart", onTouchStart, true);
  window.removeEventListener("touchmove", onTouchMove, true);
  window.removeEventListener("touchend", onTouchEnd, true);
  window.removeEventListener("touchcancel", onTouchEnd, true);
}

/** Ref-counted bind — safe from ImageSeries + About. */
export function bindMobileAxisScrub() {
  bindCount += 1;
  if (bindCount === 1) start();
  return () => {
    bindCount = Math.max(0, bindCount - 1);
    if (bindCount === 0) stop();
  };
}
