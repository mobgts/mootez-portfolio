import { useEffect, type RefObject } from "react";

export type SoftDriftSpec = {
  el: HTMLElement;
  ampX: number;
  ampY: number;
  ampR: number;
  speedX: number;
  speedY: number;
  speedR: number;
  phaseX: number;
  phaseY: number;
  phaseR: number;
  biasX: number;
  biasY: number;
};

export type SoftDriftOptions = {
  /** Defaults to `[data-soft-drift]`. */
  selector?: string;
  /** Scale all amplitudes (1 = nav-like). */
  ampScale?: number;
};

/**
 * Soft wander used by the studio rail / sticky nav — same sin/cos living motion.
 * Returns a cleanup that cancels the RAF and clears transforms.
 */
export function startSoftDrift(
  root: ParentNode,
  options: SoftDriftOptions = {},
): () => void {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduce.matches) return () => {};

  const selector = options.selector ?? "[data-soft-drift]";
  const ampScale = options.ampScale ?? 1;
  const items = Array.from(root.querySelectorAll<HTMLElement>(selector));
  if (!items.length) return () => {};

  const specs: SoftDriftSpec[] = items.map((el, i) => {
    const slight = el.dataset.softDrift === "slight";
    const base = slight ? 0.7 : 1;
    const scale = ampScale * base;
    return {
      el,
      ampX: (2.2 + (i % 3) * 0.9) * scale,
      ampY: (1.8 + (i % 4) * 0.7) * scale,
      ampR: (0.35 + (i % 3) * 0.18) * scale,
      speedX: 0.00028 + i * 0.00005,
      speedY: 0.00022 + i * 0.00007,
      speedR: 0.00018 + i * 0.00004,
      phaseX: i * 1.73 + 0.4,
      phaseY: i * 2.41 + 0.9,
      phaseR: i * 1.19 + 0.2,
      biasX: 0,
      biasY: 0,
    };
  });

  let raf = 0;
  const driftStart = performance.now();

  const tick = (now: number) => {
    const gain = Math.min(1, Math.max(0, (now - driftStart - 400) / 900));
    const ease = 1 - Math.pow(1 - gain, 3);
    for (const s of specs) {
      const x =
        (Math.sin(now * s.speedX + s.phaseX) * s.ampX + s.biasX) * ease;
      const y =
        (Math.cos(now * s.speedY + s.phaseY) * s.ampY + s.biasY) * ease;
      const r = Math.sin(now * s.speedR + s.phaseR) * s.ampR * ease;
      s.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${r.toFixed(3)}deg)`;
    }
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    for (const s of specs) s.el.style.transform = "";
  };
}

/** Soft-drift every `[data-soft-drift]` under `rootRef`. */
export function useSoftDrift(
  rootRef: RefObject<ParentNode | null>,
  options: SoftDriftOptions = {},
) {
  const selector = options.selector ?? "[data-soft-drift]";
  const ampScale = options.ampScale ?? 1;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return startSoftDrift(root, { selector, ampScale });
  }, [rootRef, selector, ampScale]);
}
