import {
  mixRgb,
  sampleTintAt,
  sampleTintAtSection,
  TINT_STOPS,
  type TintSample,
  type TintStop,
} from "./tints";

const PAPER: [number, number, number] = [252, 250, 247];
const CREAM: [number, number, number] = [248, 241, 228];
const CREAM_DEEP: [number, number, number] = [245, 236, 220];
const WARM_CREAM: [number, number, number] = [250, 238, 224];
const WARM_CREAM_DEEP: [number, number, number] = [248, 232, 214];

// Soft paper up top; creamier field once about / contact arrive.
export const CREAM_TINT_STOPS: TintStop[] = [
  { id: "top", paper: PAPER, wash: PAPER },
  { id: "sound", paper: PAPER, wash: PAPER },
  { id: "dev", paper: PAPER, wash: PAPER },
  { id: "about", paper: CREAM, wash: CREAM },
  { id: "contact", paper: CREAM_DEEP, wash: CREAM_DEEP },
];

export const WARM_TINT_STOPS: TintStop[] = [
  { id: "top", paper: PAPER, wash: PAPER },
  { id: "sound", paper: PAPER, wash: PAPER },
  { id: "dev", paper: PAPER, wash: PAPER },
  { id: "about", paper: WARM_CREAM, wash: WARM_CREAM },
  { id: "contact", paper: WARM_CREAM_DEEP, wash: WARM_CREAM_DEEP },
];

/** Olive is fully reached at this slider position; past it → warm. */
const OLIVE_AT = 0.8;

/** Slider 0 starts at 35% tint; 1 stays full. */
const COLOR_FLOOR = 0.35;

/** Tint knob caps at notch 5/6 (full olive) — warm apricot is out of reach. */
export const COLOR_CEILING = 0.8;

/** Map slider 0–1 onto the live tint range (floored at 35%). */
export function mapVibeColor(warmth: number) {
  const t = clamp01(warmth);
  return COLOR_FLOOR + t * (1 - COLOR_FLOOR);
}

// Accents on white — soft olive / apricot (paper stays white).
const ACCENT_CREAM: [number, number, number] = [88, 86, 80];
const ACCENT_CREAM_DEEP: [number, number, number] = [48, 46, 42];
const ACCENT_OLIVE: [number, number, number] = [158, 152, 88];
const ACCENT_OLIVE_DEEP: [number, number, number] = [108, 102, 52];
const ACCENT_WARM: [number, number, number] = [240, 132, 98];
const ACCENT_WARM_DEEP: [number, number, number] = [210, 86, 64];

const OLIVE_AT_CREAM: [number, number, number] = [120, 118, 110];
const OLIVE_AT_OLIVE: [number, number, number] = [145, 148, 78];
const OLIVE_AT_WARM: [number, number, number] = [186, 138, 92];
const OLIVE_DEEP_CREAM: [number, number, number] = [72, 70, 64];
const OLIVE_DEEP_OLIVE: [number, number, number] = [93, 94, 46];
const OLIVE_DEEP_WARM: [number, number, number] = [128, 84, 54];
const MUTED_CREAM: [number, number, number] = [118, 116, 110];
const MUTED_OLIVE: [number, number, number] = [108, 111, 81];
const MUTED_WARM: [number, number, number] = [132, 108, 88];

/** Slider max is 80% of the previous silk intensity ceiling. */
const SILK_CEILING = 0.64;

function mapSilkAmount(silk: number) {
  return clamp01(silk) * SILK_CEILING;
}

export type VibeState = {
  /** 0 = clean cream … COLOR_CEILING (0.8) = studio olive (notch 5) */
  color: number;
  /** 0 = calm silk, 1 = lively silk */
  silk: number;
};

type Listener = (v: VibeState) => void;

/** Notch defaults: tint = 4/6 → 0.6, movement = 2/6 → 0.2 */
let state: VibeState = { color: 0.6, silk: 0.2 };
const listeners = new Set<Listener>();

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function notify() {
  for (const fn of listeners) fn(state);
}

export function getVibe(): VibeState {
  return state;
}

export function setVibeColor(value: number) {
  const next = Math.min(COLOR_CEILING, clamp01(value));
  if (next === state.color) return;
  state = { ...state, color: next };
  notify();
}

export function setVibeSilk(value: number) {
  const next = clamp01(value);
  if (next === state.silk) return;
  state = { ...state, silk: next };
  notify();
}

