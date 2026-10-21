"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  captureFrameSnapshot,
  captureTitleSnapshot,
  getSeriesExpand,
  openSeriesExpand,
  subscribeSeriesExpand,
} from "@/content/seriesExpandUi";
import { albums } from "@/content/photos";
import type { Album, Photo } from "@/content/types";
import { bindMobileAxisScrub } from "@/lib/mobileAxisScrub";
import { useSoftDrift } from "@/lib/softDrift";
function openExpand(
  album: Album,
  photo: Photo,
  titleEl: HTMLElement | null,
  frameEl: HTMLElement | null,
) {
  openSeriesExpand(
    album.id,
    photo.slug,
    captureTitleSnapshot(titleEl),
    captureFrameSnapshot(frameEl),
  );
}

/** Lead photos that each get their own scroll slide. */
const LEAD_COUNT = 3;
/** Viewport-heights of scroll between photo slots (desktop). */
const SCROLL_VH = 0.9;
/** Phone: shorter runway so finger scroll advances albums faster. */
const MOBILE_SCROLL_VH = 0.48;
/**
 * Scroll through the album handoff. Moderate so the 4th reel doesn't feel parked.
 */
const ALBUM_GAP_SLOTS = 1.75;
/** Visual step between shots in the same album. */
const VISUAL_STEP_SAME = 0.82;
/**
 * Total visual distance from one album's last shot to the next album's first.
 * ~1.35 keeps a slight on-screen overlap during the handoff.
 */
const VISUAL_STEP_GAP = 1.9;
/** Flipbook frame duration while the 4th slot is in view. */
const REEL_MS = 160;
/** Short leave when nav jumps past the album runway. */
const NAV_EXIT_MS = 820;
function isMobileSeries() {
  return window.matchMedia("(max-width: 767px)").matches;
}

function activeScrollVh() {
  return isMobileSeries() ? MOBILE_SCROLL_VH : SCROLL_VH;
}
function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function splitAlbum(photos: Photo[]) {
  const lead = photos.slice(0, LEAD_COUNT);
  const reel = photos.slice(LEAD_COUNT);
  return { lead, reel };
}

type TrackSlot =
  | {
      kind: "shot";
      key: string;
      album: Album;
      photo: Photo;
      /** True when this slot flipbooks leftover frames. */
      reel: boolean;
      reelPhotos?: Photo[];
    }
  | { kind: "gap"; key: string }
  /** Last album leaves like a gap; About rises during the end fade. */
  | { kind: "exit"; key: string };

/**
 * Exit choreography (exitT 0 → 1):
 * - Album fades across the whole exit.
 * - About starts rising with that fade, but stays invisible until the album
 *   is mostly gone, then opacity clears quickly so copy is readable soon.
 */
const ABOUT_RISE_START = 0.18;
/** About copy stays at 0 until this exitT, then ramps to clear fast. */
const ABOUT_OPACITY_START = 0.48;
/** Series chrome fully gone by this exitT (before About text clears). */
const SERIES_FADE_END = 0.52;

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function clearAboutArrive(el: HTMLElement) {
  el.style.position = "";
  el.style.top = "";
  el.style.left = "";
  el.style.right = "";
  el.style.width = "";
  el.style.maxWidth = "";
  el.style.paddingLeft = "";
  el.style.paddingRight = "";
  el.style.zIndex = "";
  el.style.willChange = "";
  el.style.transform = "";
  el.style.opacity = "";
  el.style.visibility = "";
  el.style.pointerEvents = "";
}

function buildTrack(): TrackSlot[] {
  const slots: TrackSlot[] = [];
  albums.forEach((album, albumIdx) => {
    const { lead, reel } = splitAlbum(album.photos);
    for (const photo of lead) {
      slots.push({
        kind: "shot",
        key: photo.slug,
        album,
        photo,
        reel: false,
      });
    }
    if (reel.length > 0) {
      slots.push({
        kind: "shot",
        key: `${album.id}-reel`,
        album,
        photo: reel[0],
        reel: true,
        reelPhotos: reel,
      });
    }
    if (albumIdx < albums.length - 1) {
      slots.push({ kind: "gap", key: `gap-${album.id}` });
    }
  });
  // Doubles-style leave; About rises in during the end fade.
  if (slots.length > 0) {
    slots.push({ kind: "exit", key: "gap-about" });
  }
  return slots;
}

