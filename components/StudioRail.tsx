"use client";

import { useEffect, useRef, useState } from "react";
import { albums } from "@/content/photos";
import { site } from "@/content/site";
import { onNavSectionClick, openAlbumFromNav } from "@/lib/navScroll";

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
  biasX: number;
  biasY: number;
};

export function StudioRail() {
  const [imageOpen, setImageOpen] = useState(false);
  const railRef = useRef<HTMLElement>(null);

  // Soft wander on each link — Trudy-style layout, living labels.
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
      const brand = el.classList.contains("studio-rail__name");
      return {
        el,
        ampX: brand ? 4.8 : album ? 1.8 : 2.6 + (i % 3) * 1.1,
        ampY: brand ? 3.8 : album ? 1.6 : 2.0 + (i % 4) * 0.9,
        ampR: brand ? 0.75 : album ? 0.35 : 0.45 + (i % 3) * 0.22,
        speedX: 0.00028 + i * 0.00005,
        speedY: 0.00022 + i * 0.00007,
        speedR: 0.00018 + i * 0.00004,
        phaseX: i * 1.73,
        phaseY: i * 2.41,
        phaseR: i * 1.19,
        biasX: 0,
        biasY: brand ? -1.2 : album ? -0.8 : 0,
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
      <div className="studio-rail__top">
        <a href="#top" className="studio-rail__name" data-rail-drift>
          <span>{site.name}</span>
          <span className="studio-rail__name-soft">
            {"."}
            {site.surname}
          </span>
        </a>

        <nav className="studio-rail__nav" aria-label="Site">
          <ul className="studio-rail__links">
            {site.nav.map((item, index) => {
              const label =
                index < site.nav.length - 1 ? `${item.label},` : item.label;

              if (item.id === "image") {
                return (
                  <li
                    key={item.id}
                    className="studio-rail__item studio-rail__item--image"
                  >
                    <button
                      type="button"
                      className="studio-rail__nav-btn"
                      data-rail-drift
                      data-nav-origin={item.id}
                      aria-expanded={imageOpen}
                      aria-label={item.label}
                      onClick={toggleImage}
                    >
                      {label}
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
                          {albums.map((album, albumIndex) => (
                            <li key={album.id}>
                              <span
                                className="studio-rail__album-drift"
                                data-rail-drift
                              >
                                <button
                                  type="button"
                                  tabIndex={imageOpen ? 0 : -1}
                                  onClick={() => openAlbumFromNav(album.id)}
                                  style={{ ["--i" as string]: albumIndex }}
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
                <li key={item.id} className="studio-rail__item">
                  <a
                    href={`#${item.id}`}
                    data-rail-drift
                    data-nav-origin={item.id}
                    aria-label={item.label}
                    onClick={(event) => onNavSectionClick(event, item.id)}
                  >
                    {label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
