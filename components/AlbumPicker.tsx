"use client";

import { useEffect } from "react";
import { albums } from "@/content/photos";
import { Still } from "./Still";

type AlbumPickerProps = {
  onSelect: (albumId: string) => void;
  onClose: () => void;
};

export function AlbumPicker({ onSelect, onClose }: AlbumPickerProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Albums"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
        aria-label="Close albums"
      />

      <div className="relative z-10 flex max-h-[min(92svh,920px)] w-full max-w-3xl flex-col gap-6 overflow-hidden text-[#f7f0e4]">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[12px] font-medium uppercase tracking-[0.18em]">
              Albums
            </p>
            <p className="mt-1 text-[11px] tracking-[0.08em] text-[#f7f0e4]/70">
              Choose a series
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-[12px] font-medium uppercase tracking-[0.18em] text-[#f7f0e4] transition-opacity hover:opacity-70"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            {albums.map((album) => (
              <button
                key={album.id}
                type="button"
                onClick={() => onSelect(album.id)}
                className="group text-left"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#221c16]/80">
                  <Still
                    src={album.photos[0]?.src ?? ""}
                    alt={album.label}
                    sizes="(max-width: 768px) 45vw, 280px"
                    radius={120}
                  />
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-2 text-[10px] font-medium uppercase tracking-[0.14em]">
                  <span>{album.label}</span>
                  <span>{album.photos.length}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