function slotWeight(slot: TrackSlot) {
  if (slot.kind === "gap") return ALBUM_GAP_SLOTS;
  // Match a normal gap leave — About clears inside this window.
  if (slot.kind === "exit") return ALBUM_GAP_SLOTS + 0.15;
  return 1;
}

/**
 * Cumulative visual axis. The gap node splits ONE handoff span so the leaving
 * 4th and the next album's first shot can overlap slightly mid-transition
 * (previously two full gap steps pushed both off-screen).
 */
function buildVisualPositions(slots: TrackSlot[]) {
  const positions = [0];
  for (let i = 1; i < slots.length; i++) {
    const cur = slots[i];
    const prev = slots[i - 1];
    let step = VISUAL_STEP_SAME;
    if (cur.kind === "exit" || prev.kind === "exit") {
      // Same total leave travel as an album gap (shot → gap → next).
      step = VISUAL_STEP_GAP;
    } else if (cur.kind === "gap" || prev.kind === "gap") {
      step = VISUAL_STEP_GAP * 0.5;
    }
    positions.push(positions[i - 1] + step);
  }
  return positions;
}

function lastShotIndex(slots: TrackSlot[]) {
  for (let i = slots.length - 1; i >= 0; i--) {
    if (slots[i].kind === "shot") return i;
  }
  return -1;
}

function visualAtIndex(index: number, positions: number[]) {
  if (positions.length === 0) return 0;
  if (positions.length === 1) return positions[0];
  const i0 = Math.max(0, Math.min(Math.floor(index), positions.length - 1));
  const i1 = Math.min(i0 + 1, positions.length - 1);
  const t = clamp01(index - i0);
  return positions[i0] * (1 - t) + positions[i1] * t;
}

function runwayVh(slots: TrackSlot[], scrollVh = SCROLL_VH) {
  if (slots.length <= 1) return 1;
  let units = 0;
  for (let i = 0; i < slots.length - 1; i++) {
    units += scrollVh * slotWeight(slots[i + 1]);
  }
  return Math.max(units, 1);
}

function slotIndexAtProgress(
  progress: number,
  slots: TrackSlot[],
  scrollVh = SCROLL_VH,
) {
  if (slots.length <= 1) return 0;
  const usable = Math.max(runwayVh(slots, scrollVh), 0.001);
  const scrolled = clamp01(progress) * usable;

  let walked = 0;
  for (let i = 0; i < slots.length - 1; i++) {
    const span = scrollVh * slotWeight(slots[i + 1]);
    if (scrolled <= walked + span) {
      const t = (scrolled - walked) / Math.max(span, 0.001);
      return i + t;
    }
    walked += span;
  }
  return slots.length - 1;
}

/**
 * Title follows the nearest shot on the visual axis. Past the handoff midpoint
 * the next album wins, so the name changes as it starts to appear.
 */
function albumClaimAtPlayhead(
  playhead: number,
  slots: TrackSlot[],
  positions: number[],
) {
  let best: Extract<TrackSlot, { kind: "shot" }> | null = null;
  let bestDist = Infinity;
  let bestIdx = -1;
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (slot.kind !== "shot") continue;
    const dist = Math.abs(playhead - positions[i]);
    // Prefer the upcoming shot when distances are nearly equal (handoff).
    if (dist < bestDist - 0.02 || (Math.abs(dist - bestDist) <= 0.02 && i > bestIdx)) {
      bestDist = dist;
      best = slot;
      bestIdx = i;
    }
  }
  return best?.album ?? null;
}

/**
 * Album-to-album title handoff window. Old name exits with the leaving reel;
 * new name rides in with the next album's first shot (little mid-gap overlap).
 */
function titleHandoffAtPlayhead(
  playhead: number,
  slots: TrackSlot[],
  positions: number[],
) {
  let prevShotIdx = -1;
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (slot.kind !== "shot") continue;
    if (prevShotIdx >= 0) {
      const leave = slots[prevShotIdx];
      const enter = slot;
      if (
        leave.kind === "shot" &&
        enter.kind === "shot" &&
        leave.album.id !== enter.album.id
      ) {
        const leavePos = positions[prevShotIdx];
        const enterPos = positions[i];
        const span = Math.max(enterPos - leavePos, 0.001);
        if (playhead >= leavePos && playhead <= enterPos) {
          return {
            from: leave.album,
            to: enter.album,
            t: clamp01((playhead - leavePos) / span),
          };
        }
      }
    }
    prevShotIdx = i;
  }
  return null;
}

