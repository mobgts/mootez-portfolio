"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import {
  closeSeriesExpand,
  getSeriesExpand,
  openSeriesExpand,
  subscribeSeriesExpand,
  type FrameSnapshot,
} from "@/content/seriesExpandUi";
import { albums, getAlbum } from "@/content/photos";
import type { Album, Photo } from "@/content/types";

const EXIT_MS = 420;

function photoAspectClass(span: Photo["span"]) {
  if (span === "wide") return "aspect-[3/2]";
  if (span === "square") return "aspect-square";
  return "aspect-[3/4]";
}

function nextAlbum(album: Album) {
  const index = albums.findIndex((entry) => entry.id === album.id);
  if (index < 0 || albums.length < 2) return null;
  return albums[(index + 1) % albums.length] ?? null;
}

function SeriesExpandView({
  album,
  fromRect,
  open,
  onClose,
  onOpenAlbum,
}: {
  album: Album;
  fromRect?: FrameSnapshot;
  open: boolean;
  onClose: () => void;
  onOpenAlbum: (albumId: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const next = nextAlbum(album);

  const fromX =
    fromRect != null ? fromRect.left + fromRect.width / 2 : undefined;
  const fromY =
    fromRect != null ? fromRect.top + fromRect.height / 2 : undefined;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollTop = 0;
  }, [album.id, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  return (
    <div
      className={`series-expand${open ? " is-open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${album.id} gallery`}
      aria-hidden={!open}
      style={
        {
          ["--from-x" as string]: fromX != null ? `${fromX}px` : "50%",
          ["--from-y" as string]: fromY != null ? `${fromY}px` : "42%",
        } as CSSProperties
      }
    >
      <button
        type="button"
        className="series-expand__wash"
        aria-label="Close gallery"
        onClick={onClose}
      />

      <div ref={scrollerRef} className="series-expand__scroller">
        <div className="series-expand__panel">
          <div className="series-expand__grid">
            {album.photos.map((photo, index) => (
              <figure
                key={photo.slug}
                data-expand-slug={photo.slug}
                className="series-expand__shot"
                style={{ ["--i" as string]: index }}
              >
                <div
                  className={`series-expand__frame relative overflow-hidden bg-[#221c16] ${photoAspectClass(photo.span)}`}
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    quality={85}
                    sizes="(min-width: 768px) 260px, 44vw"
                    className="object-cover"
                    priority={index < 4}
                  />
                </div>
              </figure>
            ))}
          </div>

          <footer className="series-expand__footer">
            <button
              type="button"
              className="series-expand__nav"
              onClick={onClose}
            >
              close
            </button>
            {next ? (
              <button
                type="button"
                className="series-expand__nav series-expand__nav--next"
                onClick={() => onOpenAlbum(next.id)}
              >
                {next.id}
              </button>
            ) : null}
          </footer>
        </div>
      </div>
    </div>
  );
}

export function SeriesExpandHost() {
  const ui = useSyncExternalStore(
    subscribeSeriesExpand,
    getSeriesExpand,
    getSeriesExpand,
  );
  const open = Boolean(ui.albumId);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const lastId = useRef(ui.albumId);
  const lastRect = useRef(ui.fromRect);

  if (ui.albumId) {
    lastId.current = ui.albumId;
    lastRect.current = ui.fromRect;
  }

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setVisible(true));
      });
      return () => window.cancelAnimationFrame(id);
    }
    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const root = document.documentElement;
    if (visible) root.classList.add("series-expand-open");
    else root.classList.remove("series-expand-open");
    return () => root.classList.remove("series-expand-open");
  }, [visible]);

  if (!mounted || !lastId.current) return null;

  const album = getAlbum(lastId.current);
  if (!album) return null;

  return (
    <SeriesExpandView
      key={album.id}
      album={album}
      fromRect={lastRect.current}
      open={visible}
      onClose={closeSeriesExpand}
      onOpenAlbum={(albumId) => openSeriesExpand(albumId)}
    />
  );
}
