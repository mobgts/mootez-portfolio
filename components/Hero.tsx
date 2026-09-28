"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type RefObject } from "react";
import { openAlbumDirect } from "@/content/albumUi";
import { getAlbum } from "@/content/photos";
import { SilkArrive, useSilkDrive } from "./AboutSilk";

/** Desktop collage metrics — source of truth. Everything else scales from these. */
const DESKTOP = {
  seriesW: 380,
  seriesH: 510,
  seriesWLarge: 450,
  seriesHLarge: 600,
  cardW: 200,
  cardH: 270,
  cardWLarge: 238,
  cardHLarge: 320,
  singleW: 238,
  singleH: 320,
  singleWLarge: 282,
  singleHLarge: 380,
  offset: 58,
  offsetLarge: 68,
  rowGap: 20,
  singleGap: 80,
  colGap: 16,
  rowPull: 80,
  singlePt: 20,
} as const;

type MeasuredFit = {
  singles: number;
  large: boolean;
  scale: number;
};

type CollageFit = MeasuredFit & {
  /** Desktop only — 10% inset. Mobile centers with CSS. */
  left: number | null;
};

const FIT_SAFE: CollageFit = { singles: 1, large: false, scale: 0.55, left: null };

function rowWidth(singles: number, large: boolean) {
  const series = large ? DESKTOP.seriesWLarge : DESKTOP.seriesW;
  const single = large ? DESKTOP.singleWLarge : DESKTOP.singleW;
  return (
    series +
    DESKTOP.rowGap +
    singles * single +
    Math.max(0, singles - 1) * DESKTOP.singleGap
  );
}

function rowHeight(large: boolean) {
  const series = large ? DESKTOP.seriesHLarge : DESKTOP.seriesH;
  // Two rows with the same pull / column gap as desktop.
  return series + DESKTOP.colGap - DESKTOP.rowPull + series;
}

/**
 * Same disposition as desktop. Prefer more singles at full size; if the
 * viewport is narrower, scale the whole composition down uniformly.
 */
function measureFit(available: number): MeasuredFit {
  for (let n = 3; n >= 2; n--) {
    if (rowWidth(n, false) <= available) {
      return { singles: n, large: false, scale: 1 };
    }
  }
  if (rowWidth(1, true) <= available) {
    return { singles: 1, large: true, scale: 1 };
  }
  if (rowWidth(1, false) <= available) {
    return { singles: 1, large: false, scale: 1 };
  }

  // Scale the desktop layout to fit. Prefer more singles while scale stays readable.
  const MIN_SCALE = 0.48;
  for (let n = 3; n >= 1; n--) {
    const natural = rowWidth(n, false);
    const scale = available / natural;
    if (n === 1 || scale >= MIN_SCALE) {
      return { singles: n, large: false, scale: Math.min(1, scale) };
    }
  }

  const natural = rowWidth(1, false);
  return {
    singles: 1,
    large: false,
    scale: Math.min(1, available / natural),
  };
}

function useCollageFit(sectionRef: RefObject<HTMLElement | null>) {
  const [fit, setFit] = useState<CollageFit>(FIT_SAFE);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const read = () => {
      const width = section.clientWidth;
      const md = window.matchMedia("(min-width: 768px)").matches;
      const sidePad = Math.min(48, Math.max(20, width * 0.05));

      let next: CollageFit;
      if (md) {
        // Desktop: same left-rail inset as before.
        const leftFrac = 0.1;
        const available = Math.max(0, width * (1 - leftFrac) - sidePad);
        const measured = measureFit(available);
        next = { ...measured, left: width * leftFrac };
      } else {
        // Mobile: equal side pads; stage is centered with left 50% + translateX.
        const available = Math.max(0, width - sidePad * 2);
        const measured = measureFit(available);
        next = { ...measured, left: null };
      }

      setFit((prev) =>
        prev.singles === next.singles &&
        prev.large === next.large &&
        Math.abs(prev.scale - next.scale) < 0.001 &&
        prev.left === next.left
          ? prev
          : next,
      );
    };

    read();
    const ro = new ResizeObserver(read);
    ro.observe(section);
    window.addEventListener("resize", read);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", read);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", read);
      vv?.removeEventListener("resize", read);
    };
  }, [sectionRef]);

  return fit;
}

function albumCovers(albumId: string) {
  const album = getAlbum(albumId);
  return album?.photos.slice(0, 3) ?? [];
}

