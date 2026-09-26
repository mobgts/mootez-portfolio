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

export function StudioRail() {
  const [imageOpen, setImageOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const padRef = useRef(0);
  const openRef = useRef(false);
  const settleTimer = useRef(0);

  // Pin the list top so "image" stays put while albums open/close below.
  useEffect(() => {
    const nav = navRef.current;
    const list = listRef.current;
    if (!nav || !list) return;

    const measure = () => {
      if (openRef.current) return;
      const pad = Math.max(0, (nav.clientHeight - list.clientHeight) / 2);
      padRef.current = pad;
      nav.style.paddingTop = `${pad}px`;
    };

    openRef.current = imageOpen;
    nav.style.paddingTop = `${padRef.current}px`;
    window.clearTimeout(settleTimer.current);

    if (imageOpen) {
      // Freeze pad for the whole open state — no re-center.
      return;
    }

    // First paint or just closed: hold pad through the collapse, then
    // re-measure only once the height animation has finished.
    if (padRef.current === 0) {
      measure();
    }

    settleTimer.current = window.setTimeout(measure, 520);

    const ro = new ResizeObserver(() => {
      if (openRef.current) return;
      measure();
    });
    ro.observe(nav);
    return () => {
      window.clearTimeout(settleTimer.current);
      ro.disconnect();
    };
  }, [imageOpen]);

  const toggleImage = () => {
    setImageOpen((open) => {
      const next = !open;
      if (next) scrollToImage();
      return next;
    });
  };

  return (
    <aside className="studio-rail hero-enter hero-enter--nav">
      <a href="#top" className="studio-rail__name">
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
                        {albums.map((album) => (
                          <li key={album.id}>
                            <button
                              type="button"
                              tabIndex={imageOpen ? 0 : -1}
                              onClick={() => openAlbum(album.id)}
                            >
                              {album.label.replace(/^series:\s*/i, "")}
                            </button>
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
                <a href={`#${item.id}`}>{item.label}</a>
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
