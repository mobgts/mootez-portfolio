"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Album, Photo } from "@/content/types";
import { Still } from "./Still";

type AlbumOverlayProps = {
  album: Album;
  initialSlug?: string;
  onClose: () => void;
};

export function AlbumOverlay({
  album,
  initialSlug,
  onClose,
}: AlbumOverlayProps) {
  const [active, setActive] = useState<Photo | null>(() => {
    if (!initialSlug) return null;
    return album.photos.find((photo) => photo.slug === initialSlug) ?? null;
  });

  const step = (dir: 1 | -1) => {
    if (!active) return;
    const index = album.photos.findIndex((photo) => photo.slug === active.slug);
    if (index < 0) return;
    const next =
      album.photos[(index + dir + album.photos.length) % album.photos.length];
    setActive(next);
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (active) setActive(null);
        else onClose();
        return;
      }
      if (!active) return;
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      const dir = event.key === "ArrowRight" ? 1 : -1;
      const index = album.photos.findIndex(
        (photo) => photo.slug === active.slug,
      );
      if (index < 0) return;
      setActive(
        album.photos[
          (index + dir + album.photos.length) % album.photos.length
        ],
      );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, album.photos, onClose]);

  const activeIndex = active
    ? album.photos.findIndex((photo) => photo.slug === active.slug)
    : -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={album.label}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
        aria-label="Close album"
      />

      <div className="relative z-10 flex max-h-[min(92svh,920px)] w-full max-w-5xl flex-col gap-4 overflow-hidden text-[#f7f0e4]">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[12px] font-medium uppercase tracking-[0.18em]">
              {album.label}
            </p>
            <p className="mt-1 text-[11px] tracking-[0.08em] text-[#f7f0e4]/70">
              {album.photos.length} photographs
              {active ? " · choose another or close" : " · choose a photograph"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (active) setActive(null);
              else onClose();
            }}
            className="shrink-0 text-[#f7f0e4] transition-opacity hover:opacity-70"
            aria-label={active ? "Back to grid" : "Close album"}
          >
            {active ? (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <rect x="3" y="3" width="5" height="5" fill="currentColor" />
                <rect x="9.5" y="3" width="5" height="5" fill="currentColor" />
                <rect x="16" y="3" width="5" height="5" fill="currentColor" />
                <rect x="3" y="9.5" width="5" height="5" fill="currentColor" />
                <rect x="9.5" y="9.5" width="5" height="5" fill="currentColor" />
                <rect x="16" y="9.5" width="5" height="5" fill="currentColor" />
                <rect x="3" y="16" width="5" height="5" fill="currentColor" />
                <rect x="9.5" y="16" width="5" height="5" fill="currentColor" />
                <rect x="16" y="16" width="5" height="5" fill="currentColor" />
              </svg>
            ) : (
              <span className="text-[12px] font-medium uppercase tracking-[0.18em]">
                Close
              </span>
            )}
          </button>
        </div>

        {active ? (
          <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
            <p className="w-full max-w-[min(92vw,440px)] text-[12px] font-medium uppercase tracking-[0.18em]">
              {active.filename} · {active.year} · {active.location}
              {activeIndex >= 0
                ? ` · ${activeIndex + 1}/${album.photos.length}`
                : null}
            </p>
            <div className="relative flex w-full max-w-[min(92vw,560px)] items-center gap-2 md:gap-4">
              <button
                type="button"
                onClick={() => step(-1)}
                className="shrink-0 p-2 text-[#f7f0e4] transition-opacity hover:opacity-70"
                aria-label="Previous photograph"
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M15 5L8 12L15 19"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className="relative aspect-[3/4] min-w-0 flex-1 overflow-hidden bg-[#221c16]">
                <Image
                  src={active.src}
                  alt={active.alt}
                  fill
                  priority
                  quality={95}
                  sizes="(max-width: 768px) 70vw, 440px"
                  className="object-contain"
                />
              </div>
              <button
                type="button"
                onClick={() => step(1)}
                className="shrink-0 p-2 text-[#f7f0e4] transition-opacity hover:opacity-70"
                aria-label="Next photograph"
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M9 5L16 12L9 19"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
              {album.photos.map((photo) => (
                <button
                  key={photo.slug}
                  type="button"
                  onClick={() => setActive(photo)}
                  className="group text-left"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#221c16]/80">
                    <Still
                      src={photo.src}
                      alt={photo.alt}
                      sizes="(max-width: 768px) 45vw, 200px"
                      radius={120}
                    />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between gap-2 text-[10px] font-medium uppercase tracking-[0.14em]">
                    <span>{photo.filename}</span>
                    <span>{photo.year}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
