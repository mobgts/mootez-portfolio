export type TintStop = {
  id: string;
  paper: [number, number, number];
  wash: [number, number, number];
};

// Light olive through the hero → deep olive → beige → warm.
export const TINT_STOPS: TintStop[] = [
  { id: "top", paper: [182, 174, 128], wash: [150, 144, 98] },
  { id: "about", paper: [182, 174, 128], wash: [150, 144, 98] },
  { id: "image", paper: [160, 154, 108], wash: [126, 122, 80] },
  { id: "sound", paper: [142, 138, 94], wash: [108, 106, 68] },
  { id: "dev", paper: [204, 194, 160], wash: [178, 168, 130] },
  { id: "process", paper: [220, 208, 178], wash: [198, 186, 152] },
  { id: "contact", paper: [232, 220, 192], wash: [214, 200, 168] },
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

export function sampleTintAt(scrollY: number, viewH: number): {
  paper: [number, number, number];
  wash: [number, number, number];
} {
  // Read a bit above mid-viewport so the next stop arrives as the section does.
  const mid = viewH * 0.34;
  const points = TINT_STOPS.map((stop) => {
    const el =
      typeof document !== "undefined" ? document.getElementById(stop.id) : null;
    const top = el ? el.getBoundingClientRect().top + window.scrollY : 0;
    return { ...stop, top };
  }).sort((a, b) => a.top - b.top);

  const y = scrollY + mid;
  let i = 0;
  while (i < points.length - 1 && y >= points[i + 1].top) i += 1;

  const a = points[i];
  const b = points[Math.min(i + 1, points.length - 1)];
  const span = Math.max(1, b.top - a.top);
  const progress = a === b ? 0 : (y - a.top) / span;

  // Landing holds light olive; later stops ease on their own.
  const t = a === b ? 0 : smoothstep(progress);

  return {
    paper: mixRgb(a.paper, b.paper, t),
    wash: mixRgb(a.wash, b.wash, t),
  };
}
