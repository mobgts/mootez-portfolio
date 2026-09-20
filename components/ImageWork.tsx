"use client";

import { useEffect, useState } from "react";
import { photos } from "@/content/photos";
import type { Photo } from "@/content/types";
import { SectionMark } from "./SectionMark";
import { Still } from "./Still";

function spanClass(span: Photo["span"]) {
  if (span === "wide") return "md:col-span-7";
  if (span === "tall") return "md:col-span-4";
  return "md:col-span-5";
}

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
        extra="Street / rooms / nights / placeholders"
      />
      <div className="grid grid-cols-1 gap-x-4 gap-y-10 md:grid-cols-12">
        {photos.map((photo) => (
          <button
            key={photo.slug}
            type="button"
            onClick={() => setActive(photo)}
            className={`group text-left ${spanClass(photo.span)}`}
          >
            <div
              className={`relative w-full overflow-hidden bg-ink/10 ${
                photo.span === "tall" ? "aspect-[3/4]" : "aspect-[3/2]"
              }`}
            >
              <Still
                src={photo.src}
                alt={photo.alt}
                sizes="(min-width: 768px) 50vw, 100vw"
                radius={210}
              />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-4 text-[11px] font-medium uppercase tracking-[0.16em]">
              <span>{photo.filename}</span>
              <span>{photo.year}</span>
            </div>
          </button>
        ))}
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-ink text-paper"
          role="dialog"
          aria-modal="true"
          aria-label={active.filename}
        >
          <div className="flex items-center justify-between px-4 py-4 md:px-8">
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
          <div className="relative min-h-0 w-full flex-1">
            <button
              type="button"
              className="absolute inset-0"
              onClick={() => setActive(null)}
              aria-label="Close photograph"
            >
              <Still
                src={active.src}
                alt={active.alt}
                sizes="100vw"
                className="object-contain"
                reveal={false}
              />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
