export type TintStop = {
  id: string;
  paper: [number, number, number];
  wash: [number, number, number];
};

export type TintSample = {
  paper: [number, number, number];
  wash: [number, number, number];
};

// Studio olive — gentle monotonic grade so mobile scroll never snaps back.
export const TINT_STOPS: TintStop[] = [
  { id: "top", paper: [182, 187, 111], wash: [147, 149, 73] },
  { id: "sound", paper: [172, 180, 104], wash: [136, 142, 64] },
  { id: "dev", paper: [178, 176, 112], wash: [144, 142, 78] },
  { id: "about", paper: [190, 182, 124], wash: [156, 148, 92] },
  { id: "contact", paper: [210, 194, 148], wash: [180, 164, 118] },
];

export function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

export function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function smoothstep(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/** Document tops for tint stops — refreshed on layout, reused on scroll. */
const topCache = new Map<string, number>();
let topsDirty = true;

export function invalidateTintTops() {
  topsDirty = true;
}

function ensureTintTops(stops: TintStop[]) {
  if (typeof document === "undefined") return;
  if (!topsDirty) return;
  const scrollY = window.scrollY;
  let found = 0;
  for (const stop of stops) {
    const el = document.getElementById(stop.id);
    if (!el) {
      topCache.delete(stop.id);
      continue;
    }
    topCache.set(stop.id, el.getBoundingClientRect().top + scrollY);
    found += 1;
  }
  // Stay dirty until sections exist (avoids locking empty tops before hydrate).
  if (found > 0) topsDirty = false;
}

/** Call once from PageTint / HeroWarp so resize keeps the cache honest. */
export function bindTintTopInvalidation() {
  if (typeof window === "undefined") return () => {};
  const dirty = () => {
    topsDirty = true;
  };
  window.addEventListener("resize", dirty);
  const vv = window.visualViewport;
  vv?.addEventListener("resize", dirty);
  const ro = new ResizeObserver(dirty);
  ro.observe(document.documentElement);
  if (document.body) ro.observe(document.body);
  return () => {
    window.removeEventListener("resize", dirty);
    vv?.removeEventListener("resize", dirty);
    ro.disconnect();
  };
}

/**
 * Colour at a scroll position, graded between the two neighbouring sections.
 *
 * The blend runs on the *fraction* of the gap between two stops, never on a pixel
 * radius: mobile stacks the same sections much taller, and a fixed radius there
 * leaves the sample sitting on one pure stop for screens at a time, so the phone
 * and the desktop showed different colours for the same section. Proportional
 * means both walk the identical colour sequence, just stretched over more page.
 */
export function sampleTintAt(
  scrollY: number,
  viewH: number,
  stops: TintStop[] = TINT_STOPS,
): TintSample {
  // Sample a touch above mid-viewport so the next stop arrives with the section.
  const y = scrollY + viewH * 0.34;

  ensureTintTops(stops);

  const points = stops
    .map((stop, index) => {
      const top = topCache.get(stop.id);
      return {
        ...stop,
        top: top === undefined ? 1e9 + index : top,
      };
    })
    .filter((p) => p.top < 1e9)
    .sort((a, b) => a.top - b.top);

  if (points.length === 0) {
    const fallback = stops[0];
    return { paper: [...fallback.paper], wash: [...fallback.wash] };
  }

  const first = points[0];
  const last = points[points.length - 1];
  if (y <= first.top) return { paper: [...first.paper], wash: [...first.wash] };
  if (y >= last.top) return { paper: [...last.paper], wash: [...last.wash] };

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (y > b.top) continue;
    const span = Math.max(b.top - a.top, 1);
    const t = smoothstep((y - a.top) / span);
    return {
      paper: mixRgb(a.paper, b.paper, t),
      wash: mixRgb(a.wash, b.wash, t),
    };
  }

  return { paper: [...last.paper], wash: [...last.wash] };
}
