"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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

function photoAspect(span: Photo["span"]) {
  if (span === "wide") return "3 / 2";
  if (span === "square") return "1 / 1";
  return "3 / 4";
}

function photoAspectClass(span: Photo["span"]) {
  if (span === "wide") return "aspect-[3/2]";
  if (span === "square") return "aspect-square";
  return "aspect-[3/4]";
}

type DriftSpec = {
  el: HTMLElement;
  ampX: number;
  ampY: number;
  ampR: number;
  speedX: number;
  speedY: number;
  speedR: number;
  phaseX: number;
  phaseY: number;
  phaseR: number;
  biasX: number;
  biasY: number;
};

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

function displayLabel(value: string) {
  return value.toLowerCase();
}

export function AlbumOverlay({
  album,
  initialSlug,
  open,
  onClose,
  onSelectAlbum,
}: AlbumOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
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

  // Soft wander on overlay labels — same feel as the V-bar rail text.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    let raf = 0;
    let cancelled = false;
    let specs: DriftSpec[] = [];
    let driftStart = 0;

    const collect = () => {
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>("[data-album-drift]"),
      );
      specs = items.map((el, i) => {
        const edge = el.dataset.albumDrift;
        return {
          el,
          ampX: 3.2 + (i % 3) * 1.4,
          ampY: 2.4 + (i % 4) * 1.1,
          ampR: 0.55 + (i % 3) * 0.28,
          speedX: 0.00032 + i * 0.00006,
          speedY: 0.00026 + i * 0.00008,
          speedR: 0.0002 + i * 0.00005,
          phaseX: i * 1.73,
          phaseY: i * 2.41,
          phaseR: i * 1.19,
          // Nudge edge labels inward so the full wander stays visible.
          biasX: edge === "left" ? 1.8 : edge === "right" ? -1.8 : 0,
          biasY: 0,
        };
      });
      driftStart = performance.now();
    };

    const tick = (now: number) => {
      if (cancelled) return;
      const gain = Math.min(1, Math.max(0, (now - driftStart - 400) / 900));
      const ease = 1 - Math.pow(1 - gain, 3);
      for (const s of specs) {
        const x =
          (Math.sin(now * s.speedX + s.phaseX) * s.ampX + s.biasX) * ease;
        const y =
          (Math.cos(now * s.speedY + s.phaseY) * s.ampY + s.biasY) * ease;
        const r = Math.sin(now * s.speedR + s.phaseR) * s.ampR * ease;
        s.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${r.toFixed(3)}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };

    // Wait a frame so remounted stage labels are in the DOM.
    raf = requestAnimationFrame(() => {
      if (cancelled) return;
      collect();
      if (!specs.length) return;
      raf = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      for (const s of specs) s.el.style.transform = "";
    };
  }, [open, level, panelKey]);

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

  const title =
    level === "albums"
      ? "albums"
      : current
        ? displayLabel(current.label)
        : "albums";

  const backLabel =
    level === "albums"
      ? "close"
      : level === "photos"
        ? "see all albums"
        : "see series";

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

      <div
        ref={panelRef}
        className="album-overlay__panel relative z-10 flex max-h-[min(92svh,920px)] w-full max-w-5xl flex-col gap-4 overflow-visible text-[var(--ink)]"
      >
        <div className="album-overlay__header flex items-center justify-between gap-4 px-3">
          <div className="min-w-0 overflow-visible">
            <p className="album-overlay__title">
              <span data-album-drift="left">{title}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={goBack}
            tabIndex={open ? 0 : -1}
            className="album-overlay__back shrink-0 overflow-visible transition-opacity hover:opacity-70"
            aria-label={backLabel}
          >
            <span data-album-drift="right">{backLabel}</span>
          </button>
        </div>

        <div key={panelKey} className="album-overlay__stage flex min-h-0 flex-1 flex-col overflow-visible">
          {level === "albums" ? (
            <div className="album-overlay__scroll min-h-0 h-full">
              <div className="flex flex-wrap items-start justify-center gap-10 px-3 md:gap-16">
                {albums.map((entry, index) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => pickAlbum(entry.id)}
                    tabIndex={open ? 0 : -1}
                    className="album-overlay__item group overflow-visible text-left"
                    style={{ ["--i" as string]: index }}
                    aria-label={`Open ${entry.label}`}
                  >
                    <SeriesStack album={entry} />
                    <div className="album-overlay__caption mt-3 overflow-visible px-1">
                      <span data-album-drift>{displayLabel(entry.label)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {level === "photos" && current ? (
            <div className="album-overlay__scroll min-h-0 h-full">
              <div className="flex flex-wrap items-start justify-center gap-8 px-3 md:gap-12">
                {current.photos.map((photo, index) => (
                  <button
                    key={photo.slug}
                    type="button"
                    onClick={() => openPhoto(photo)}
                    tabIndex={open ? 0 : -1}
                    className="album-overlay__item group w-[min(42vw,200px)] shrink-0 overflow-visible text-left md:w-[min(22vw,220px)]"
                    style={{ ["--i" as string]: index }}
                  >
                    <div
                      className={`relative w-full overflow-hidden bg-[#221c16]/80 ${photoAspectClass(photo.span)}`}
                    >
                      <Still
                        src={photo.src}
                        alt={photo.alt}
                        sizes="(max-width: 768px) 42vw, 220px"
                        reveal={false}
                      />
                    </div>
                    <div className="album-overlay__caption mt-2 flex items-baseline justify-end gap-2 overflow-visible px-1">
                      <span data-album-drift>{photo.year}</span>
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
                    aspectRatio: photoAspect(active.span),
                    width:
                      active.span === "wide"
                        ? "min(100%, calc((92svh - 9rem) * 3 / 2))"
                        : active.span === "square"
                          ? "min(100%, calc(92svh - 9rem))"
                          : "min(100%, calc((92svh - 9rem) * 3 / 4))",
                    maxHeight: "calc(92svh - 9rem)",
                    maxWidth: "100%",
                    height: "auto",
                  }}
                >
                  <Image
                    src={active.src}
                    alt={active.alt}
                    fill
                    priority
                    quality={95}
                    sizes="(max-width: 768px) 90vw, 720px"
                    className="object-contain"
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
                  const thumb =
                    photo.span === "wide"
                      ? { width: 36, height: 24 }
                      : photo.span === "square"
                        ? { width: 28, height: 28 }
                        : { width: 28, height: 36 };
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
                      style={thumb}
                      aria-label={photo.alt}
                      aria-current={isActive ? "true" : undefined}
                    >
                      <Image
                        src={photo.src}
                        alt=""
                        width={thumb.width}
                        height={thumb.height}
                        sizes={`${thumb.width}px`}
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
