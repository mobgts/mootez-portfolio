"use client";

import { useEffect, useState } from "react";
import { albums } from "@/content/photos";
import { openAlbum } from "@/content/albumUi";
import { site } from "@/content/site";

function scrollToImage() {
  const target =
    document.getElementById("image") ?? document.getElementById("top");
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function StickyNav() {
  const [visible, setVisible] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.48);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleImage = () => {
    setImageOpen((open) => {
      const next = !open;
      if (next) scrollToImage();
      return next;
    });
  };

  return (
    <header
      className={`site-nav fixed inset-x-0 top-0 z-40 md:hidden ${
        visible ? "is-visible" : "is-hidden"
      }`}
    >
      <div className="flex flex-col gap-2 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <a
            href="#top"
            className="font-sans text-xl font-medium leading-none tracking-[0.02em]"
          >
            <span>{site.name}.</span>
            <span className="text-ink/70">{site.surname}</span>
          </a>
          <nav className="flex flex-1 items-center justify-end gap-4 overflow-x-auto text-[13px] font-medium tracking-[0.02em]">
            {site.nav.map((item) =>
              item.id === "image" ? (
                <button
                  key={item.id}
                  type="button"
                  aria-expanded={imageOpen}
                  onClick={toggleImage}
                  data-nav-origin={item.id}
                  className="site-nav__image-btn shrink-0 text-ink hover:text-olive-deep"
                >
                  <span>{item.label}</span>
                  <span
                    className={
                      imageOpen
                        ? "site-nav__more site-nav__more--open"
                        : "site-nav__more"
                    }
                    aria-hidden
                  >
                    <svg viewBox="0 0 10 6" fill="none" aria-hidden>
                      <path d="M1 1.25L5 4.75L9 1.25" />
                    </svg>
                  </span>
                </button>
              ) : (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  data-nav-origin={item.id}
                  className="shrink-0 text-ink hover:text-olive-deep"
                >
                  {item.label}
                </a>
              ),
            )}
          </nav>
        </div>

        <div
          className={
            imageOpen
              ? "site-nav__albums is-open"
              : "site-nav__albums"
          }
          aria-hidden={!imageOpen}
        >
          <div className="site-nav__albums-clip">
            <div className="site-nav__albums-row">
              {albums.map((album, index) => (
                <button
                  key={album.id}
                  type="button"
                  tabIndex={imageOpen ? 0 : -1}
                  onClick={() => openAlbum(album.id)}
                  className="shrink-0 text-ink/80 hover:text-olive-deep"
                  style={{ ["--i" as string]: index }}
                >
                  {album.label.replace(/^series:\s*/i, "")}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
