"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { albums } from "@/content/photos";
import type { Album, Photo } from "@/content/types";
import { Still } from "./Still";

type Level = "albums" | "photo";

type AlbumOverlayProps = {
  album: Album | null;
  initialSlug?: string;
  open: boolean;
  onClose: () => void;
  onSelectAlbum: (albumId: string) => void;
  onShowAlbums: () => void;
};

function photoAspectClass(span: Photo["span"]) {
  if (span === "wide") return "aspect-[3/2]";
  if (span === "square") return "aspect-square";
  return "aspect-[3/4]";
}

function filmShotWidth(span: Photo["span"]) {
  if (span === "wide") return "min(72vw, 720px)";
  if (span === "square") return "min(58vw, 520px)";
  return "min(48vw, 420px)";
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
  const active =
    (initialSlug
      ? album.photos.find((photo) => photo.slug === initialSlug)
      : null) ??
    album.photos[0] ??
    null;
  return { level: "photo", current: album, active };
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
  onShowAlbums,
}: AlbumOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const filmRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!open || level !== "photo" || !active) return;
    let film = filmRef.current;
    let removeWheel: (() => void) | undefined;
    let raf = 0;

    const attach = () => {
      film = filmRef.current;
      if (!film || !active) return;

      const target = film.querySelector<HTMLElement>(
        `[data-film-slug="${active.slug}"]`,
      );
      if (target) {
        const left =
          target.offsetLeft - (film.clientWidth - target.offsetWidth) / 2;
        film.scrollLeft = Math.max(0, left);
      }

      const onWheel = (event: WheelEvent) => {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        event.preventDefault();
        film!.scrollLeft += event.deltaY;
      };
      film.addEventListener("wheel", onWheel, { passive: false });
      removeWheel = () => film!.removeEventListener("wheel", onWheel);
    };

    raf = requestAnimationFrame(attach);
    return () => {
      cancelAnimationFrame(raf);
      removeWheel?.();
    };
  }, [active?.slug, level, open, panelKey]);

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
      onShowAlbums();
      return;
    }
    onClose();
  };

  const pickAlbum = (albumId: string) => {
    const next = albums.find((entry) => entry.id === albumId) ?? null;
    const activePhoto = next?.photos[0] ?? null;
    setCurrent(next);
    setActive(activePhoto);
    setLevel("photo");
    setPanelKey((k) => k + 1);
    onSelectAlbum(albumId);
  };

  const focusShot = (photo: Photo) => {
    setActive(photo);
    const film = filmRef.current;
    if (!film) return;
    const target = film.querySelector<HTMLElement>(
      `[data-film-slug="${photo.slug}"]`,
    );
    if (!target) return;
    const left =
      target.offsetLeft - (film.clientWidth - target.offsetWidth) / 2;
    film.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  };

  const step = (dir: 1 | -1) => {
    if (!current || !active) return;
    const index = current.photos.findIndex((photo) => photo.slug === active.slug);
    if (index < 0) return;
    const next =
      current.photos[(index + dir + current.photos.length) % current.photos.length];
    focusShot(next);
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
        if (level === "photo") onShowAlbums();
        else onClose();
        return;
      }
      if (level !== "photo" || !current || !active) return;
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      step(event.key === "ArrowRight" ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, current, level, onClose, onShowAlbums, open]);

  const title =
    level === "albums"
      ? "albums"
      : current
        ? displayLabel(current.label)
        : "albums";

  const backLabel = level === "albums" ? "close" : "see all albums";
  const isFilm = level === "photo";

  return (
    <div
      className={`album-overlay fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8${
        open ? " is-open" : ""
      }${isFilm ? " is-film" : ""}`}
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
        className={`album-overlay__panel relative z-10 flex w-full flex-col overflow-visible text-[var(--ink)]${
          isFilm
            ? " album-overlay__panel--film max-h-[min(96svh,980px)] gap-3"
            : " max-h-[min(92svh,920px)] max-w-5xl gap-4"
        }`}
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

        <div
          key={panelKey}
          className="album-overlay__stage flex min-h-0 flex-1 flex-col overflow-visible"
        >
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

          {isFilm && current && active ? (
            <div className="album-overlay__film-wrap flex min-h-0 flex-1 flex-col">
              <div
                ref={filmRef}
                className="album-overlay__film"
                aria-label="Photographs in this series"
              >
                <div className="album-overlay__film-track">
                  {current.photos.map((photo, index) => {
                    const isActive = photo.slug === active.slug;
                    return (
                      <button
                        key={photo.slug}
                        type="button"
                        data-film-slug={photo.slug}
                        onClick={() => focusShot(photo)}
                        tabIndex={open ? 0 : -1}
                        className={`album-overlay__film-shot${
                          isActive ? " is-active" : ""
                        }`}
                        style={{
                          ["--i" as string]: index,
                          width: filmShotWidth(photo.span),
                        }}
                        aria-label={photo.alt}
                        aria-current={isActive ? "true" : undefined}
                      >
                        <span
                          className={`album-overlay__film-frame relative block w-full overflow-hidden bg-[#221c16] ${photoAspectClass(photo.span)}`}
                        >
                          <Image
                            src={photo.src}
                            alt={photo.alt}
                            fill
                            priority={isActive || index < 3}
                            quality={90}
                            sizes="(max-width: 768px) 72vw, 520px"
                            className="object-cover"
                          />
                        </span>
                        <span className="album-overlay__caption mt-2 flex justify-end overflow-visible px-1">
                          <span data-album-drift>{photo.year}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
