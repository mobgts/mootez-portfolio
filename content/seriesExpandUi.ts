type Listener = () => void;

export type TitleSnapshot = {
  text: string;
  top: number;
  left: number;
  width: number;
  height: number;
  opacity: number;
};

export type FrameSnapshot = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type SeriesExpandNavExit = "about" | "contact";

export type SeriesExpandState = {
  albumId: string | null;
  fromSlug?: string;
  titleSnap?: TitleSnapshot;
  fromRect?: FrameSnapshot;
  /** Leave the scatter toward About/Contact (nav), instead of a plain close. */
  navExit?: SeriesExpandNavExit | null;
};

let state: SeriesExpandState = { albumId: null };
const listeners = new Set<Listener>();

function notify() {
  for (const fn of listeners) fn();
}

export function getSeriesExpand(): SeriesExpandState {
  return state;
}

export function isSeriesExpandOpen() {
  return Boolean(state.albumId);
}

export function captureTitleSnapshot(
  el: HTMLElement | null,
): TitleSnapshot | undefined {
  if (!el) return undefined;
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return undefined;
  const opacity = Number.parseFloat(getComputedStyle(el).opacity || "1");
  return {
    text: (el.textContent || "").trim(),
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    opacity: Number.isFinite(opacity) ? opacity : 1,
  };
}

export function captureFrameSnapshot(
  el: HTMLElement | null,
): FrameSnapshot | undefined {
  if (!el) return undefined;
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return undefined;
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

export function openSeriesExpand(
  albumId: string,
  fromSlug?: string,
  titleSnap?: TitleSnapshot,
  fromRect?: FrameSnapshot,
) {
  state = { albumId, fromSlug, titleSnap, fromRect, navExit: null };
  notify();
}

/** Scatter flies right while the page lands on About/Contact. */
export function exitSeriesExpandTo(target: SeriesExpandNavExit) {
  if (!state.albumId) return false;
  if (state.navExit === target) return true;
  state = { ...state, navExit: target };
  notify();
  return true;
}

export function closeSeriesExpand() {
  if (!state.albumId) return;
  state = { albumId: null, navExit: null };
  notify();
}

export function subscribeSeriesExpand(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
