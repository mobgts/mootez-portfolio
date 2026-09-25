"use client";

import { useState } from "react";
import { albums } from "@/content/photos";
import { openAlbum } from "@/content/albumUi";
import { site } from "@/content/site";
import { StudioSliders } from "./StudioSliders";

export function StudioRail() {
  const [imageOpen, setImageOpen] = useState(false);

  return (
    <aside className="studio-rail hero-enter hero-enter--nav">
      <a href="#top" className="studio-rail__name">
        {site.name}
      </a>

      <nav className="studio-rail__nav" aria-label="Site">
        <ul>
          {site.nav.map((item) => {
            if (item.id === "image") {
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className="studio-rail__nav-btn"
                    aria-expanded={imageOpen}
                    onClick={() => setImageOpen((open) => !open)}
                  >
                    {item.label}
                  </button>
                  {imageOpen ? (
                    <ul className="studio-rail__albums">
                      {albums.map((album) => (
                        <li key={album.id}>
                          <button
                            type="button"
                            onClick={() => openAlbum(album.id)}
                          >
                            {album.label.replace(/^series:\s*/i, "")}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
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
