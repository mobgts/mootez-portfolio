/**
 * Phone pager. The document never scrolls on phones: one visual axis runs
 * through every album shot, then About, then Contact (same units as the
 * ImageSeries playhead — one unit is one frame spacing on screen).
 *
 * Any one-finger drag, horizontal or vertical, moves the axis with the finger;
 * release springs to a stop. Nav, wheel and arrow keys animate the same
 * position, and a touch always catches a running animation.
 */

const PAGER_MQ = "(max-width: 767px)";
/** Finger travel (px) before a touch counts as a drag instead of a tap. */
const AXIS_LOCK_PX = 8;
/** Finger speed (px/ms) that commits to the next stop regardless of distance. */
const FLICK_PX_MS = 0.3;
/** Velocity sample window (ms). */
const SAMPLE_MS = 100;
/** Slow drag past this share of the gap commits to the neighbour. */
const COMMIT_SHARE = 0.3;
/** Drag past the first / last stop moves at this fraction of the finger. */
const EDGE_RESIST = 0.35;
/** Critically damped spring — settles in ~0.5s without bounce. */
const STIFFNESS = 180;
const DAMPING = 2 * Math.sqrt(STIFFNESS);
/** Axis units per second. */
const MAX_FLICK_V = 14;
/** Nav into About/Contact from an open album — matches the scatter leave. */
const ARRIVE_MS = 820;
/** How far before the target an arrive starts (axis units). */
const ARRIVE_LEAD = 0.85;
const STOP_EPS = 0.02;

export type PagerTarget = "home" | "about" | "contact";

export type PagerAxis = {
  /** Sorted axis positions the pager may rest on (shots, About, Contact). */
  stops: number[];
  about: number;
  contact: number;
  /** First shot of each album, by album id. */
  albumStarts: Record<string, number>;
  /** Screen px per axis unit — the frame spacing. */
  unitPx: () => number;
};

type Motion =
  | { kind: "spring"; target: number; v: number; last: number }
  | {
      kind: "tween";
      from: number;
      to: number;
      start: number;
      duration: number;
    };

type Drag = {
  id: number;
  x0: number;
  y0: number;
  pos0: number;
  axis: "pending" | "x" | "y";
  caught: boolean;
  samples: { t: number; p: number }[];
};

let axis: PagerAxis | null = null;
let pos = 0;
let motion: Motion | null = null;
let raf = 0;
let drag: Drag | null = null;
let suppressClickUntil = 0;
let mql: MediaQueryList | null = null;
let wheelAcc = 0;
let wheelLast = 0;
let wheelLockUntil = 0;
let wheelLockCap = 0;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function media() {
  if (!mql) mql = window.matchMedia(PAGER_MQ);
  return mql;
}

function reduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isPagerActive() {
  return typeof window !== "undefined" && axis !== null && media().matches;
}

/** Current axis position (same units as the ImageSeries playhead). */
export function getPagerPos() {
  return pos;
}

/** Axis distance from About: negative while albums show, gap at Contact. */
export function getPagerAboutDelta() {
  return axis ? pos - axis.about : -Infinity;
}

/** 0 = albums, 1 = About, 2 = Contact — continuous in between. */
export function getPagerSection() {
  if (!axis) return 0;
  const gap = Math.max(axis.contact - axis.about, 0.001);
  return clamp(1 + (pos - axis.about) / gap, 0, 2);
}

function overlayOpen() {
  const html = document.documentElement;
  return (
    html.classList.contains("series-expand-open") ||
    html.classList.contains("series-expand-nav-exit") ||
    html.classList.contains("series-viewer-open")
  );
}

function bounds() {
  const stops = axis?.stops ?? [0];
  return { min: stops[0] ?? 0, max: stops[stops.length - 1] ?? 0 };
}

function nearestStop(v: number) {
  const stops = axis?.stops ?? [0];
  let best = stops[0] ?? 0;
  for (const s of stops) {
    if (Math.abs(s - v) < Math.abs(best - v)) best = s;
  }
  return best;
}

/** First stop strictly past `v` in `dir`; the end stop when there is none. */
function stopBeyond(v: number, dir: number) {
  const stops = axis?.stops ?? [0];
  if (dir > 0) {
    for (const s of stops) if (s > v + STOP_EPS) return s;
    return stops[stops.length - 1] ?? v;
  }
  for (let i = stops.length - 1; i >= 0; i--) {
    if (stops[i] < v - STOP_EPS) return stops[i];
  }
  return stops[0] ?? v;
}