function SeriesFrame({
  album,
  photo,
  getTitleEl,
  reel = false,
  reelPhotos,
  reelIndex = 0,
  priority = false,
}: {
  album: Album;
  photo: Photo;
  getTitleEl: (albumId: string) => HTMLElement | null;
  reel?: boolean;
  reelPhotos?: Photo[];
  reelIndex?: number;
  /** Prefer the landing doubles lead — never warm off-screen reels. */
  priority?: boolean;
}) {
  const frames = reel && reelPhotos && reelPhotos.length > 0 ? reelPhotos : [photo];
  const active = frames[reelIndex % frames.length] ?? photo;

  return (
    <button
      type="button"
      data-series-frame
      data-series-album={album.id}
      className={
        reel
          ? "image-series__frame image-series__frame--reel"
          : "image-series__frame"
      }
      aria-label={active.alt}
      onClick={(event) =>
        openExpand(album, active, getTitleEl(album.id), event.currentTarget)
      }
    >
      <span className="image-series__frame-inner">
        {frames.map((frame, i) => {
          const on = i === reelIndex % frames.length;
          return (
            <span
              key={frame.slug}
              className="image-series__photo"
              aria-hidden={!on}
              style={{ opacity: on ? 1 : 0 }}
            >
              <Image
                src={frame.src}
                alt=""
                fill
                quality={90}
                sizes="(min-width: 768px) 32vw, 90vw"
                className="object-cover"
                priority={priority && i === 0}
              />
            </span>
          );
        })}
      </span>
    </button>
  );
}

