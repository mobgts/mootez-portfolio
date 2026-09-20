"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useCursorReveal } from "./CursorReveal";

type StillProps = {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  reveal?: boolean;
  radius?: number;
};

export function Still({
  src,
  alt,
  sizes,
  priority,
  className,
  reveal = true,
  radius = 210,
}: StillProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const cursor = useCursorReveal();
  const fit = className ?? "";

  useEffect(() => {
    if (!reveal || !cursor) return;

    return cursor.subscribe(({ x, y, fine, kind }) => {
      const root = rootRef.current;
      const color = colorRef.current;
      if (!root || !color) return;

      if (!fine || kind === "text") {
        color.style.opacity = "0";
        return;
      }

      const box = root.getBoundingClientRect();
      const inside =
        x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;

      color.style.opacity = inside ? "1" : "0";
      if (!inside) return;

      const lx = x - box.left;
      const ly = y - box.top;
      const mask = `radial-gradient(circle ${radius}px at ${lx}px ${ly}px, #000 0%, rgb(0 0 0 / 0.72) 22%, rgb(0 0 0 / 0.38) 48%, rgb(0 0 0 / 0.12) 74%, transparent 100%)`;
      color.style.maskImage = mask;
      color.style.webkitMaskImage = mask;
    });
  }, [cursor, radius, reveal]);

  if (!reveal) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? "100vw"}
        priority={priority}
        className={`object-cover ${fit}`}
      />
    );
  }

  return (
    <div ref={rootRef} className="color-still absolute inset-0 overflow-hidden">
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? "100vw"}
        priority={priority}
        className={`still object-cover ${fit}`}
      />
      <div
        ref={colorRef}
        className="color-still__color pointer-events-none absolute inset-0 opacity-0"
        aria-hidden
      >
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes ?? "100vw"}
          priority={priority}
          className={`object-cover ${fit}`}
        />
      </div>
    </div>
  );
}
