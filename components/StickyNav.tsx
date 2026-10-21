"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { albums } from "@/content/photos";
import { site } from "@/content/site";
import {
  onBrandClick,
  onNavSectionClick,
  openAlbumFromNav,
} from "@/lib/navScroll";

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

export function StickyNav() {
  const [imageOpen, setImageOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // Soft wander on labels only — never on the hit target (iOS cancels taps
  // when the tapped element itself keeps transforming between touchstart/end).
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    const items = Array.from(
      bar.querySelectorAll<HTMLElement>("[data-rail-drift]"),
    );
    if (!items.length) return;

    const specs: DriftSpec[] = items.map((el, i) => {
      const album = el.classList.contains("site-nav__album-drift");
      const brand = el.classList.contains("site-nav__brand-drift");
      return {
        el,
        ampX: brand ? 4.2 : album ? 1.6 : 2.2 + (i % 3) * 1.0,
        ampY: brand ? 3.4 : album ? 1.4 : 1.8 + (i % 4) * 0.8,
        ampR: brand ? 0.7 : album ? 0.3 : 0.4 + (i % 3) * 0.2,
        speedX: 0.00028 + i * 0.00005,
        speedY: 0.00022 + i * 0.00007,
        speedR: 0.00018 + i * 0.00004,
        phaseX: i * 1.73,
        phaseY: i * 2.41,
        phaseR: i * 1.19,
        biasX: 0,
        biasY: brand ? -1.0 : album ? -0.6 : 0,
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
    setImageOpen((open) => !open);
  };

  const pickAlbum = (albumId: string) => {
    setImageOpen(false);
    openAlbumFromNav(albumId);
  };

  const goHome = (event: MouseEvent) => {
    setImageOpen(false);
    onBrandClick(event);
  };

  const goSection = (event: MouseEvent, id: string) => {
    setImageOpen(false);
    onNavSectionClick(event, id);
  };

  return (
    <header className="site-nav hero-enter hero-enter--nav fixed inset-x-0 top-0 z-[70] md:hidden">
      <div ref={barRef} className="site-nav__bar">
        <a href="/" className="site-nav__brand" onClick={goHome}>
          <span data-rail-drift className="site-nav__brand-drift">
            <span>{site.name}</span>
            <span className="site-nav__brand-soft">
              {"."}
              {site.surname}
            </span>
          </span>
        </a>

        <nav className="site-nav__links" aria-label="Site">
          <ul className="site-nav__row">
            {site.nav.map((item, index) => {
              const label =
                index < site.nav.length - 1 ? `${item.label},` : item.label;

              if (item.id === "image") {
                return (
                  <li
                    key={item.id}
                    className="site-nav__item site-nav__item--image"
                  >
                    <button
                      type="button"
                      aria-expanded={imageOpen}
                      aria-label={item.label}
                      onClick={toggleImage}
                      data-nav-origin={item.id}
                      className="site-nav__image-btn"
                    >
                      <span data-rail-drift className="site-nav__link-drift">
                        {label}
                      </span>
                    </button>
                    <div
                      className={
                        imageOpen
                          ? "site-nav__albums is-open"
                          : "site-nav__albums"
                      }
                      aria-hidden={!imageOpen}
                    >
                      <div className="site-nav__albums-clip">
                        <ul className="site-nav__albums-row">
                          {albums.map((album, albumIndex) => (
                            <li key={album.id}>
                              <button
                                type="button"
                                tabIndex={imageOpen ? 0 : -1}
                                onClick={() => pickAlbum(album.id)}
                                style={{ ["--i" as string]: albumIndex }}
                              >
                                <span
                                  className="site-nav__album-drift"
                                  data-rail-drift
                                >
                                  {album.label.replace(/^series:\s*/i, "")}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </li>
                );
              }

              return (
                <li key={item.id} className="site-nav__item">
                  <a
                    href={`#${item.id}`}
                    data-nav-origin={item.id}
                    aria-label={item.label}
                    onClick={(event) => goSection(event, item.id)}
                  >
                    <span data-rail-drift className="site-nav__link-drift">
                      {label}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
