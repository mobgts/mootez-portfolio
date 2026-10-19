"use client";

import Image from "next/image";
import { ImageRippleEffect } from "@/components/ui/image-ripple-effect";

type AboutPhotoProps = {
  src: string;
  maskSrc: string;
  alt: string;
};

/** About portrait with a cursor-driven ripple over the same photo. */
export function AboutPhoto({ src, alt }: AboutPhotoProps) {
  return (
    <div className="about-photo absolute inset-0">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover object-[center_48%]"
        sizes="(max-width: 768px) 22rem, 28rem"
        priority
        unoptimized
      />
      <ImageRippleEffect
        src={src}
        focusY={0.48}
        className="absolute inset-0"
        aria-hidden
      />
    </div>
  );
}