function stopMotion() {
  motion = null;
  if (raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
}

function frame(now: number) {
  raf = 0;
  const m = motion;
  if (!m) return;

  if (m.kind === "tween") {
    const t = clamp((now - m.start) / m.duration, 0, 1);
    pos = m.from + (m.to - m.from) * easeInOutCubic(t);
    if (t >= 1) {
      pos = m.to;
      motion = null;
      return;
    }
  } else {
    const dt = Math.min((now - m.last) / 1000, 1 / 20);
    m.last = now;
    const h = dt / 2;
    for (let i = 0; i < 2; i++) {
      const a = -STIFFNESS * (pos - m.target) - DAMPING * m.v;
      m.v += a * h;
      pos += m.v * h;
    }
    if (Math.abs(pos - m.target) < 0.0006 && Math.abs(m.v) < 0.02) {
      pos = m.target;
      motion = null;
      return;
    }
  }
  raf = requestAnimationFrame(frame);
}

function run() {
  if (!raf) raf = requestAnimationFrame(frame);
}

function springTo(target: number, velocity = 0) {
  stopMotion();
  motion = {
    kind: "spring",
    target,
    v: clamp(velocity, -MAX_FLICK_V, MAX_FLICK_V),
    last: performance.now(),
  };
  run();
}

function tweenTo(target: number, duration: number) {
  stopMotion();
  if (Math.abs(target - pos) < 0.0005) {
    pos = target;
    return;
  }
  motion = {
    kind: "tween",
    from: pos,
    to: target,
    start: performance.now(),
    duration,
  };
  run();
}

function targetPos(target: PagerTarget) {
  if (!axis) return 0;
  if (target === "about") return axis.about;
  if (target === "contact") return axis.contact;
  return axis.stops[0] ?? 0;
}

/**
 * Animate to Home / About / Contact.
 * - `instant`: jump (reduced motion).
 * - `arrive`: start just short of the target so it slides in on its own,
 *   timed with the album scatter leaving.
 */
export function pagerGoTo(
  target: PagerTarget,
  opts: { instant?: boolean; arrive?: boolean } = {},
) {
  if (!axis) return;
  const to = targetPos(target);
  if (opts.instant) {
    stopMotion();
    pos = to;
    return;
  }
  if (opts.arrive) {
    stopMotion();
    pos = to - ARRIVE_LEAD;
    tweenTo(to, ARRIVE_MS);
    return;
  }
  const dist = Math.abs(to - pos);
  tweenTo(to, Math.min(650 + 140 * Math.sqrt(dist), 1300));
}

/** Park on an album's first shot (under the expand cover — no animation). */
export function pagerJumpToAlbum(albumId: string) {
  const start = axis?.albumStarts[albumId];
  if (start === undefined) return;
  stopMotion();
  pos = start;
}

function step(dir: number) {
  const from = motion
    ? motion.kind === "spring"
      ? motion.target
      : motion.to
    : nearestStop(pos);
  const to = stopBeyond(from, dir);
  if (to === from) return;
  if (reduceMotion()) {
    stopMotion();
    pos = to;
    return;
  }
  springTo(to, motion?.kind === "spring" ? motion.v : 0);
}

function isPagerSurface(target: EventTarget | null) {
  return target instanceof Element && !!target.closest(".story-page");
}

function onPointerDown(event: PointerEvent) {
  if (!isPagerActive() || overlayOpen()) return;
  if (!event.isPrimary) {
    // Second finger: drop the drag and settle where we are.
    if (drag) {
      drag = null;
      springTo(nearestStop(pos));
    }
    return;
  }
  if (event.pointerType === "mouse" && event.button !== 0) return;
  if (!isPagerSurface(event.target)) return;

  const caught = motion !== null;
  stopMotion();
  drag = {
    id: event.pointerId,
    x0: event.clientX,
    y0: event.clientY,
    pos0: pos,
    axis: "pending",
    caught,
    samples: [],
  };
}

function onPointerMove(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id) return;
  const dx = event.clientX - drag.x0;
  const dy = event.clientY - drag.y0;

  if (drag.axis === "pending") {
    if (Math.hypot(dx, dy) < AXIS_LOCK_PX) return;
    drag.axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
  }

  const travel = drag.axis === "x" ? dx : dy;
  const unit = Math.max(axis?.unitPx() ?? 1, 1);
  const { min, max } = bounds();
  // Finger left / up advances — content follows the finger.
  let next = drag.pos0 - travel / unit;
  if (next < min) next = min - (min - next) * EDGE_RESIST;
  else if (next > max) next = max + (next - max) * EDGE_RESIST;
  pos = next;

  const now = event.timeStamp;
  drag.samples.push({ t: now, p: drag.axis === "x" ? event.clientX : event.clientY });
  while (drag.samples.length > 2 && now - drag.samples[0].t > SAMPLE_MS) {
    drag.samples.shift();
  }
}