function DoublesStack({
  albumId,
  className,
  mirror = false,
  large = false,
}: {
  albumId: string;
  className?: string;
  mirror?: boolean;
  large?: boolean;
}) {
  const album = getAlbum(albumId);
  if (!album) return null;
  const covers = albumCovers(albumId);
  const offsetStep = large ? DESKTOP.offsetLarge : DESKTOP.offset;
  const stageW = large ? DESKTOP.seriesWLarge : DESKTOP.seriesW;
  const stageH = large ? DESKTOP.seriesHLarge : DESKTOP.seriesH;
  const cardW = large ? DESKTOP.cardWLarge : DESKTOP.cardW;
  const cardH = large ? DESKTOP.cardHLarge : DESKTOP.cardH;

  return (
    <button
      type="button"
      onClick={() => openAlbumDirect(album)}
      className={`hero-enter hero-enter--stack hero-series pointer-events-auto text-left ${className ?? ""}`}
      aria-label={`Open album ${album.label}`}
    >
      <div
        className="hero-series__stage relative"
        style={{ width: stageW, height: stageH }}
      >
        {covers.map((photo, index) => {
          const isLast = index === covers.length - 1;
          const offset = index * offsetStep;
          return (
            <div
              key={photo.slug}
              className={`hero-staple absolute top-0 overflow-visible bg-ink/20 ${
                mirror ? "right-0 left-auto" : "left-0"
              }`}
              style={{
                width: cardW,
                height: cardH,
                transform: mirror
                  ? `translate(${-offset}px, ${offset}px)`
                  : `translate(${offset}px, ${offset}px)`,
                zIndex: index + 1,
              }}
            >
              <div className="relative h-full w-full overflow-hidden">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(min-width: 768px) 238px, 160px"
                  className="hero-staple__img object-cover"
                />
              </div>
              {isLast ? (
                <p
                  className={`mt-2 text-[11px] font-medium tracking-[0.06em] md:text-[12px] ${
                    mirror ? "text-right" : ""
                  }`}
                >
                  {album.label}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </button>
  );
}

function HeroSinglesRow({
  albumId,
  className,
  count,
  align,
  large = false,
}: {
  albumId: string;
  className?: string;
  count: number;
  align: "start" | "end";
  large?: boolean;
}) {
  const album = getAlbum(albumId);
  if (!album) return null;

  const photos = album.photos.slice(0, 3);
  const shown =
    align === "start"
      ? photos.slice(0, count)
      : photos.slice(Math.max(0, photos.length - count));

  return (
    <div
      className={`hero-singles flex flex-row items-start ${className ?? ""}`}
      style={{ gap: DESKTOP.singleGap, paddingTop: DESKTOP.singlePt }}
    >
      {shown.map((photo) => (
        <HeroSingle
          key={photo.slug}
          src={photo.src}
          alt={photo.alt}
          large={large}
          onOpen={() => openAlbumDirect(album, photo.slug)}
        />
      ))}
    </div>
  );
}

function HeroSingle({
  src,
  alt,
  className,
  large = false,
  onOpen,
}: {
  src: string;
  alt: string;
  className?: string;
  large?: boolean;
  onOpen: () => void;
}) {
  const w = large ? DESKTOP.singleWLarge : DESKTOP.singleW;
  const h = large ? DESKTOP.singleHLarge : DESKTOP.singleH;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`hero-enter hero-enter--stack hero-single pointer-events-auto text-left ${className ?? ""}`}
      aria-label={alt}
    >
      <div
        className="hero-staple hero-single__frame relative overflow-hidden bg-ink/20"
        style={{ width: w, height: h }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 768px) 282px, 160px"
          className="hero-staple__img object-cover"
        />
      </div>
    </button>
  );
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fit = useCollageFit(sectionRef);
  const drive = useSilkDrive(sectionRef);

  const naturalW = rowWidth(fit.singles, fit.large);
  const naturalH = rowHeight(fit.large);

  // Size hero to the collage so Sound sits at a consistent section gap.
  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    const sync = () => {
      const sectionTop = section.getBoundingClientRect().top;
      const stageBottom = stage.getBoundingClientRect().bottom;
      const bottom = stageBottom - sectionTop;
      const pad = window.matchMedia("(min-width: 768px)").matches ? 32 : 24;
      section.style.minHeight = `${Math.ceil(bottom + pad)}px`;
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(stage);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [fit.singles, fit.large, fit.scale, fit.left]);

  return (
    <section
      ref={sectionRef}
      id="image"
      data-story-hero
      data-hero-singles={fit.singles}
      className="hero-stage relative z-10 w-full overflow-visible"
    >
      {/* Keep #top for brand links while image nav scrolls here. */}
      <div id="top" className="pointer-events-none absolute inset-x-0 top-0 h-px" aria-hidden />
      <div className="hero-collage pointer-events-none absolute inset-x-0 top-0 z-10 min-h-full overflow-x-clip">
        <div
          ref={stageRef}
          className={
            fit.left == null
              ? "hero-collage__stage pointer-events-none absolute top-[22vh] left-1/2 z-40 -translate-x-1/2 overflow-hidden"
              : "hero-collage__stage pointer-events-none absolute top-[10vh] z-40 overflow-hidden"
          }
          style={{
            left: fit.left == null ? undefined : fit.left,
            width: naturalW * fit.scale,
            height: naturalH * fit.scale,
          }}
        >
          <div
            style={{
              width: naturalW,
              height: naturalH,
              transform: `scale(${fit.scale})`,
              transformOrigin: "top left",
            }}
          >
            <SilkArrive
              drive={drive}
              strength={0.7}
              warpScale={0}
              startVisible
              className="flex flex-col gap-4"
            >
              <div
                className="hero-collage__row hero-collage__row--top flex flex-row items-start"
                style={{ gap: DESKTOP.rowGap }}
              >
                <DoublesStack albumId="doubles" large={fit.large} />
                <HeroSinglesRow
                  albumId="doubles"
                  className="hero-singles--top"
                  count={fit.singles}
                  align="start"
                  large={fit.large}
                />
              </div>
              <div
                className="hero-collage__row hero-collage__row--bottom flex flex-row items-start"
                style={{ gap: DESKTOP.rowGap, marginTop: -DESKTOP.rowPull }}
              >
                <HeroSinglesRow
                  albumId="night"
                  className="hero-singles--bottom"
                  count={fit.singles}
                  align="end"
                  large={fit.large}
                />
                <DoublesStack albumId="night" mirror large={fit.large} />
              </div>
            </SilkArrive>
          </div>
        </div>
      </div>
    </section>
  );
}
