"use client";

import Image from "next/image";
import { useEffect, useId, useRef, type CSSProperties } from "react";
import {
  getVibe,
  silkMotionScale,
  subscribeVibe,
} from "@/content/vibe";

type AboutPhotoProps = {
  src: string;
  maskSrc: string;
  alt: string;
};

/**
 * About portrait with a soft ripple on the surroundings.
 * Figure stays locked via the cutout mask; base image always paints.
 */
export function AboutPhoto({ src, maskSrc, alt }: AboutPhotoProps) {
  const rawId = useId();
  const filterId = `about-edge-${rawId.replace(/:/g, "")}`;
  const turbRef = useRef<SVGFETurbulenceElement>(null);
  const mapRef = useRef<SVGFEDisplacementMapElement>(null);
  const silkRef = useRef(getVibe().silk);
  const colorRef = useRef(getVibe().color);
  const reduceRef = useRef(false);

  useEffect(() => {
    silkRef.current = getVibe().silk;
    colorRef.current = getVibe().color;
    return subscribeVibe((v) => {
      silkRef.current = v.silk;
      colorRef.current = v.color;
    });
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceRef.current = query.matches;
    const onChange = () => {
      reduceRef.current = query.matches;
    };
    query.addEventListener("change", onChange);

    let animTime = 0;
    let lastNow = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const turb = turbRef.current;
      const map = mapRef.current;
      if (!turb || !map) return;

      const dt = Math.min(0.05, (now - lastNow) / 1000);
      lastNow = now;

      if (reduceRef.current) {
        map.setAttribute("scale", "0");
        return;
      }

      const motion = silkMotionScale(silkRef.current, colorRef.current);
      animTime += dt * motion * 0.65;

      const ox = Math.sin(animTime * 0.28) * 0.0015;
      const oy = Math.cos(animTime * 0.2) * 0.0018;
      turb.setAttribute("baseFrequency", `${0.007 + ox} ${0.009 + oy}`);
      map.setAttribute("scale", String(1.1 + motion * 1.6));
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      query.removeEventListener("change", onChange);
    };
  }, []);

  return (
    <div className="about-photo absolute inset-0">
      <svg
        className="pointer-events-none absolute left-0 top-0 overflow-hidden"
        width={0}
        height={0}
        aria-hidden
        focusable="false"
      >
        <defs>
          <filter
            id={filterId}
            x="-14%"
            y="-14%"
            width="128%"
            height="128%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              ref={turbRef}
              type="fractalNoise"
              baseFrequency="0.007 0.009"
              numOctaves="2"
              seed="3"
              result="noise"
            />
            <feDisplacementMap
              ref={mapRef}
              in="SourceGraphic"
              in2="noise"
              scale="1.5"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover object-[center_42%]"
        sizes="(max-width: 768px) 22rem, 30rem"
        priority
        unoptimized
      />

      <div
        className="about-photo__field absolute inset-0"
        style={
          {
            filter: `url(#${filterId})`,
            ["--about-figure-mask"]: `url(${maskSrc})`,
          } as CSSProperties
        }
        aria-hidden
      >
        <Image
          src={src}
          alt=""
          fill
          className="object-cover object-[center_42%]"
          sizes="(max-width: 768px) 22rem, 30rem"
          priority
          unoptimized
        />
      </div>
    </div>
  );
}
