"use client";

import { useEffect, useState } from "react";
import { heroPhoto } from "@/content/photos";
import { site } from "@/content/site";
import { HeroStill } from "./HeroStill";

export function Hero() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setReady(true);
      return;
    }
    const id = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <section
      id="top"
      className={`hero-stage relative h-svh min-h-[640px] w-full overflow-hidden bg-ink${
        ready ? " is-ready" : ""
      }`}
    >
      <HeroStill src={heroPhoto.src} alt={heroPhoto.alt} open={open} landing />

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

        <nav
          aria-label="Site"
          data-cursor-through
          className="hero-nav-embed hero-enter hero-enter--nav pointer-events-auto absolute top-[48%] left-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
          onPointerEnter={() => setOpen(true)}
          onPointerLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setOpen(false);
            }
          }}
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
  );
}
