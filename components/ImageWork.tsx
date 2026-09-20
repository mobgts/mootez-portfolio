"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { photos } from "@/content/photos";
import type { Photo } from "@/content/types";
import { SectionMark } from "./SectionMark";
import { Still } from "./Still";

export function ImageWork() {
  const [active, setActive] = useState<Photo | null>(null);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        const index = photos.findIndex((photo) => photo.slug === active.slug);
        const next =
          event.key === "ArrowRight"
            ? photos[(index + 1) % photos.length]
            : photos[(index - 1 + photos.length) % photos.length];
        setActive(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <section id="image" className="scroll-mt-16 px-4 py-8 md:px-8 md:py-12">
      <SectionMark
        label="Select works"
        extra="Series: doubles"
      />
      <div className="flex flex-wrap gap-x-4 gap-y-8 md:gap-x-6">
        {photos.map((photo) => (
          <button
            key={photo.slug}
            type="button"
            onClick={() => setActive(photo)}
            className="group w-[46%] max-w-[200px] text-left md:w-[180px] md:max-w-none"
          >
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-ink/10">
              <Still
                src={photo.src}
                alt={photo.alt}
                sizes="200px"
                radius={140}
              />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2 text-[10px] font-medium uppercase tracking-[0.14em]">
              <span>{photo.filename}</span>
              <span>{photo.year}</span>
            </div>
          </button>
        ))}
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-5 md:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={active.filename}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-md"
            onClick={() => setActive(null)}
            aria-label="Close photograph"
          />
          <div className="relative z-10 flex w-full max-w-[min(92vw,440px)] flex-col gap-3 text-[#f7f0e4]">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium uppercase tracking-[0.18em]">
                {active.filename} · {active.year} · {active.location}
              </p>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="text-[12px] font-medium uppercase tracking-[0.18em]"
              >
                Close
              </button>
            </div>
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#221c16]">
              <Image
                src={active.src}
                alt={active.alt}
                fill
                priority
                quality={95}
                sizes="(max-width: 768px) 92vw, 440px"
                className="object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