export function subscribeVibe(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Progress toward full olive along the 0→OLIVE_AT range. */
function oliveProgress(t: number) {
  return clamp01(clamp01(t) / OLIVE_AT);
}

/** Piecewise: cream→olive to 80%, then olive→warm. */
function mixTintTripod(
  cream: TintSample,
  olive: TintSample,
  warm: TintSample,
  t: number,
): TintSample {
  const x = clamp01(t);
  if (x <= OLIVE_AT) {
    const u = oliveProgress(x);
    return {
      paper: mixRgb(cream.paper, olive.paper, u),
      wash: mixRgb(cream.wash, olive.wash, u),
    };
  }
  const u = (x - OLIVE_AT) / (1 - OLIVE_AT);
  return {
    paper: mixRgb(olive.paper, warm.paper, u),
    wash: mixRgb(olive.wash, warm.wash, u),
  };
}

function mixAccentTripod<T extends [number, number, number]>(
  cream: T,
  olive: T,
  warm: T,
  t: number,
): [number, number, number] {
  const x = clamp01(t);
  if (x <= OLIVE_AT) {
    return mixRgb(cream, olive, oliveProgress(x));
  }
  return mixRgb(olive, warm, (x - OLIVE_AT) / (1 - OLIVE_AT));
}

export function sampleVibeTintAt(
  scrollY: number,
  viewH: number,
  warmth = state.color,
): TintSample {
  const cream = sampleTintAt(scrollY, viewH, CREAM_TINT_STOPS);
  const olive = sampleTintAt(scrollY, viewH, TINT_STOPS);
  const warm = sampleTintAt(scrollY, viewH, WARM_TINT_STOPS);
  return mixTintTripod(cream, olive, warm, mapVibeColor(warmth));
}

/** Phone pager: 0 = albums, 1 = about, 2 = contact. */
export function sampleVibeTintAtSection(
  section: number,
  warmth = state.color,
): TintSample {
  const cream = sampleTintAtSection(section, CREAM_TINT_STOPS);
  const olive = sampleTintAtSection(section, TINT_STOPS);
  const warm = sampleTintAtSection(section, WARM_TINT_STOPS);
  return mixTintTripod(cream, olive, warm, mapVibeColor(warmth));
}

/** Section colours along the page — used to bake the silk field in document space. */
export function vibeRibbon(warmth = state.color) {
  const t = mapVibeColor(warmth);
  const scrollY = typeof window !== "undefined" ? window.scrollY : 0;
  return TINT_STOPS.map((stop, i) => {
    const mixed = mixTintTripod(
      { paper: CREAM_TINT_STOPS[i].paper, wash: CREAM_TINT_STOPS[i].wash },
      { paper: TINT_STOPS[i].paper, wash: TINT_STOPS[i].wash },
      { paper: WARM_TINT_STOPS[i].paper, wash: WARM_TINT_STOPS[i].wash },
      t,
    );
    let y = i * 1200;
    if (typeof document !== "undefined") {
      const el = document.getElementById(stop.id);
      if (el) y = el.getBoundingClientRect().top + scrollY;
    }
    return { y, paper: mixed.paper, wash: mixed.wash };
  });
}

export function vibeAccents(warmth = state.color) {
  const t = mapVibeColor(warmth);
  const intoOlive = t <= OLIVE_AT ? oliveProgress(t) : 1;
  const pastOlive =
    t <= OLIVE_AT ? 0 : (t - OLIVE_AT) / (1 - OLIVE_AT);
  const stapleHue =
    18 + (124 - 18) * intoOlive + (18 - 124) * pastOlive;

  return {
    accent: mixAccentTripod(ACCENT_CREAM, ACCENT_OLIVE, ACCENT_WARM, t),
    accentDeep: mixAccentTripod(
      ACCENT_CREAM_DEEP,
      ACCENT_OLIVE_DEEP,
      ACCENT_WARM_DEEP,
      t,
    ),
    olive: mixAccentTripod(OLIVE_AT_CREAM, OLIVE_AT_OLIVE, OLIVE_AT_WARM, t),
    oliveDeep: mixAccentTripod(
      OLIVE_DEEP_CREAM,
      OLIVE_DEEP_OLIVE,
      OLIVE_DEEP_WARM,
      t,
    ),
    muted: mixAccentTripod(MUTED_CREAM, MUTED_OLIVE, MUTED_WARM, t),
    stapleHue,
  };
}

/**
 * How alive the silk field is. Quieter near the floor; full once tint has colour.
 */
export function silkFieldGain(color = state.color) {
  const t = mapVibeColor(color);
  // Soft at the 35% floor; full by ~olive.
  return 0.2 + 0.8 * Math.pow(Math.min(1, (t - COLOR_FLOOR) / (0.55 - COLOR_FLOOR + 0.001)), 1.1);
}

/** Map silk slider to shader motion / time scale. */
export function silkMotionScale(silk = state.silk, color = state.color) {
  const t = mapSilkAmount(silk);
  // Base motion, then scaled by how much tint is live.
  return (0.85 + t * 1.35) * silkFieldGain(color);
}
