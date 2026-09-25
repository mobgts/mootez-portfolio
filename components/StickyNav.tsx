"use client";

import { useEffect, useState } from "react";
import { albums } from "@/content/photos";
import { openAlbum } from "@/content/albumUi";
import { site } from "@/content/site";

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

  return (
    <header
      className={`site-nav fixed inset-x-0 top-0 z-40 md:hidden transition-transform duration-300 ${
        visible ? "translate-y-0" : "pointer-events-none -translate-y-full"
      }`}
    >
      <div className="flex flex-col gap-2 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <a
            href="#top"
            className="font-sans text-xl font-medium leading-none tracking-[0.02em]"
          >
            {site.name}
          </a>
          <nav className="flex flex-1 items-center justify-end gap-4 overflow-x-auto text-[13px] font-medium tracking-[0.02em]">
            {site.nav.map((item) =>
              item.id === "image" ? (
                <button
                  key={item.id}
                  type="button"
                  aria-expanded={imageOpen}
                  onClick={() => setImageOpen((open) => !open)}
                  className="shrink-0 text-ink/75 hover:text-olive-deep"
                >
                  {item.label}
                </button>
              ) : (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="shrink-0 text-ink/75 hover:text-olive-deep"
                >
                  {item.label}
                </a>
              ),
            )}
          </nav>
        </div>
        {imageOpen ? (
          <div className="flex items-center justify-end gap-3 overflow-x-auto text-[11px] font-medium tracking-[0.08em]">
            {albums.map((album) => (
              <button
                key={album.id}
                type="button"
                onClick={() => openAlbum(album.id)}
                className="shrink-0 text-ink/70 hover:text-olive-deep"
              >
                {album.label.replace(/^series:\s*/i, "")}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}
