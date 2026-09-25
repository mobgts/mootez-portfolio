export type TintStop = {
  id: string;
  paper: [number, number, number];
  wash: [number, number, number];
};

export type TintSample = {
  paper: [number, number, number];
  wash: [number, number, number];
};

// Studio olive — held soft through the story so scroll never snaps.
export const TINT_STOPS: TintStop[] = [
  { id: "top", paper: [182, 187, 111], wash: [147, 149, 73] },
  { id: "about", paper: [182, 187, 111], wash: [147, 149, 73] },
  { id: "sound", paper: [152, 164, 88], wash: [118, 128, 56] },
  { id: "dev", paper: [172, 170, 108], wash: [140, 138, 74] },
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

export function sampleTintAt(
  scrollY: number,
  viewH: number,
  stops: TintStop[] = TINT_STOPS,
): TintSample {
  // Sample a touch above mid-viewport so the next stop arrives with the section.
  const y = scrollY + viewH * 0.34;
  // Wide falloff so short sections (image) still crossfade over ~a viewport.
  const radius = Math.max(280, viewH * 0.9);

  const points = stops
    .map((stop, index) => {
      const el =
        typeof document !== "undefined" ? document.getElementById(stop.id) : null;
      const top = el
        ? el.getBoundingClientRect().top + window.scrollY
        : 1e9 + index;
      return { ...stop, top };
    })
    .filter((p) => p.top < 1e9)
    .sort((a, b) => a.top - b.top);

  if (points.length === 0) {
    const fallback = stops[0];
    return { paper: [...fallback.paper], wash: [...fallback.wash] };
  }

  let paper: [number, number, number] = [0, 0, 0];
  let wash: [number, number, number] = [0, 0, 0];
  let wSum = 0;

  for (const p of points) {
    const d = Math.abs(y - p.top);
    const w = smoothstep(1 - d / radius);
    if (w <= 0) continue;
    paper[0] += p.paper[0] * w;
    paper[1] += p.paper[1] * w;
    paper[2] += p.paper[2] * w;
    wash[0] += p.wash[0] * w;
    wash[1] += p.wash[1] * w;
    wash[2] += p.wash[2] * w;
    wSum += w;
  }

  if (wSum < 1e-6) {
    // Past the last stop (or before the first): hold the nearest end.
    const end = y <= points[0].top ? points[0] : points[points.length - 1];
    return { paper: [...end.paper], wash: [...end.wash] };
  }

  return {
    paper: [paper[0] / wSum, paper[1] / wSum, paper[2] / wSum],
    wash: [wash[0] / wSum, wash[1] / wSum, wash[2] / wSum],
  };
}
