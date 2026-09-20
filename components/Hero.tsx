"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { About } from "./About";

const heroStack = [
  {
    src: "/photos/hero-stack-01.jpg",
    alt: "Forest still, embrace on a fallen trunk",
  },
  {
    src: "/photos/hero-stack-02.jpg",
    alt: "Forest still, seated on a fallen trunk",
  },
  {
    src: "/photos/hero-stack-03.jpg",
    alt: "Forest still, close embrace on a fallen trunk",
  },
] as const;

export function Hero() {
  const [active, setActive] = useState<(typeof heroStack)[number] | null>(null);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        const index = heroStack.findIndex((photo) => photo.src === active.src);
        const next =
          event.key === "ArrowRight"
            ? heroStack[(index + 1) % heroStack.length]
            : heroStack[(index - 1 + heroStack.length) % heroStack.length];
        setActive(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <>
      <section
        id="top"
        data-story-hero
        className="hero-stage relative z-10 h-svh min-h-[640px] w-full"
      >
        <div className="hero-type pointer-events-none absolute inset-0 z-10 flex flex-col">
          <div className="relative px-5 pt-5 md:px-8 md:pt-8">
            <h1 className="hero-enter hero-enter--title pointer-events-auto font-sans text-[12vw] font-medium leading-[0.9] tracking-[0.01em] md:text-[6.8rem] lg:text-[8rem]">
              {site.name}
            </h1>
            <p className="hero-enter hero-enter--copy pointer-events-auto mt-4 max-w-[220px] text-[11px] font-medium leading-4 tracking-[0.02em]">
              {site.manifesto}
            </p>
            <span className="hero-enter hero-enter--year pointer-events-auto absolute right-5 top-8 text-sm font-medium tracking-[0.18em] md:right-8">
              {site.year}
            </span>
          </div>

          <div
            className="hero-enter hero-enter--stack pointer-events-auto absolute top-[38%] left-[12%] z-20 md:top-[40%] md:left-[14%]"
            aria-label="Series: doubles"
          >
            <div className="relative h-[240px] w-[190px] md:h-[290px] md:w-[230px]">
              {heroStack.map((photo, index) => (
                <button
                  key={photo.src}
                  type="button"
                  onClick={() => setActive(photo)}
                  className="hero-staple absolute top-0 left-0 h-[136px] w-[102px] overflow-hidden bg-ink/20 md:h-[164px] md:w-[124px]"
                  style={{
                    transform: `translate(${index * 40}px, ${index * 40}px)`,
                    zIndex: index + 1,
                  }}
                  aria-label={`Open ${photo.alt}`}
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="124px"
                    className="hero-staple__img object-cover"
                  />
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] font-medium tracking-[0.06em] md:mt-3 md:text-[12px]">
              Series: doubles
            </p>
          </div>

          <nav
            aria-label="Site"
            data-cursor-through
            className="hero-nav-embed hero-enter hero-enter--nav pointer-events-auto absolute top-[48%] left-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
          >
            <ul>
              {site.nav.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`}>{item.label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hero-enter hero-enter--meta pointer-events-auto relative z-30 mt-auto flex items-end justify-between px-5 pb-5 text-[10px] font-medium tracking-[0.04em] md:px-8 md:pb-8">
            <span>{site.coords.lat}</span>
            <span>{site.coords.lng}</span>
          </div>
        </div>
      </section>

      <About />

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-5 md:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={active.alt}
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
                Series: doubles
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
                className="hero-staple__img object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
