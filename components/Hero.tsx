"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type RefObject } from "react";
import { openAlbumDirect, openAlbumPicker } from "@/content/albumUi";
import { getAlbum } from "@/content/photos";

type CollageFit = {
  /** How many singles each row can show (1–3). */
  singles: number;
  /** Bump still sizes when the row is sparse. */
  large: boolean;
};

const FIT_FULL: CollageFit = { singles: 3, large: false };

/** Measure how many singles fit beside a series stack in the available width. */
function measureFit(available: number, md: boolean): CollageFit {
  const series = md ? 380 : 310;
  const rowGap = md ? 20 : 16;
  const singleGap = md ? 80 : 56;

  const tryFit = (n: number, single: number) => {
    const gaps = Math.max(0, n - 1) * singleGap;
    return series + rowGap + n * single + gaps <= available;
  };

  // Prefer more images at base size; if only one fits, grow it.
  const baseSingle = md ? 238 : 194;
  const largeSingle = md ? 282 : 224;

  for (let n = 3; n >= 2; n--) {
    if (tryFit(n, baseSingle)) return { singles: n, large: false };
  }
  if (tryFit(1, largeSingle)) return { singles: 1, large: true };
  if (tryFit(1, baseSingle)) return { singles: 1, large: false };
  return { singles: 1, large: true };
}

function useCollageFit(sectionRef: RefObject<HTMLElement | null>) {
  const [fit, setFit] = useState<CollageFit>(FIT_FULL);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const read = () => {
      const md = window.matchMedia("(min-width: 768px)").matches;
      const leftFrac = md ? 0.1 : 0.08;
      const rightPad = md ? 48 : 24;
      const width = section.clientWidth;
      const available = Math.max(0, width * (1 - leftFrac) - rightPad);
      const next = measureFit(available, md);
      setFit((prev) =>
        prev.singles === next.singles && prev.large === next.large
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
  const offsetStep = large ? 68 : 58;

  return (
    <button
      type="button"
      onClick={() => openAlbumDirect(album)}
      className={`hero-enter hero-enter--stack hero-series pointer-events-auto text-left ${className ?? ""}`}
      aria-label={`Open album ${album.label}`}
    >
      <div
        className={
          large
            ? "hero-series__stage relative h-[500px] w-[370px] md:h-[600px] md:w-[450px]"
            : "hero-series__stage relative h-[420px] w-[310px] md:h-[510px] md:w-[380px]"
        }
      >
        {covers.map((photo, index) => {
          const isLast = index === covers.length - 1;
          const offset = index * offsetStep;
          return (
            <div
              key={photo.slug}
              className={`hero-staple absolute top-0 overflow-visible bg-ink/20 ${
                large
                  ? "h-[260px] w-[194px] md:h-[320px] md:w-[238px]"
                  : "h-[220px] w-[164px] md:h-[270px] md:w-[200px]"
              } ${mirror ? "right-0 left-auto" : "left-0"}`}
              style={{
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
                  sizes="(min-width: 768px) 238px, 194px"
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
  /** How many singles to show (1–3). */
  count: number;
  /** Top row keeps from the start; bottom mirrors by keeping from the end. */
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
      className={`hero-singles flex flex-row items-start gap-14 pt-4 md:gap-20 md:pt-5 ${className ?? ""}`}
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
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`hero-enter hero-enter--stack hero-single pointer-events-auto text-left ${className ?? ""}`}
      aria-label={alt}
    >
      <div
        className={`hero-staple hero-single__frame relative overflow-hidden bg-ink/20 ${
          large
            ? "h-[300px] w-[224px] md:h-[380px] md:w-[282px]"
            : "h-[260px] w-[194px] md:h-[320px] md:w-[238px]"
        }`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 768px) 282px, 224px"
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

  // Grow the hero just enough so Sound starts under the collage + CTA.
  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    const sync = () => {
      const sectionTop = section.getBoundingClientRect().top;
      const stageBottom = stage.getBoundingClientRect().bottom;
      const bottom = stageBottom - sectionTop;
      const pad = 28;
      section.style.minHeight = `${Math.max(window.innerHeight, Math.ceil(bottom + pad))}px`;
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(stage);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [fit.singles, fit.large]);

  return (
    <section
      ref={sectionRef}
      id="top"
      data-story-hero
      data-hero-singles={fit.singles}
      className="hero-stage relative z-10 min-h-svh w-full overflow-visible"
    >
      <div className="hero-collage pointer-events-none absolute inset-x-0 top-0 z-10 min-h-full">
        <div
          ref={stageRef}
          className="hero-collage__stage pointer-events-none absolute top-[8vh] left-[8%] z-40 flex flex-col gap-3 md:top-[10vh] md:left-[10%] md:gap-4"
        >
          <div className="hero-collage__row hero-collage__row--top flex flex-row items-start gap-4 md:gap-5">
            <DoublesStack albumId="doubles" large={fit.large} />
            <HeroSinglesRow
              albumId="doubles"
              className="hero-singles--top"
              count={fit.singles}
              align="start"
              large={fit.large}
            />
          </div>
          <div className="hero-collage__row hero-collage__row--bottom -mt-16 flex flex-row items-start gap-4 md:-mt-20 md:gap-5">
            <HeroSinglesRow
              albumId="night"
              className="hero-singles--bottom"
              count={fit.singles}
              align="end"
              large={fit.large}
            />
            <DoublesStack albumId="night" mirror large={fit.large} />
          </div>
          <button
            type="button"
            onClick={() => openAlbumPicker()}
            className="hero-enter hero-enter--stack pointer-events-auto mt-2 w-fit text-[12px] font-medium tracking-[0.14em] text-ink underline decoration-ink/35 underline-offset-[5px] transition-colors hover:text-olive-deep hover:decoration-olive-deep md:mt-3 md:text-[13px]"
          >
            see more
          </button>
        </div>
      </div>
    </section>
  );
}
