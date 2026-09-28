"use client";

import {
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import {
  getVibe,
  silkMotionScale,
  subscribeVibe,
} from "@/content/vibe";

function easeOutQuint(t: number) {
  return 1 - Math.pow(1 - t, 5);
}

type Layer = {
  el: HTMLElement;
  strength: number;
  /** 0 = sway only (hero); 1 = silk displace on arrive */
  warpScale: number;
  turb: SVGFETurbulenceElement | null;
  map: SVGFEDisplacementMapElement | null;
};

export type SilkDrive = {
  register: (layer: Omit<Layer, never>) => void;
  unregister: (el: HTMLElement) => void;
};

/**
 * Per-section silk clock — same pace / turbulence family as AboutPhoto.
 * Softness is displacement (folds), not gaussian blur.
 */
export function useSilkDrive(sectionRef: RefObject<HTMLElement | null>) {
  const layersRef = useRef<Layer[]>([]);
  const emergeRef = useRef(0);
  const apiRef = useRef<SilkDrive>({
    register: (layer) => {
      layersRef.current = layersRef.current.filter((l) => l.el !== layer.el);
      layersRef.current.push(layer);
    },
    unregister: (el) => {
      layersRef.current = layersRef.current.filter((l) => l.el !== el);
    },
  });

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const isHero = section.hasAttribute("data-story-hero");
    if (isHero) emergeRef.current = 1;

    const silkRef = { current: getVibe().silk };
    const colorRef = { current: getVibe().color };
    const reduceRef = { current: false };
    let smoothEmerge = isHero ? 1 : 0;
    let animTime = 0;
    let lastNow = performance.now();
    const introStart = performance.now();
    let raf = 0;
    let near = true;

    const unsub = subscribeVibe((v) => {
      silkRef.current = v.silk;
      colorRef.current = v.color;
    });

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceRef.current = query.matches;
    const onReduce = () => {
      reduceRef.current = query.matches;
    };
    query.addEventListener("change", onReduce);

    const readEmerge = () => {
      const rect = section.getBoundingClientRect();
      const viewH = window.innerHeight;
      near = rect.bottom > -viewH * 0.35 && rect.top < viewH * 1.35;

      if (isHero) {
        emergeRef.current = near ? 1 : 0;
        return;
      }

      // Wider band — section starts soft early and only settles near mid-viewport.
      const approach = 1 - Math.min(1, Math.max(0, rect.top / (viewH * 0.95)));
      const visible = Math.min(
        1,
        Math.max(0, (viewH * 0.85 - rect.top) / (viewH * 0.9)),
      );
      const inFrame =
        Math.min(rect.bottom, viewH) - Math.max(rect.top, 0);
      const sectionVisible = Math.min(
        1,
        Math.max(0, inFrame / Math.max(rect.height * 0.92, 1)),
      );
      // Weight approach so scroll position leads; section fill only finishes it.
      emergeRef.current = near
        ? Math.min(1, Math.max(approach * 0.85, visible * 0.55, sectionVisible * 0.7))
        : 0;
    };

    readEmerge();
    window.addEventListener("scroll", readEmerge, { passive: true });
    window.addEventListener("resize", readEmerge);

    const lite =
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(max-width: 767px)").matches;
    let scrollBusyUntil = 0;
    const markBusy = () => {
      scrollBusyUntil = performance.now() + 180;
    };
    if (lite) {
      window.addEventListener("scroll", markBusy, { passive: true });
      window.addEventListener("touchmove", markBusy, { passive: true });
    }

    const paint = (
      x: number,
      y: number,
      emerge: number,
      motion: number,
      time: number,
    ) => {
      const e = easeOutQuint(emerge);
      const fromField = 1 - e;

      // Same turbulence scroll as AboutPhoto — folds move with the field.
      const ox = Math.sin(time * 0.55) * 0.004;
      const oy = Math.cos(time * 0.38) * 0.005;
      const freq = `${0.014 + ox} ${0.02 + oy}`;

      for (const { el, strength, warpScale, turb, map } of layersRef.current) {
        const tx = x * strength * (0.55 + fromField * 1.85);
        const ty =
          y * strength * (0.55 + fromField * 1.85) + fromField * 36 * strength;
        const rot = x * 0.045 * strength * (0.35 + fromField);
        const opacity = warpScale < 0.05 ? 1 : 0.2 + e * 0.8;
        const scale = warpScale < 0.05 ? 1 : 0.97 + e * 0.03;

        el.style.opacity = String(opacity);
        el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg) scale(${scale.toFixed(4)})`;

        if (warpScale < 0.05 || !turb || !map) {
          el.style.removeProperty("filter");
          continue;
        }

        turb.setAttribute("baseFrequency", freq);

        // Strong displace while leaving the silk; quiet residual once settled
        // (same family as AboutPhoto rim: ~2.5 + motion*4.5 at rest).
        const arrive = fromField * (14 + motion * 20) * strength * warpScale;
        const settle =
          (1.2 + motion * 2.4) * strength * warpScale * (0.25 + fromField * 0.75);
        map.setAttribute("scale", String(arrive + settle));
      }
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (lite && now < scrollBusyUntil) return;
      const dt = Math.min(0.05, (now - lastNow) / 1000);
      lastNow = now;

      if (reduceRef.current) {
        paint(0, 0, 1, 0, 0);
        for (const { map } of layersRef.current) {
          map?.setAttribute("scale", "0");
        }
        return;
      }

      if (!near && smoothEmerge < 0.02) {
        paint(0, 0, 0, 0, animTime);
        return;
      }

      const motion = silkMotionScale(silkRef.current, colorRef.current);
      animTime += dt * motion;

      // Soft wake into live sway so the first beat isn't a hard start.
      const introGain = isHero
        ? easeOutQuint(Math.min(1, Math.max(0, (now - introStart) / 900)))
        : 1;

      const x = Math.sin(animTime * 0.55) * (3.4 + motion * 5.8) * introGain;
      const y = Math.cos(animTime * 0.38) * (4.4 + motion * 7.2) * introGain;

      const target = Math.min(1, Math.max(0, emergeRef.current));
      // Slow settle — silk has time to fold before the layer clears.
      const rise = target >= smoothEmerge ? 0.85 : 1.6;
      smoothEmerge += (target - smoothEmerge) * Math.min(1, dt * rise);
      paint(x, y, smoothEmerge, motion, animTime);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", readEmerge);
      window.removeEventListener("resize", readEmerge);
      window.removeEventListener("scroll", markBusy);
      window.removeEventListener("touchmove", markBusy);
      query.removeEventListener("change", onReduce);
      unsub();
    };
  }, [sectionRef]);

  return apiRef.current;
}

/** @deprecated use useSilkDrive */
export const useAboutSilkDrive = useSilkDrive;

const arriveStyle: CSSProperties = {
  opacity: 0,
  willChange: "transform, opacity, filter",
};

export function SilkArrive({
  drive,
  strength = 1,
  warpScale = 1,
  /** @deprecated use warpScale */
  blurScale,
  className = "",
  startVisible = false,
  children,
}: {
  drive: SilkDrive;
  strength?: number;
  /** 0 = no displace (hero); 1 = silk folds on arrive */
  warpScale?: number;
  blurScale?: number;
  className?: string;
  startVisible?: boolean;
  children: ReactNode;
}) {
  const rawId = useId();
  const filterId = `silk-arrive-${rawId.replace(/:/g, "")}`;
  const ref = useRef<HTMLDivElement>(null);
  const turbRef = useRef<SVGFETurbulenceElement>(null);
  const mapRef = useRef<SVGFEDisplacementMapElement>(null);
  const warp = blurScale ?? warpScale;
  const useWarp = warp >= 0.05;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (useWarp) {
      el.style.filter = `url(#${filterId})`;
    }
    drive.register({
      el,
      strength,
      warpScale: warp,
      turb: turbRef.current,
      map: mapRef.current,
    });
    return () => {
      drive.unregister(el);
      el.style.removeProperty("filter");
    };
  }, [drive, strength, warp, useWarp, filterId]);

  return (
    <div
      ref={ref}
      className={`silk-arrive ${className}`.trim()}
      style={
        startVisible
          ? { opacity: 1, willChange: "transform, opacity, filter" }
          : arriveStyle
      }
    >
      {useWarp ? (
        <svg
          className="pointer-events-none absolute h-0 w-0 overflow-hidden"
          aria-hidden
          focusable="false"
        >
          <defs>
            <filter
              id={filterId}
              x="-10%"
              y="-10%"
              width="120%"
              height="120%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                ref={turbRef}
                type="fractalNoise"
                baseFrequency="0.014 0.02"
                numOctaves="2"
                seed="3"
                result="noise"
              />
              <feDisplacementMap
                ref={mapRef}
                in="SourceGraphic"
                in2="noise"
                scale="0"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
      ) : null}
      {children}
    </div>
  );
}
