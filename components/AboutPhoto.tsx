"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ImageRippleEffect } from "@/components/ui/image-ripple-effect";

type AboutPhotoProps = {
  src: string;
  maskSrc: string;
  alt: string;
};

/** About portrait with a cursor-driven ripple over the same photo. */
export function AboutPhoto({ src, alt }: AboutPhotoProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  // Defer WebGL until About owns the view — not during series→About pin.
  const [ripple, setRipple] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let near = false;
    let done = false;

    const tryEnable = () => {
      if (done) return;
      if (document.documentElement.dataset.aboutFromSeries === "1") return;
      if (!near) return;
      done = true;
      setRipple(true);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        near = !!entry?.isIntersecting;
        tryEnable();
      },
      { rootMargin: "40px 0px" },
    );
    io.observe(el);

    const mo = new MutationObserver(tryEnable);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-about-from-series"],
    });

    tryEnable();
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return (
    <div ref={rootRef} className="about-photo absolute inset-0">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover object-[center_48%]"
        sizes="(max-width: 768px) 22rem, 28rem"
        priority
        unoptimized
      />
      {ripple ? (
        <ImageRippleEffect
          src={src}
          focusY={0.48}
          className="absolute inset-0"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
