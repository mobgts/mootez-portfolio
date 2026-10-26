"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type TouchEvent,
} from "react";
import {
  closeSeriesExpand,
  getSeriesExpand,
  subscribeSeriesExpand,
  type FrameSnapshot,
} from "@/content/seriesExpandUi";
import { getAlbum } from "@/content/photos";
import type { Album, Photo } from "@/content/types";

const EXIT_MS = 420;
/** Fade the lightbox out before restoring scatter scroll. */
const VIEWER_CLOSE_MS = 480;
/** Match ImageSeries NAV_EXIT_MS — scatter leaves left as About/Contact arrive. */
const NAV_EXIT_MS = 820;
/** Triple the scatter so scroll can wrap without a seam. */
const LOOP_COPIES = 3;
/** Horizontal finger travel (px) that steps the single-photo viewer. */
const SWIPE_MIN_PX = 48;

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Cristina-style beats: left mid → right mid → small left → pair/large → large mid. */
type ScatterPos = 1 | 2 | 3 | 4 | 5;

type ScatterRow =
  | { key: string; pos: ScatterPos; photos: [Photo]; paired?: false }
  | { key: string; pos: 4 | 5; photos: [Photo, Photo]; paired: true };

type FromFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function photoAspectClass(span: Photo["span"]) {
  if (span === "wide") return "aspect-[3/2]";
  if (span === "square") return "aspect-square";
  return "aspect-[3/4]";
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Editorial scatter — not a grid. Cycles five placement beats; longer albums
 * get occasional side-by-side pairs on beats 4 and 5.
 */
function buildScatterRows(photos: Photo[]): ScatterRow[] {
  const rows: ScatterRow[] = [];
  let i = 0;
  let beat = 0;
  const allowPairs = photos.length >= 5;

  while (i < photos.length) {
    const pos = ((beat % 5) + 1) as ScatterPos;
    const canPair =
      allowPairs &&
      (pos === 4 || pos === 5) &&
      i + 1 < photos.length;

    if (canPair) {
      rows.push({
        key: `${photos[i]!.slug}+${photos[i + 1]!.slug}`,
        pos,
        photos: [photos[i]!, photos[i + 1]!],
        paired: true,
      });
      i += 2;
    } else {
      rows.push({
        key: photos[i]!.slug,
        pos,
        photos: [photos[i]!],
      });
      i += 1;
    }
    beat += 1;
  }

  return rows;
}

function ScatterFrame({
  photo,
  index,
  sizes,
  onOpen,
}: {
  photo: Photo;
  index: number;
  sizes: string;
  onOpen: (slug: string, el: HTMLElement) => void;
}) {
  return (
    <button
      type="button"
      data-expand-slug={photo.slug}
      className="series-expand__shot"
      style={{ ["--i" as string]: index }}
      aria-label={photo.alt}
      onClick={(event) => onOpen(photo.slug, event.currentTarget)}
    >
      <span
        className={`series-expand__frame relative block overflow-hidden bg-[#221c16] ${photoAspectClass(photo.span)}`}
      >
        <Image
          src={photo.src}
          alt=""
          fill
          quality={85}
          sizes={sizes}
          className="object-cover"
          priority={index < 2}
          loading={index < 2 ? "eager" : "lazy"}
        />
      </span>
    </button>
  );
}

function ScatterRows({
  rows,
  copy,
  animate,
  onOpen,
}: {
  rows: ScatterRow[];
  copy: number;
  animate: boolean;
  onOpen: (slug: string, el: HTMLElement) => void;
}) {
  let shotIndex = copy * 64;

  return (
    <>
      {rows.map((row) => {
        if (row.paired) {
          const left = shotIndex++;
          const right = shotIndex++;
          return (
            <div
              key={`${copy}-${row.key}`}
              className="series-expand__row series-expand__row--pair"
              data-pos={row.pos}
            >
              <ScatterFrame
                photo={row.photos[0]}
                index={animate ? left % 64 : 99}
                sizes="(min-width: 768px) 32vw, 70vw"
                onOpen={onOpen}
              />
              <ScatterFrame
                photo={row.photos[1]}
                index={animate ? right % 64 : 99}
                sizes="(min-width: 768px) 12vw, 36vw"
                onOpen={onOpen}
              />
            </div>
          );
        }

        const index = shotIndex++;
        return (
          <div
            key={`${copy}-${row.key}`}
            className="series-expand__row"
            data-pos={row.pos}
          >
            <ScatterFrame
              photo={row.photos[0]}
              index={animate ? index % 64 : 99}
              sizes="(min-width: 768px) 26vw, 72vw"
              onOpen={onOpen}
            />
          </div>
        );
      })}
    </>
  );
}

function SeriesExpandView({
  album,
  fromRect,
  open,
  navExit,
  onClose,
}: {
  album: Album;
  fromRect?: FrameSnapshot;
  open: boolean;
  navExit: "about" | "contact" | null;
  onClose: () => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const washRef = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => buildScatterRows(album.photos), [album.photos]);
  const photos = album.photos;
  const total = photos.length;

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [fromFrame, setFromFrame] = useState<FromFrame | null>(null);
  /** After first entrance, never replay the album load animation. */
  const [scatterReady, setScatterReady] = useState(false);
  const viewerOpen = viewerIndex != null;
  const viewerTimers = useRef<number[]>([]);
  const savedScrollTop = useRef(0);
  const savedSlug = useRef<string | null>(null);
  /** When closing the viewer, loop restart must resume here — not midStart. */
  const resumeScrollTop = useRef<number | null>(null);

  const fromX =
    fromRect != null ? fromRect.left + fromRect.width / 2 : undefined;
  const fromY =
    fromRect != null ? fromRect.top + fromRect.height / 2 : undefined;

  const clearViewerTimers = useCallback(() => {
    for (const id of viewerTimers.current) window.clearTimeout(id);
    viewerTimers.current = [];
  }, []);

  const clearOriginMarks = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    track
      .querySelectorAll<HTMLElement>("[data-viewer-origin]")
      .forEach((shot) => shot.removeAttribute("data-viewer-origin"));
  }, []);

  const markOriginShots = useCallback((slug: string) => {
    const track = trackRef.current;
    if (!track) return;
    clearOriginMarks();
    track
      .querySelectorAll<HTMLElement>(`[data-expand-slug="${slug}"]`)
      .forEach((shot) => shot.setAttribute("data-viewer-origin", "1"));
  }, [clearOriginMarks]);

  /** Put the scatter scroll back exactly where the click happened. */
  const restoreScatterPlace = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTop = savedScrollTop.current;
  }, []);

  const openViewer = useCallback(
    (slug: string, el: HTMLElement) => {
      const index = photos.findIndex((photo) => photo.slug === slug);
      if (index < 0) return;
      clearViewerTimers();
      const scroller = scrollerRef.current;
      if (scroller) savedScrollTop.current = scroller.scrollTop;
      savedSlug.current = slug;
      setScatterReady(true);
      const rect = el.getBoundingClientRect();
      markOriginShots(slug);
      setFromFrame({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
      setViewerIndex(index);
      setViewerVisible(false);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setViewerVisible(true));
      });
    },
    [photos, clearViewerTimers, markOriginShots],
  );

  const closeViewer = useCallback(() => {
    clearViewerTimers();
    // Hand the saved place to the loop effect so it won't re-prime to album start.
    resumeScrollTop.current = savedScrollTop.current;
    restoreScatterPlace();
    setViewerVisible(false);
    viewerTimers.current.push(
      window.setTimeout(() => {
        resumeScrollTop.current = savedScrollTop.current;
        restoreScatterPlace();
        setViewerIndex(null);
        setFromFrame(null);
        clearOriginMarks();
      }, VIEWER_CLOSE_MS),
    );
  }, [clearViewerTimers, clearOriginMarks, restoreScatterPlace]);

  const stepViewer = useCallback(
    (delta: number) => {
      if (total < 1 || viewerIndex == null) return;
      setViewerIndex((i) => {
        if (i == null) return i;
        return (i + delta + total) % total;
      });
      // After the first open, leave the gather origin so swaps stay centered.
      setFromFrame(null);
    },
    [total, viewerIndex],
  );

  const viewerSwipe = useRef<{ x: number; y: number; t: number } | null>(null);

  const onViewerTouchStart = useCallback((event: TouchEvent) => {
    const t = event.touches[0];
    viewerSwipe.current =
      t && event.touches.length === 1
        ? { x: t.clientX, y: t.clientY, t: event.timeStamp }
        : null;
  }, []);

  const onViewerTouchEnd = useCallback(
    (event: TouchEvent) => {
      const start = viewerSwipe.current;
      viewerSwipe.current = null;
      const t = event.changedTouches[0];
      if (!start || !t || !viewerVisible) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const fast = event.timeStamp - start.t < 260;
      const far = Math.abs(dx) > (fast ? 24 : SWIPE_MIN_PX);
      if (!far || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      // Finger left → next photo, right → previous.
      stepViewer(dx < 0 ? 1 : -1);
    },
    [viewerVisible, stepViewer],
  );

  useEffect(() => {
    if (!open || navExit) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, navExit]);

  // Nav leave: drop the single-photo viewer so the scatter can fly out cleanly.
  useEffect(() => {
    if (!navExit || !viewerOpen) return;
    clearViewerTimers();
    setViewerVisible(false);
    setViewerIndex(null);
    setFromFrame(null);
    clearOriginMarks();
  }, [navExit, viewerOpen, clearViewerTimers, clearOriginMarks]);

  /**
   * Album leaves left; About/Contact enter from the right.
   * Soft crossfade — photos stay readable until the section is mostly in.
   */
  useEffect(() => {
    if (!navExit || !open) return;
    const panel = trackRef.current;
    const wash = washRef.current;
    if (!panel) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      panel.style.opacity = "0";
      if (wash) wash.style.opacity = "0";
      return;
    }

    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const spacing = mobile
      ? Math.min(window.innerWidth * 0.98, 420)
      : Math.min(window.innerWidth * 0.44, 520);
    const travel = 1.9 * spacing;
    // About and Contact both come in from the right, so the scatter leaves left.
    const dir = -1;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const raw = clamp01((now - start) / NAV_EXIT_MS);
      const ease = easeInOutCubic(raw);
      // Stay solid through most of the slide; fade only at the end.
      const fadeT = clamp01((ease - 0.55) / 0.45);
      const fade = easeInOutCubic(fadeT);
      panel.style.transform = `translate3d(${(dir * ease * travel).toFixed(2)}px, 0, 0)`;
      panel.style.opacity = (1 - fade).toFixed(3);
      if (wash) wash.style.opacity = (1 - fade * 0.95).toFixed(3);
      if (raw < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      panel.style.transform = "";
      panel.style.opacity = "";
      if (wash) wash.style.opacity = "";
    };
  }, [navExit, open]);

  useEffect(() => {
    if (!open || navExit) return;
    const onKey = (event: KeyboardEvent) => {
      if (viewerOpen) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeViewer();
          return;
        }
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          stepViewer(1);
          return;
        }
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          stepViewer(-1);
          return;
        }
        return;
      }
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, navExit, onClose, viewerOpen, closeViewer, stepViewer]);

  // Wheel through the set while the viewer is open.
  useEffect(() => {
    if (!open || !viewerOpen || !viewerVisible) return;
    let locked = false;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (locked) return;
      if (Math.abs(event.deltaY) < 8) return;
      locked = true;
      stepViewer(event.deltaY > 0 ? 1 : -1);
      window.setTimeout(() => {
        locked = false;
      }, 420);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [open, viewerOpen, viewerVisible, stepViewer]);

  // Seamless loop: three equal copies; stay parked in the middle band.
  useEffect(() => {
    if (!open || viewerOpen) return;
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (!scroller || !track) return;

    let wrapping = false;
    let lastCycle = 0;

    const loops = () =>
      Array.from(
        track.querySelectorAll<HTMLElement>("[data-series-loop]"),
      );

    const metrics = () => {
      const items = loops();
      const first = items[0];
      const mid = items[1];
      if (!first || !mid) return null;
      const midStart = mid.offsetTop;
      const cycle = midStart - first.offsetTop;
      if (cycle < 8) return null;
      return { cycle, midStart };
    };

    const normalize = (preferPrime = false) => {
      const m = metrics();
      if (!m) return;
      const { cycle, midStart } = m;
      wrapping = true;
      const resume = resumeScrollTop.current;
      if (resume != null) {
        scroller.scrollTop = resume;
        resumeScrollTop.current = null;
      } else if (preferPrime || !lastCycle) {
        scroller.scrollTop = midStart;
      } else {
        const rel = ((scroller.scrollTop - midStart) % cycle + cycle) % cycle;
        scroller.scrollTop = midStart + rel;
      }
      lastCycle = cycle;
      wrapping = false;
    };

    const onScroll = () => {
      if (wrapping) return;
      const m = metrics();
      if (!m) return;
      const { cycle, midStart } = m;
      const y = scroller.scrollTop;

      if (y < midStart) {
        wrapping = true;
        scroller.scrollTop = y + cycle;
        wrapping = false;
      } else if (y >= midStart + cycle) {
        wrapping = true;
        scroller.scrollTop = y - cycle;
        wrapping = false;
      }
    };

    const onResize = () => normalize(false);

    // Closing a photo sets resumeScrollTop — honor it instead of jumping to start.
    const shouldResume = resumeScrollTop.current != null;
    normalize(!shouldResume);
    const raf = window.requestAnimationFrame(() => {
      if (resumeScrollTop.current != null || shouldResume) {
        wrapping = true;
        scroller.scrollTop = savedScrollTop.current;
        wrapping = false;
        const m = metrics();
        if (m) lastCycle = m.cycle;
        resumeScrollTop.current = null;
      } else {
        normalize(true);
      }
    });

    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(onResize)
        : null;
    ro?.observe(track);

    return () => {
      window.cancelAnimationFrame(raf);
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [open, album.id, rows, viewerOpen]);

  useEffect(() => {
    if (!open) {
      clearViewerTimers();
      setViewerIndex(null);
      setViewerVisible(false);
      setFromFrame(null);
      clearOriginMarks();
      savedSlug.current = null;
      resumeScrollTop.current = null;
      setScatterReady(false);
      return;
    }
    // Mark settled after the first entrance so closing a photo won't reload it.
    const id = window.setTimeout(() => setScatterReady(true), 900);
    return () => window.clearTimeout(id);
  }, [open, album.id, clearViewerTimers, clearOriginMarks]);

  useEffect(() => {
    const root = document.documentElement;
    if (viewerOpen) root.classList.add("series-viewer-open");
    else root.classList.remove("series-viewer-open");
    return () => root.classList.remove("series-viewer-open");
  }, [viewerOpen]);

  useEffect(() => () => clearViewerTimers(), [clearViewerTimers]);

  const activePhoto =
    viewerIndex != null ? photos[viewerIndex] ?? null : null;

  const viewerStyle = {
    ["--from-left" as string]: fromFrame ? `${fromFrame.left}px` : "50%",
    ["--from-top" as string]: fromFrame ? `${fromFrame.top}px` : "50%",
    ["--from-w" as string]: fromFrame ? `${fromFrame.width}px` : "40vw",
    ["--from-h" as string]: fromFrame ? `${fromFrame.height}px` : "60vh",
  } as CSSProperties;

  const leaving = Boolean(navExit);

  return (
    <div
      className={`series-expand${open ? " is-open" : ""}${
        leaving ? " is-nav-exit" : ""
      }${scatterReady ? " is-scatter-ready" : ""}${
        viewerOpen ? " is-viewing" : ""
      }${viewerVisible ? " is-viewer-in" : ""}`}
      role="dialog"
      aria-modal={!leaving}
      aria-label={`${album.id} gallery`}
      aria-hidden={!open || leaving}
      style={
        {
          ["--from-x" as string]: fromX != null ? `${fromX}px` : "50%",
          ["--from-y" as string]: fromY != null ? `${fromY}px` : "42%",
          ...viewerStyle,
        } as CSSProperties
      }
    >
      <div ref={washRef} className="series-expand__wash" aria-hidden />

      <div ref={scrollerRef} className="series-expand__scroller">
        <div ref={trackRef} className="series-expand__panel">
          {Array.from({ length: LOOP_COPIES }, (_, copy) => (
            <div
              key={copy}
              className="series-expand__loop"
              data-series-loop={copy}
            >
              <div className="series-expand__scatter">
                <ScatterRows
                  rows={rows}
                  copy={copy}
                  animate={
                    copy === 1 && open && !scatterReady && !viewerOpen && !leaving
                  }
                  onOpen={openViewer}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {!viewerOpen && !leaving ? (
        <button
          type="button"
          className="series-expand__close"
          onClick={onClose}
        >
          close
        </button>
      ) : null}

      {viewerOpen && activePhoto ? (
        <div
          className="series-viewer"
          style={viewerStyle}
          onTouchStart={onViewerTouchStart}
          onTouchEnd={onViewerTouchEnd}
          onTouchCancel={() => {
            viewerSwipe.current = null;
          }}
        >
          {/* Tap outside the photo closes; the photo itself swallows taps. */}
          <div
            className="series-viewer__dim"
            aria-hidden
            onClick={() => {
              if (viewerVisible) closeViewer();
            }}
          />

          <div className="series-viewer__stage" aria-live="polite">
            <div key={activePhoto.slug} className="series-viewer__frame">
              <Image
                src={activePhoto.src}
                alt={activePhoto.alt}
                width={
                  activePhoto.span === "wide"
                    ? 2400
                    : activePhoto.span === "square"
                      ? 2000
                      : 1800
                }
                height={
                  activePhoto.span === "wide"
                    ? 1600
                    : activePhoto.span === "square"
                      ? 2000
                      : 2400
                }
                quality={95}
                sizes="(min-width: 768px) 70vw, 100vw"
                className="series-viewer__img"
                priority
              />
            </div>
          </div>

          <div className="series-viewer__chrome">
            <button
              type="button"
              className="series-viewer__btn"
              onClick={closeViewer}
            >
              close
            </button>

            <div className="series-viewer__end">
              <p className="series-viewer__count" aria-hidden>
                <span>{pad2((viewerIndex ?? 0) + 1)}</span>
                <span className="series-viewer__count-sep">–</span>
                <span>{pad2(total)}</span>
              </p>

              <div className="series-viewer__steps">
                <button
                  type="button"
                  className="series-viewer__btn"
                  onClick={() => stepViewer(-1)}
                >
                  prev
                </button>
                <button
                  type="button"
                  className="series-viewer__btn"
                  onClick={() => stepViewer(1)}
                >
                  next
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
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
  const navExit = ui.navExit ?? null;
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const lastId = useRef(ui.albumId);
  const lastRect = useRef(ui.fromRect);
  const leftViaNav = useRef(false);

  if (ui.albumId) {
    lastId.current = ui.albumId;
    lastRect.current = ui.fromRect;
  }

  useEffect(() => {
    if (open) {
      leftViaNav.current = false;
      setMounted(true);
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setVisible(true));
      });
      return () => window.cancelAnimationFrame(id);
    }
    setVisible(false);
    // Nav exit already flew the scatter away — unmount immediately.
    if (leftViaNav.current) {
      leftViaNav.current = false;
      setMounted(false);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Finish the rightward leave, then clear expand state.
  useEffect(() => {
    if (!navExit) return;
    leftViaNav.current = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(
      () => closeSeriesExpand(),
      reduce ? 0 : NAV_EXIT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [navExit]);

  useEffect(() => {
    const root = document.documentElement;
    // Keep expand-open through nav-exit so About stays covered until reveal.
    if (visible) root.classList.add("series-expand-open");
    else root.classList.remove("series-expand-open");
    if (visible && navExit) root.classList.add("series-expand-nav-exit");
    else root.classList.remove("series-expand-nav-exit");
    return () => {
      root.classList.remove("series-expand-open");
      root.classList.remove("series-expand-nav-exit");
    };
  }, [visible, navExit]);

  if (!mounted || !lastId.current) return null;

  const album = getAlbum(lastId.current);
  if (!album) return null;

  return (
    <SeriesExpandView
      key={album.id}
      album={album}
      fromRect={lastRect.current}
      open={visible}
      navExit={navExit}
      onClose={closeSeriesExpand}
    />
  );
}
