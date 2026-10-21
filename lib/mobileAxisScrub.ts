/**
 * Phone: once the editorial axis is moving (scroll down → content slides left),
 * a horizontal swipe scrubs the same runway — left advances, right reverses.
 * Covers albums → about → contact as one continuous scroll axis.
 * Vertical scroll always remains the primary driver.
 */

const MOBILE_MQ = "(max-width: 767px)";
/** Match ImageSeries MOBILE_SCROLL_VH. */
const SERIES_SCROLL_VH = 0.48;
/** Match About.tsx MOBILE_HANDOFF_VH / VISUAL_STEP_GAP. */
const ABOUT_HANDOFF_VH = 2.6;
const VISUAL_STEP_GAP = 1.9;
/** Unlock after a little downward travel on the album runway. */
const SERIES_UNLOCK = 0.02;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function isMobile() {
  return window.matchMedia(MOBILE_MQ).matches;
}

function seriesCoveringView() {
  const sticky = document.querySelector<HTMLElement>(".image-series__sticky");
  if (!sticky) return false;
  if (sticky.style.visibility === "hidden") return false;
  return sticky.getBoundingClientRect().bottom > window.innerHeight * 0.35;
}

/** Full scroll range of albums + about/contact runways. */
function axisBounds(): { min: number; max: number } | null {
  const viewH = window.innerHeight;
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

/**
 * True while the user is on the albums → about → contact axis
 * (after the first album slide has started).
 */
function axisActive(): boolean {
  if (!isMobile()) return false;
  const html = document.documentElement;
  if (html.classList.contains("series-expand-open")) return false;
  if (html.classList.contains("series-expand-nav-exit")) return false;
  if (html.classList.contains("series-viewer-open")) return false;

  const viewH = window.innerHeight;
  const series = document.querySelector<HTMLElement>(".image-series__panel");
  const about = document.querySelector<HTMLElement>(".about-handoff");

  if (series) {
    const top = series.getBoundingClientRect().top;
    const total = Math.max(series.offsetHeight - viewH, 1);
    if (top <= 12 && -top < total - 1) {
      const progress = clamp(-top / total, 0, 1);
      if (progress >= SERIES_UNLOCK) return true;
    }
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
  const viewH = window.innerHeight;
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
};

let bindCount = 0;
let touchScrub: TouchScrub | null = null;
let started = false;

function onTouchStart(event: TouchEvent) {
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
    if (Math.hypot(dx, dy) < 12) return;
    touchScrub.axis = Math.abs(dx) > Math.abs(dy) * 1.1 ? "h" : "v";
    if (touchScrub.axis === "v") return;
  }
  if (touchScrub.axis !== "h") return;

  if (!axisActive()) {
    touchScrub = null;
    return;
  }

  const bounds = axisBounds();
  if (!bounds) {
    touchScrub = null;
    return;
  }

  event.preventDefault();

  const dX = t.clientX - touchScrub.lastX;
  touchScrub.lastX = t.clientX;
  // Finger left → content further left → scroll down. Right reverses.
  const next = clamp(
    window.scrollY - dX * scrubGain(),
    bounds.min,
    bounds.max,
  );
  window.scrollTo({ top: next, behavior: "auto" });
}

function onTouchEnd(event: TouchEvent) {
  if (!touchScrub) return;
  for (let i = 0; i < event.changedTouches.length; i++) {
    if (event.changedTouches[i]?.identifier === touchScrub.id) {
      touchScrub = null;
      return;
    }
  }
}

function start() {
  if (started) return;
  started = true;
  window.addEventListener("touchstart", onTouchStart, {
    passive: true,
    capture: true,
  });
  window.addEventListener("touchmove", onTouchMove, {
    passive: false,
    capture: true,
  });
  window.addEventListener("touchend", onTouchEnd, {
    passive: true,
    capture: true,
  });
  window.addEventListener("touchcancel", onTouchEnd, {
    passive: true,
    capture: true,
  });
}

function stop() {
  if (!started) return;
  started = false;
  touchScrub = null;
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