function release(event: PointerEvent, cancelled: boolean) {
  const d = drag;
  if (!d || event.pointerId !== d.id) return;
  drag = null;

  if (d.axis === "pending") {
    // Tap. If it caught a moving axis, just settle and swallow the click.
    if (d.caught) {
      suppressClickUntil = performance.now() + 400;
      springTo(nearestStop(pos));
    }
    return;
  }

  suppressClickUntil = performance.now() + 400;
  const unit = Math.max(axis?.unitPx() ?? 1, 1);

  let vPx = 0;
  const first = d.samples[0];
  const last = d.samples[d.samples.length - 1];
  if (!cancelled && first && last && last.t > first.t) {
    // Finger paused before lifting — no flick.
    if (event.timeStamp - last.t < 80) vPx = (last.p - first.p) / (last.t - first.t);
  }
  const vAxis = -vPx / unit;

  const startStop = nearestStop(d.pos0);
  let target: number;
  if (Math.abs(vPx) > FLICK_PX_MS) {
    target = stopBeyond(pos, Math.sign(vAxis));
  } else {
    target = nearestStop(pos);
    const dir = Math.sign(pos - startStop);
    if (target === startStop && dir !== 0) {
      const neighbour = stopBeyond(startStop, dir);
      const gap = Math.abs(neighbour - startStop);
      if (gap > 0 && Math.abs(pos - startStop) / gap > COMMIT_SHARE) {
        target = neighbour;
      }
    }
  }
  springTo(target, vAxis * 1000);
}

function onPointerUp(event: PointerEvent) {
  release(event, false);
}

function onPointerCancel(event: PointerEvent) {
  release(event, true);
}

function onClickCapture(event: MouseEvent) {
  if (performance.now() > suppressClickUntil) return;
  suppressClickUntil = 0;
  event.preventDefault();
  event.stopPropagation();
}

function onWheel(event: WheelEvent) {
  if (!isPagerActive() || overlayOpen()) return;
  if (!isPagerSurface(event.target)) return;
  const now = performance.now();
  if (now < wheelLockUntil) {
    // Trackpad inertia keeps firing — hold the lock while it does.
    wheelLockUntil = Math.min(now + 160, wheelLockCap);
    return;
  }
  if (now - wheelLast > 200) wheelAcc = 0;
  wheelLast = now;
  wheelAcc +=
    Math.abs(event.deltaY) >= Math.abs(event.deltaX)
      ? event.deltaY
      : event.deltaX;
  if (Math.abs(wheelAcc) < 30) return;
  step(Math.sign(wheelAcc));
  wheelAcc = 0;
  wheelLockUntil = now + 450;
  wheelLockCap = now + 900;
}

function onKeyDown(event: KeyboardEvent) {
  if (!isPagerActive() || overlayOpen()) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const el = event.target;
  if (
    el instanceof HTMLElement &&
    (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
  ) {
    return;
  }
  const { min, max } = bounds();
  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
    case "PageDown":
      step(1);
      break;
    case "ArrowLeft":
    case "ArrowUp":
    case "PageUp":
      step(-1);
      break;
    case "Home":
      springTo(min);
      break;
    case "End":
      springTo(max);
      break;
    default:
      return;
  }
  event.preventDefault();
}

function onMediaChange() {
  stopMotion();
  drag = null;
  // Entering the pager mid-page: the document can't scroll any more.
  if (media().matches) window.scrollTo(0, 0);
}

function bind() {
  window.addEventListener("pointerdown", onPointerDown, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerup", onPointerUp, { passive: true });
  window.addEventListener("pointercancel", onPointerCancel, { passive: true });
  window.addEventListener("click", onClickCapture, true);
  window.addEventListener("wheel", onWheel, { passive: true });
  window.addEventListener("keydown", onKeyDown);
  media().addEventListener("change", onMediaChange);
}

function unbind() {
  window.removeEventListener("pointerdown", onPointerDown);
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  window.removeEventListener("pointercancel", onPointerCancel);
  window.removeEventListener("click", onClickCapture, true);
  window.removeEventListener("wheel", onWheel);
  window.removeEventListener("keydown", onKeyDown);
  media().removeEventListener("change", onMediaChange);
}

/** ImageSeries owns the axis layout; the pager runs while it's mounted. */
export function registerPagerAxis(next: PagerAxis) {
  const first = axis === null;
  axis = next;
  if (first) {
    bind();
    const hash = window.location.hash;
    if (hash === "#about") pos = next.about;
    else if (hash === "#contact") pos = next.contact;
    else pos = next.stops[0] ?? 0;
    if (media().matches) window.scrollTo(0, 0);
  }
  return () => {
    if (axis !== next) return;
    stopMotion();
    drag = null;
    axis = null;
    unbind();
  };
}
