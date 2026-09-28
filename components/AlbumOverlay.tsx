"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { albums } from "@/content/photos";
import type { Album, Photo } from "@/content/types";
import { Still } from "./Still";

type Level = "albums" | "photos" | "photo";

type AlbumOverlayProps = {
  album: Album | null;
  initialSlug?: string;
  open: boolean;
  onClose: () => void;
  onSelectAlbum: (albumId: string) => void;
};

function GridIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
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
  );
}

function SeriesStack({ album }: { album: Album }) {
  const covers = album.photos.slice(0, 3);
  const offset = 28;

  return (
    <div className="relative mx-auto h-[240px] w-[200px] md:h-[310px] md:w-[260px]">
      {covers.map((photo, index) => (
        <div
          key={photo.slug}
          className="absolute top-0 left-0 h-[180px] w-[134px] overflow-hidden bg-[#221c16] md:h-[230px] md:w-[172px]"
          style={{
            transform: `translate(${index * offset}px, ${index * offset}px)`,
            zIndex: index + 1,
          }}
        >
          <div className="relative h-full w-full">
            <Still
              src={photo.src}
              alt=""
              sizes="(max-width: 768px) 134px, 172px"
              reveal={false}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function resolveOpen(
  album: Album | null,
  initialSlug?: string,
): { level: Level; current: Album | null; active: Photo | null } {
  if (!album) {
    return { level: "albums", current: null, active: null };
  }
  const active = initialSlug
    ? (album.photos.find((photo) => photo.slug === initialSlug) ?? null)
    : null;
  if (active) {
    return { level: "photo", current: album, active };
  }
  return { level: "photos", current: album, active: null };
}

export function AlbumOverlay({
  album,
  initialSlug,
  open,
  onClose,
  onSelectAlbum,
}: AlbumOverlayProps) {
  const [level, setLevel] = useState<Level>(
    () => resolveOpen(album, initialSlug).level,
  );
  const [current, setCurrent] = useState<Album | null>(
    () => resolveOpen(album, initialSlug).current,
  );
  const [active, setActive] = useState<Photo | null>(
    () => resolveOpen(album, initialSlug).active,
  );
  const [panelKey, setPanelKey] = useState(0);

  useEffect(() => {
    const next = resolveOpen(album, initialSlug);
    setCurrent(next.current);
    setLevel(next.level);
    setActive(next.active);
    setPanelKey((k) => k + 1);
  }, [album?.id, initialSlug]);

  const goBack = () => {
    if (level === "photo") {
      setActive(null);
      setLevel("photos");
      setPanelKey((k) => k + 1);
      return;
    }
    if (level === "photos") {
      setLevel("albums");
      setActive(null);
      setPanelKey((k) => k + 1);
      return;
    }
    onClose();
  };

  const openPhoto = (photo: Photo) => {
    setActive(photo);
    setLevel("photo");
    setPanelKey((k) => k + 1);
  };

  const pickAlbum = (albumId: string) => {
    const next = albums.find((entry) => entry.id === albumId) ?? null;
    setCurrent(next);
    setActive(null);
    setLevel("photos");
    setPanelKey((k) => k + 1);
    onSelectAlbum(albumId);
  };

  const step = (dir: 1 | -1) => {
    if (!current || !active) return;
    const index = current.photos.findIndex((photo) => photo.slug === active.slug);
    if (index < 0) return;
    const next =
      current.photos[(index + dir + current.photos.length) % current.photos.length];
    setActive(next);
  };

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (level === "photo") {
          setActive(null);
          setLevel("photos");
          setPanelKey((k) => k + 1);
        } else if (level === "photos") {
          setLevel("albums");
          setActive(null);
          setPanelKey((k) => k + 1);
        } else {
          onClose();
        }
        return;
      }
      if (level !== "photo" || !current || !active) return;
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      const dir = event.key === "ArrowRight" ? 1 : -1;
      const index = current.photos.findIndex(
        (photo) => photo.slug === active.slug,
      );
      if (index < 0) return;
      setActive(
        current.photos[
          (index + dir + current.photos.length) % current.photos.length
        ],
      );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, current, level, onClose, open]);

  const activeIndex =
    current && active
      ? current.photos.findIndex((photo) => photo.slug === active.slug)
      : -1;

  const title =
    level === "albums"
      ? "Albums"
      : current
        ? current.label
        : "Albums";

  const subtitle =
    level === "albums"
      ? "Choose a series"
      : level === "photo" && active
        ? `${active.filename} · ${active.year} · ${active.location}${
            activeIndex >= 0
              ? ` · ${activeIndex + 1}/${current?.photos.length ?? 0}`
              : ""
          }`
        : current
          ? `${current.photos.length} photographs · choose a photograph`
          : "";

  return (
    <div
      className={`album-overlay fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8${
        open ? " is-open" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="album-overlay__backdrop absolute inset-0"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        aria-label="Close"
      />

      <div className="album-overlay__panel relative z-10 flex max-h-[min(92svh,920px)] w-full max-w-5xl flex-col gap-4 overflow-hidden text-[#f7f0e4]">
        <div className="album-overlay__header flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[12px] font-medium uppercase tracking-[0.18em]">
              {title}
            </p>
            <p className="mt-1 text-[11px] tracking-[0.08em] text-[#f7f0e4]/70">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={goBack}
            tabIndex={open ? 0 : -1}
            className="shrink-0 text-[#f7f0e4] transition-opacity hover:opacity-70"
            aria-label={
              level === "photo"
                ? "Back to series"
                : level === "photos"
                  ? "Back to all series"
                  : "Close"
            }
          >
            {level === "albums" ? (
              <span className="text-[12px] font-medium uppercase tracking-[0.18em]">
                Close
              </span>
            ) : (
              <GridIcon />
            )}
          </button>
        </div>

        <div key={panelKey} className="album-overlay__stage flex min-h-0 flex-1 flex-col">
          {level === "albums" ? (
            <div className="album-overlay__scroll min-h-0 h-full overflow-y-auto pr-1">
              <div className="flex flex-wrap items-start justify-center gap-10 md:gap-16">
                {albums.map((entry, index) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => pickAlbum(entry.id)}
                    tabIndex={open ? 0 : -1}
                    className="album-overlay__item group text-left"
                    style={{ ["--i" as string]: index }}
                    aria-label={`Open ${entry.label}`}
                  >
                    <SeriesStack album={entry} />
                    <div className="mt-3 flex items-baseline justify-between gap-3 text-[10px] font-medium uppercase tracking-[0.14em]">
                      <span>{entry.label}</span>
                      <span>{entry.photos.length}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {level === "photos" && current ? (
            <div className="album-overlay__scroll min-h-0 h-full overflow-y-auto pr-1">
              <div className="flex flex-wrap items-start justify-center gap-8 md:gap-12">
                {current.photos.map((photo, index) => (
                  <button
                    key={photo.slug}
                    type="button"
                    onClick={() => openPhoto(photo)}
                    tabIndex={open ? 0 : -1}
                    className="album-overlay__item group w-[min(42vw,200px)] shrink-0 text-left md:w-[min(22vw,220px)]"
                    style={{ ["--i" as string]: index }}
                  >
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#221c16]/80">
                      <Still
                        src={photo.src}
                        alt={photo.alt}
                        sizes="(max-width: 768px) 42vw, 220px"
                        reveal={false}
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
          ) : null}

          {level === "photo" && current && active ? (
            <div className="album-overlay__item flex h-full min-h-0 w-full flex-col items-center gap-2.5">
              <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
                <div
                  key={active.slug}
                  className="album-overlay__photo relative overflow-hidden"
                  style={{
                    aspectRatio: "3 / 4",
                    width: "min(100%, calc((92svh - 9rem) * 3 / 4))",
                    maxHeight: "calc(92svh - 9rem)",
                    height: "auto",
                  }}
                >
                  <Image
                    src={active.src}
                    alt={active.alt}
                    fill
                    priority
                    quality={95}
                    sizes="(max-width: 768px) 80vw, 440px"
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    tabIndex={open ? 0 : -1}
                    className="absolute top-1/2 left-1 z-10 -translate-y-1/2 p-1.5 text-[#f7f0e4] drop-shadow-[0_1px_4px_rgb(0_0_0_/_0.55)] transition-opacity hover:opacity-70"
                    aria-label="Previous photograph"
                  >
                    <svg
                      width="22"
                      height="22"
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
                  <button
                    type="button"
                    onClick={() => step(1)}
                    tabIndex={open ? 0 : -1}
                    className="absolute top-1/2 right-1 z-10 -translate-y-1/2 p-1.5 text-[#f7f0e4] drop-shadow-[0_1px_4px_rgb(0_0_0_/_0.55)] transition-opacity hover:opacity-70"
                    aria-label="Next photograph"
                  >
                    <svg
                      width="22"
                      height="22"
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

              <div
                className="album-overlay__strip relative z-10 flex h-11 w-full shrink-0 items-center justify-center gap-1.5"
                aria-label="Photographs in this series"
              >
                {current.photos.map((photo) => {
                  const isActive = photo.slug === active.slug;
                  return (
                    <button
                      key={photo.slug}
                      type="button"
                      onClick={() => setActive(photo)}
                      tabIndex={open ? 0 : -1}
                      className={`album-overlay__thumb relative block shrink-0 overflow-hidden transition-opacity duration-200 ${
                        isActive
                          ? "opacity-100 ring-1 ring-[#f7f0e4]/70"
                          : "opacity-45 hover:opacity-80"
                      }`}
                      style={{ width: 28, height: 36 }}
                      aria-label={photo.alt}
                      aria-current={isActive ? "true" : undefined}
                    >
                      <Image
                        src={photo.src}
                        alt=""
                        width={28}
                        height={36}
                        sizes="28px"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
