"use client";

import { useEffect, useRef, useState } from "react";
import { albums } from "@/content/photos";
import { openAlbum } from "@/content/albumUi";
import { site } from "@/content/site";
import { StudioSliders } from "./StudioSliders";

function scrollToImage() {
  const target =
    document.getElementById("image") ?? document.getElementById("top");
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  /** Shift the wander so albums stay clear of the clip / mask. */
  biasX: number;
  biasY: number;
};

export function StudioRail() {
  const [imageOpen, setImageOpen] = useState(false);
  const railRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const padRef = useRef(0);
  const openRef = useRef(false);
  const settlingRef = useRef(false);
  const settleTimer = useRef(0);

  // Pin the list top so "image" stays put while albums open/close below.
  useEffect(() => {
    const nav = navRef.current;
    const list = listRef.current;
    if (!nav || !list) return;

    const measure = () => {
      // Skip while open or mid-collapse — measuring a partial album height
      // shrinks paddingTop and yanks "image" up before it settles.
      if (openRef.current || settlingRef.current) return;
      const pad = Math.max(0, (nav.clientHeight - list.clientHeight) / 2);
      padRef.current = pad;
      nav.style.paddingTop = `${pad}px`;
    };

    openRef.current = imageOpen;
    nav.style.paddingTop = `${padRef.current}px`;
    window.clearTimeout(settleTimer.current);

    if (imageOpen) {
      settlingRef.current = false;
      // Freeze pad for the whole open state — no re-center.
      return;
    }

    // First paint: center once. After close: hold pad through the collapse
    // (ignore ResizeObserver), then re-measure only when height is stable.
    if (padRef.current === 0) {
      measure();
    } else {
      settlingRef.current = true;
      settleTimer.current = window.setTimeout(() => {
        settlingRef.current = false;
        measure();
      }, 620);
    }

    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => {
      window.clearTimeout(settleTimer.current);
      settlingRef.current = false;
      ro.disconnect();
    };
  }, [imageOpen]);

  // Soft wander on rail labels / knobs — stays live even while hovered.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    const items = Array.from(
      rail.querySelectorAll<HTMLElement>("[data-rail-drift]"),
    );
    if (!items.length) return;

    const specs: DriftSpec[] = items.map((el, i) => {
      const album = el.classList.contains("studio-rail__album-drift");
      return {
        el,
        ampX: album ? 2.4 : 3.2 + (i % 3) * 1.4,
        ampY: album ? 2.0 : 2.4 + (i % 4) * 1.1,
        ampR: album ? 0.4 : 0.55 + (i % 3) * 0.28,
        speedX: 0.00032 + i * 0.00006,
        speedY: 0.00026 + i * 0.00008,
        speedR: 0.0002 + i * 0.00005,
        phaseX: i * 1.73,
        phaseY: i * 2.41,
        phaseR: i * 1.19,
        // Keep album labels left/up so they don't clip on the mask or bottom.
        biasX: album ? -1.6 : 0,
        biasY: album ? -1.2 : 0,
      };
    });

    let raf = 0;
    const driftStart = performance.now();

    const tick = (now: number) => {
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

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      for (const s of specs) s.el.style.transform = "";
    };
  }, []);

  const toggleImage = () => {
    setImageOpen((open) => {
      const next = !open;
      if (next) scrollToImage();
      return next;
    });
  };

  return (
    <aside ref={railRef} className="studio-rail hero-enter hero-enter--nav">
      <a href="#top" className="studio-rail__name" data-rail-drift>
        <span>{site.name}.</span>
        <span className="studio-rail__name-soft">{site.surname}</span>
      </a>

      <nav ref={navRef} className="studio-rail__nav" aria-label="Site">
        <ul ref={listRef}>
          {site.nav.map((item) => {
            if (item.id === "image") {
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className="studio-rail__nav-btn"
                    data-rail-drift
                    data-nav-origin={item.id}
                    aria-expanded={imageOpen}
                    onClick={toggleImage}
                  >
                    <span>{item.label}</span>
                    <span
                      className={
                        imageOpen
                          ? "studio-rail__more studio-rail__more--open"
                          : "studio-rail__more"
                      }
                      aria-hidden
                    >
                      <svg viewBox="0 0 10 6" fill="none" aria-hidden>
                        <path d="M1 1.25L5 4.75L9 1.25" />
                      </svg>
                    </span>
                  </button>
                  <ul
                    className={
                      imageOpen
                        ? "studio-rail__albums is-open"
                        : "studio-rail__albums"
                    }
                    aria-hidden={!imageOpen}
                  >
                    <li className="studio-rail__albums-clip">
                      <ul className="studio-rail__albums-list">
                        {albums.map((album, index) => (
                          <li key={album.id}>
                            <span
                              className="studio-rail__album-drift"
                              data-rail-drift
                            >
                              <button
                                type="button"
                                tabIndex={imageOpen ? 0 : -1}
                                onClick={() => openAlbum(album.id)}
                                style={{ ["--i" as string]: index }}
                              >
                                {album.label.replace(/^series:\s*/i, "")}
                              </button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  </ul>
                </li>
              );
            }

            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  data-rail-drift
                  data-nav-origin={item.id}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="studio-rail__sliders">
        <StudioSliders />
      </div>
    </aside>
  );
}