/** Milligan-style scroll series — desktop + mobile (mobile uses larger frames). */
export function ImageSeries() {
  const panelRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const titleLeaveRef = useRef<HTMLHeadingElement>(null);
  const titleEnterRef = useRef<HTMLHeadingElement>(null);

  // Album name soft-wander — same living motion as the left rail.
  useSoftDrift(panelRef);

  const slots = useMemo(() => buildTrack(), []);
  const [scrollVh, setScrollVh] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches
      ? MOBILE_SCROLL_VH
      : SCROLL_VH,
  );
  const runway = useMemo(() => runwayVh(slots, scrollVh), [slots, scrollVh]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setScrollVh(mq.matches ? MOBILE_SCROLL_VH : SCROLL_VH);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const shotSlots = useMemo(
    () =>
      slots.filter(
        (slot): slot is Extract<TrackSlot, { kind: "shot" }> =>
          slot.kind === "shot",
      ),
    [slots],
  );

  const reelSlotIndexes = useMemo(() => {
    const map = new Map<number, Photo[]>();
    slots.forEach((slot, i) => {
      if (slot.kind === "shot" && slot.reel && slot.reelPhotos) {
        map.set(i, slot.reelPhotos);
      }
    });
    return map;
  }, [slots]);

  const [reelIndex, setReelIndex] = useState(0);
  const [activeReelSlot, setActiveReelSlot] = useState<number | null>(null);
  const reelActiveRef = useRef<number | null>(null);
  const titleLeaveIdRef = useRef(albums[0]?.id ?? "");
  /** While expand is open, pin the big title to that album (nav can open any series). */
  const expandAlbumIdRef = useRef<string | null>(getSeriesExpand().albumId);

  useEffect(() => {
    const sync = () => {
      expandAlbumIdRef.current = getSeriesExpand().albumId;
    };
    sync();
    return subscribeSeriesExpand(sync);
  }, []);

  /** Nav album pick from About/Contact — park the runway on that series first. */
  useEffect(() => {
    const onFocusAlbum = (event: Event) => {
      const albumId = (event as CustomEvent<{ albumId?: string }>).detail
        ?.albumId;
      if (!albumId) return;
      const panel = panelRef.current;
      if (!panel) return;

      const firstIdx = slots.findIndex(
        (slot) => slot.kind === "shot" && slot.album.id === albumId,
      );
      if (firstIdx < 0) return;

      // Progress at the start of this shot (inverse of slotIndexAtProgress).
      const vh = activeScrollVh();
      let walked = 0;
      for (let i = 0; i < firstIdx; i++) {
        walked += vh * slotWeight(slots[i + 1]);
      }
      const usable = Math.max(runwayVh(slots, vh), 0.001);
      const progress = clamp01(walked / usable);

      const viewH = window.innerHeight;
      const total = Math.max(panel.offsetHeight - viewH, 1);
      const panelDocTop = panel.getBoundingClientRect().top + window.scrollY;
      const top = panelDocTop + progress * total;

      const html = document.documentElement;
      html.style.scrollBehavior = "auto";
      window.scrollTo({ top, behavior: "auto" });
      requestAnimationFrame(() => {
        html.style.scrollBehavior = "";
      });

      // Undo a prior nav-exit hide so the series can paint under the expand.
      const sticky = panel.querySelector<HTMLElement>(".image-series__sticky");
      if (sticky) {
        sticky.style.opacity = "";
        sticky.style.visibility = "";
        sticky.style.pointerEvents = "";
      }
    };

    window.addEventListener("series-focus-album", onFocusAlbum);
    return () => window.removeEventListener("series-focus-album", onFocusAlbum);
  }, [slots]);

  const getTitleEl = (albumId: string) => {
    const leave = titleLeaveRef.current;
    const enter = titleEnterRef.current;
    if (leave?.dataset.seriesTitle === albumId) return leave;
    if (enter?.dataset.seriesTitle === albumId) return enter;
    return leave;
  };

  const activeReelPhotos =
    activeReelSlot != null ? reelSlotIndexes.get(activeReelSlot) : null;

  useEffect(() => {
    if (!activeReelPhotos || activeReelPhotos.length < 2) return;
    const id = window.setInterval(() => {
      setReelIndex((i) => (i + 1) % activeReelPhotos.length);
    }, REEL_MS);
    return () => window.clearInterval(id);
  }, [activeReelPhotos]);

  useEffect(() => {
    const panel = panelRef.current;
    const track = trackRef.current;
    const leaveEl = titleLeaveRef.current;
    const enterEl = titleEnterRef.current;
    if (!panel || !track || !leaveEl || !enterEl) return;

    const frames = Array.from(
      track.querySelectorAll<HTMLElement>("[data-series-frame]"),
    );
    if (!frames.length) return;

    const frameSlotIndex: number[] = [];
    let frameCursor = 0;
    slots.forEach((slot, slotIdx) => {
      if (slot.kind === "shot") {
        frameSlotIndex[frameCursor] = slotIdx;
        frameCursor += 1;
      }
    });
    const visualPositions = buildVisualPositions(slots);
    const lastShot = lastShotIndex(slots);
    const exitSlotIdx = slots.findIndex((slot) => slot.kind === "exit");
    const exitSpan = Math.max(exitSlotIdx - lastShot, 0.001);
    // Opening: hide the first album's 2nd lead until scroll — same arc, just no peek.
    let introHideSlotIdx = -1;
    {
      const firstId = albums[0]?.id;
      let leadCount = 0;
      if (firstId) {
        for (let i = 0; i < slots.length; i++) {
          const s = slots[i];
          if (s.kind !== "shot" || s.album.id !== firstId || s.reel) continue;
          if (leadCount === 1) {
            introHideSlotIdx = i;
            break;
          }
          leadCount += 1;
        }
      }
    }
    let drivingAbout = false;
    /** After series→About release, never re-pin until the user scrolls back into albums. */
    let releasedToAbout = false;
    const stickyEl = panel.querySelector<HTMLElement>(".image-series__sticky");
    /** Nav jump: keep current album, fly it right, drop About/Contact from top. */
    let navExit: null | {
      start: number;
      fromIndex: number;
      fromPlayhead: number;
      target: "about" | "contact";
    } = null;

    const paintTitleLayer = (
      el: HTMLHeadingElement,
      id: string,
      x: number,
      opacity: number,
    ) => {
      if (el.dataset.seriesTitle !== id) {
        el.dataset.seriesTitle = id;
        // Keep the inner drift span so soft-wander can compose with scroll x.
        const label = el.querySelector<HTMLElement>("[data-soft-drift]");
        if (label) label.textContent = id;
        else el.textContent = id;
      }
      el.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      el.style.opacity = opacity.toFixed(3);
    };

    let raf = 0;

    const paint = (now = performance.now()) => {
      const viewH = window.innerHeight;
      const total = Math.max(panel.offsetHeight - viewH, 1);
      const top = panel.getBoundingClientRect().top;
      const progress = clamp01(-top / total);
      const vh = activeScrollVh();
      const scrollIndex = slotIndexAtProgress(progress, slots, vh);
      const scrollPlayhead = visualAtIndex(scrollIndex, visualPositions);
      const mobile = isMobileSeries();
      // Mobile: a bit tighter than full-width so neighbors sit closer while scrolling.
      const spacing = mobile
        ? Math.min(window.innerWidth * 0.78, 340)
        : Math.min(window.innerWidth * 0.44, 520);
      // Titles travel with the frames, but a bit less so the word stays readable.
      const titleTravel = mobile
        ? Math.min(window.innerWidth * 0.44, 210)
        : Math.min(window.innerWidth * 0.3, 360);
      const arcLift = mobile ? 14 : 26;
      const rotAmt = mobile ? 1.8 : 2.8;
      const scaleAmt = mobile ? 0.08 : 0.12;

      let index = scrollIndex;
      let playhead = scrollPlayhead;
      let exitT =
        lastShot >= 0 && exitSlotIdx > lastShot
          ? clamp01((index - lastShot) / exitSpan)
          : 0;
      /** Nav jump: skip album scrub; About from left, Contact from right. */
      let navJump = false;
      let navTarget: "about" | "contact" | null = null;

      if (navExit) {
        const raw = clamp01((now - navExit.start) / NAV_EXIT_MS);
        const ease = easeInOutCubic(raw);
        index = navExit.fromIndex;
        // About: album exits right. Contact: album exits left.
        const leaveDir = navExit.target === "contact" ? -1 : 1;
        playhead = navExit.fromPlayhead + leaveDir * ease * VISUAL_STEP_GAP;
        exitT = ease;
        navJump = true;
        navTarget = navExit.target;
        if (raw >= 1) navExit = null;
      }

      // Album leaves; section arrives on the opposite side.
      const aboutRiseStart = navJump ? 0.02 : ABOUT_RISE_START;
      const aboutOpacityStart = navJump ? 0.12 : ABOUT_OPACITY_START;
      const aboutT = clamp01(
        (exitT - aboutRiseStart) / Math.max(1 - aboutRiseStart, 0.001),
      );
      const aboutEase = easeInOutCubic(aboutT);
      const aboutOpacityT = clamp01(
        (exitT - aboutOpacityStart) /
          Math.max(1 - aboutOpacityStart, 0.001),
      );
      // Smooth ramp — no snap. Nav jump overlaps album leave for a continuous handoff.
      const aboutOpacity =
        aboutOpacityT <= 0
          ? 0
          : Math.min(
              1,
              navJump
                ? easeInOutCubic(aboutOpacityT)
                : easeOutCubic(aboutOpacityT) * 2.4,
            );
      // Nav jump: keep album visible longer while it slides off.
      const seriesOut = navJump
        ? clamp01((exitT - 0.45) / 0.55)
        : clamp01(exitT / SERIES_FADE_END);

      // Fade frames/titles only — never the sticky shell (that punched a hole
      // onto About sitting underneath and caused the stacked glitch).
      if (stickyEl) {
        if (exitT > 0 || drivingAbout || navJump) {
          stickyEl.style.opacity = "";
          stickyEl.style.pointerEvents = seriesOut > 0.2 ? "none" : "";
          stickyEl.style.visibility = seriesOut >= 1 ? "hidden" : "";
        } else {
          stickyEl.style.opacity = "";
          stickyEl.style.pointerEvents = "";
          stickyEl.style.visibility = "";
        }
      }

      const aboutArrive = document.querySelector<HTMLElement>(
        "[data-about-arrive]",
      );
      const contactBlock = document.querySelector<HTMLElement>(
        "[data-contact-block]",
      );
      if (aboutArrive) {
        const aboutPanel = document.querySelector<HTMLElement>(".about-handoff");
        const aboutPanelTop = aboutPanel?.getBoundingClientRect().top ?? 9999;
        // Mobile chrome / subpixels often sit a few px above 0 — don't require <= 1.
        const aboutStickyReady = aboutPanelTop <= 16;
        const aboutPanelInView = aboutPanelTop < viewH * 0.65;
        const navTargetContact = navJump && navTarget === "contact";
        const arriveEl =
          navTargetContact && contactBlock ? contactBlock : aboutArrive;
        const parkEl =
          navTargetContact && contactBlock ? aboutArrive : contactBlock;

        const pinArriveFixed = (
          el: HTMLElement,
          xPx: number,
          yVh: number,
          opacity: number,
          interactive: boolean,
        ) => {
          el.style.position = "fixed";
          el.style.top = "50%";
          el.style.left = "50%";
          el.style.right = "auto";
          el.style.width = mobile ? "100%" : "min(100%, 64rem)";
          el.style.maxWidth = mobile ? "100%" : "64rem";
          // Under series chrome until album is gone, then above for the arrive.
          // Nav jump from expand: above scatter (60), under site nav (70).
          el.style.zIndex = navJump
            ? "65"
            : seriesOut >= 1
              ? "30"
              : "5";
          el.style.willChange = "transform, opacity";
          el.style.transform = `translate3d(calc(-50% + ${xPx.toFixed(2)}px), calc(-50% + ${yVh.toFixed(2)}vh), 0)`;
          el.style.opacity = opacity.toFixed(3);
          el.style.visibility = opacity <= 0.01 ? "hidden" : "visible";
          el.style.pointerEvents = interactive ? "auto" : "none";
          if (parkEl) {
            parkEl.style.opacity = "0";
            parkEl.style.visibility = "hidden";
            parkEl.style.pointerEvents = "none";
            parkEl.style.zIndex = "1";
          }
        };

        const releaseArrive = (toContact: boolean) => {
          drivingAbout = false;
          releasedToAbout = true;
          delete document.documentElement.dataset.aboutFromSeries;
          aboutArrive.style.position = "";
          aboutArrive.style.top = "";
          aboutArrive.style.left = "";
          aboutArrive.style.right = "";
          aboutArrive.style.width = "";
          aboutArrive.style.maxWidth = "";
          aboutArrive.style.paddingLeft = "";
          aboutArrive.style.paddingRight = "";
          aboutArrive.style.zIndex = "";
          aboutArrive.style.willChange = "";
          if (toContact) {
            // Land on Contact — park About off-left so it doesn't flash on top.
            aboutArrive.style.transform = `translate3d(calc(-50% - ${spacing.toFixed(2)}px), -50%, 0)`;
            aboutArrive.style.opacity = "0";
            aboutArrive.style.visibility = "hidden";
            aboutArrive.style.pointerEvents = "none";
          } else {
            aboutArrive.style.transform = "translate3d(-50%, -50%, 0)";
            aboutArrive.style.opacity = "1";
            aboutArrive.style.visibility = "visible";
            aboutArrive.style.pointerEvents = "auto";
          }
          if (contactBlock) {
            contactBlock.style.position = "";
            contactBlock.style.top = "";
            contactBlock.style.left = "";
            contactBlock.style.right = "";
            contactBlock.style.width = "";
            contactBlock.style.maxWidth = "";
            contactBlock.style.zIndex = "";
            contactBlock.style.willChange = "";
            if (toContact) {
              contactBlock.style.transform = "translate3d(-50%, -50%, 0)";
              contactBlock.style.opacity = "1";
              contactBlock.style.visibility = "visible";
              contactBlock.style.pointerEvents = "auto";
            } else {
              // Park Contact off-right so About's sticky scrub can take over cleanly.
              contactBlock.style.transform = `translate3d(calc(-50% + ${(
                VISUAL_STEP_GAP * spacing
              ).toFixed(2)}px), -50%, 0)`;
              contactBlock.style.opacity = "0";
              contactBlock.style.visibility = "visible";
              contactBlock.style.pointerEvents = "none";
            }
          }
        };

        // Scrolling back into the exit window — reclaim the pin so About and
        // albums don't both sit opaque on screen (mobile reverse overlap).
        if (releasedToAbout && exitT > 0 && exitT < 1) {
          releasedToAbout = false;
        }

        if (exitT <= 0) {
          drivingAbout = false;
          releasedToAbout = false;
          delete document.documentElement.dataset.aboutFromSeries;
          clearAboutArrive(aboutArrive);
          if (contactBlock) clearAboutArrive(contactBlock);
        } else if (!releasedToAbout && exitT > 0 && aboutT < 1) {
          drivingAbout = true;
          document.documentElement.dataset.aboutFromSeries = "1";
          // Nav jump: About ← left, Contact ← right (album goes the other way).
          // Scroll leave: About still rises from below.
          const yVh = navJump
            ? 0
            : (1 - aboutEase) * (mobile ? 42 : 56);
          const enterTravel = spacing * VISUAL_STEP_GAP * (mobile ? 0.85 : 0.7);
          const xPx = navJump
            ? navTargetContact
              ? (1 - aboutEase) * enterTravel
              : -(1 - aboutEase) * enterTravel
            : 0;
          // Cap About by seriesOut so reverse scroll can't leave both opaque.
          const crossOpacity = navJump
            ? aboutOpacity
            : Math.min(aboutOpacity, seriesOut);
          pinArriveFixed(
            arriveEl,
            xPx,
            yVh,
            crossOpacity,
            crossOpacity > 0.4,
          );
        } else if (!releasedToAbout && aboutT >= 1 && exitT > 0) {
          // Album fade done. Hand off as soon as About's panel is sticky/in view —
          // don't keep Contact forever-hidden waiting for a 1px top threshold.
          const canRelease =
            aboutStickyReady || (seriesOut >= 1 && aboutPanelInView);
          if (canRelease) {
            releaseArrive(navTargetContact || navTarget === "contact");
          } else {
            drivingAbout = true;
            document.documentElement.dataset.aboutFromSeries = "1";
            pinArriveFixed(arriveEl, 0, 0, 1, true);
          }
        }
      }

      frames.forEach((frame, frameIdx) => {
        const slotIdx = frameSlotIndex[frameIdx] ?? frameIdx;
        const delta = playhead - visualPositions[slotIdx];
        const x = delta * spacing;
        const abs = Math.abs(delta);
        const arc = Math.min(abs, 1.55);
        const y = arc * arc * arcLift;
        const rot = delta * rotAmt;
        const scale = 1 - Math.min(abs, 1.25) * scaleAmt;
        let opacity =
          (abs < 0.08 ? 1 : Math.max(0, 1 - abs * 0.95)) * (1 - seriesOut);
        // First album, 2nd picture: fully clear at rest; reveal with the same curve as scroll.
        if (slotIdx === introHideSlotIdx) {
          const unlock = visualPositions[slotIdx] || VISUAL_STEP_SAME;
          opacity *= clamp01(playhead / unlock);
        }
        const z = Math.round(40 - abs * 10);
        frame.style.transform = `translate3d(calc(-50% + ${x.toFixed(2)}px), calc(-50% + ${y.toFixed(2)}px), 0) rotate(${rot.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
        frame.style.opacity = opacity.toFixed(3);
        frame.style.zIndex = String(z);
        frame.style.pointerEvents =
          seriesOut > 0.15 || aboutT > 0 || abs >= 0.35 ? "none" : "auto";
      });

      // Stay flipping while the 4th frame is the visual focus (gap weight is
      // >1, so a tight ±0.45 window died before the shot looked "parked").
      let onReel: number | null = null;
      for (const [slotIdx] of reelSlotIndexes) {
        if (
          Math.abs(index - slotIdx) < 0.72 &&
          progress > 0.02 &&
          exitT < 0.2 &&
          !navJump
        ) {
          onReel = slotIdx;
          break;
        }
      }
      if (onReel !== reelActiveRef.current) {
        reelActiveRef.current = onReel;
        setActiveReelSlot(onReel);
        if (onReel != null) setReelIndex(0);
      }

      // Full when the sticky fills the viewport (landing included); fade only at edges.
      const sectionEnter = clamp01((-top + viewH * 0.35) / (viewH * 0.35));
      const sectionLeave = clamp01(
        (panel.offsetHeight + top - viewH * 0.85) / (viewH * 0.4),
      );
      const baseOpacity = Math.min(sectionEnter, sectionLeave);

      const expandId = expandAlbumIdRef.current;
      if (expandId) {
        titleLeaveIdRef.current = expandId;
        paintTitleLayer(leaveEl, expandId, 0, Math.max(baseOpacity, 1));
        paintTitleLayer(enterEl, expandId, titleTravel, 0);
        return;
      }

      const handoff = titleHandoffAtPlayhead(playhead, slots, visualPositions);
      if (exitT > 0) {
        // Title rides out with the album fade — gone before About text clears.
        const album = albumClaimAtPlayhead(
          navJump ? scrollPlayhead : playhead,
          slots,
          visualPositions,
        );
        const id = album?.id ?? titleLeaveIdRef.current;
        titleLeaveIdRef.current = id;
        const leaveT = clamp01(exitT / Math.max(SERIES_FADE_END * 0.9, 0.001));
        paintTitleLayer(
          leaveEl,
          id,
          exitT * titleTravel,
          baseOpacity * (1 - leaveT) * (1 - seriesOut),
        );
        paintTitleLayer(enterEl, id, titleTravel, 0);
      } else if (handoff) {
        titleLeaveIdRef.current = handoff.from.id;
        // Leave finishes early; enter rises a beat before the next first frame lands.
        const leaveT = clamp01(handoff.t / 0.42);
        const enterT = clamp01((handoff.t - 0.42) / 0.5);
        paintTitleLayer(
          leaveEl,
          handoff.from.id,
          handoff.t * titleTravel,
          baseOpacity * (1 - leaveT),
        );
        paintTitleLayer(
          enterEl,
          handoff.to.id,
          (handoff.t - 1) * titleTravel,
          baseOpacity * enterT,
        );
      } else {
        const album = albumClaimAtPlayhead(playhead, slots, visualPositions);
        const id = album?.id ?? titleLeaveIdRef.current;
        titleLeaveIdRef.current = id;
        paintTitleLayer(leaveEl, id, 0, baseOpacity);
        paintTitleLayer(enterEl, id, titleTravel, 0);
      }
    };

    const onNavExit = (event: Event) => {
      const detail = (event as CustomEvent<{ target?: string }>).detail;
      const target =
        detail?.target === "contact" ? "contact" : ("about" as const);
      const viewH = window.innerHeight;
      const total = Math.max(panel.offsetHeight - viewH, 1);
      const top = panel.getBoundingClientRect().top;
      const progress = clamp01(-top / total);
      const index = slotIndexAtProgress(progress, slots, activeScrollVh());
      // Already leaving or past the series — scroll jump alone is enough.
      // Still run when expand is open (track is hidden; index may look "past").
      const expandOpen =
        document.documentElement.classList.contains("series-expand-open") ||
        document.documentElement.classList.contains("series-expand-nav-exit");
      if (!expandOpen && lastShot >= 0 && index >= lastShot) return;

      // Prime both bands hidden — section may unhide before the first pin paint.
      const aboutArrive = document.querySelector<HTMLElement>(
        "[data-about-arrive]",
      );
      const contactBlock = document.querySelector<HTMLElement>(
        "[data-contact-block]",
      );
      for (const el of [aboutArrive, contactBlock]) {
        if (!el) continue;
        el.style.opacity = "0";
        el.style.visibility = "hidden";
        el.style.pointerEvents = "none";
      }

      navExit = {
        start: performance.now(),
        fromIndex: index,
        fromPlayhead: visualAtIndex(index, visualPositions),
        target,
      };
      releasedToAbout = false;
    };

    const tick = (now: number) => {
      paint(now);
      raf = requestAnimationFrame(tick);
    };

    const onResize = () => paint();

    // Paint once before the first frame so neighbors never flash over doubles.
    paint();
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", onResize);
    window.addEventListener("series-nav-exit", onNavExit);
    const unbindAxisScrub = bindMobileAxisScrub();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("series-nav-exit", onNavExit);
      unbindAxisScrub();
      delete document.documentElement.dataset.aboutFromSeries;
      if (stickyEl) {
        stickyEl.style.opacity = "";
        stickyEl.style.pointerEvents = "";
        stickyEl.style.visibility = "";
      }
      const aboutArrive = document.querySelector<HTMLElement>(
        "[data-about-arrive]",
      );
      if (aboutArrive) clearAboutArrive(aboutArrive);
      const contactBlock = document.querySelector<HTMLElement>(
        "[data-contact-block]",
      );
      if (contactBlock) {
        contactBlock.style.opacity = "";
        contactBlock.style.pointerEvents = "";
      }
    };
  }, [slots, reelSlotIndexes]);

  const initialTitle = albums[0]?.id ?? "";

  return (
    <div className="image-series">
      <div
        ref={panelRef}
        className="image-series__panel"
        style={{ height: `${runway * 100}vh` }}
        data-series="all"
      >
        <div className="image-series__sticky">
          <div className="image-series__stage hero-enter hero-enter--series">
            <div className="image-series__titles" aria-hidden>
              <h2
                ref={titleLeaveRef}
                className="image-series__title"
                data-series-title={initialTitle}
              >
                <span data-soft-drift="slight">{initialTitle}</span>
              </h2>
              <h2
                ref={titleEnterRef}
                className="image-series__title image-series__title--enter"
                data-series-title={initialTitle}
              >
                <span data-soft-drift="slight">{initialTitle}</span>
              </h2>
            </div>

            <div ref={trackRef} className="image-series__track">
              {shotSlots.map((slot, shotIdx) => {
                const slotIdx = slots.findIndex((entry) => entry.key === slot.key);
                const flipping = slot.reel && slotIdx === activeReelSlot;
                return (
                  <SeriesFrame
                    key={slot.key}
                    album={slot.album}
                    photo={slot.photo}
                    getTitleEl={getTitleEl}
                    reel={slot.reel}
                    reelPhotos={slot.reelPhotos}
                    reelIndex={flipping ? reelIndex : 0}
                    priority={shotIdx === 0}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
