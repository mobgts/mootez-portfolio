import {
  exitSeriesExpandTo,
  isSeriesExpandOpen,
  closeSeriesExpand,
  openSeriesExpand,
} from "@/content/seriesExpandUi";
import { setPageHash } from "@/lib/pageHash";

/** Sections that sit past the long album runway. */
export type JumpSection = "about" | "contact";
export type NavZone = "albums" | "about" | "contact";

/** Keep in sync with About.tsx handoff runway. */
const SCROLL_VH = 0.9;
const ALBUM_GAP_SLOTS = 1.75;
const ABOUT_HOLD_VH = 0.08;
const HANDOFF_VH = ALBUM_GAP_SLOTS * SCROLL_VH;
const CONTACT_HOLD_VH = 0.08;
const HANDOFF_TRACK_VH = ABOUT_HOLD_VH + HANDOFF_VH + CONTACT_HOLD_VH;

/** Mobile runway — longer so touch momentum still shows the slide. */
const MOBILE_ABOUT_HOLD_VH = 0.2;
const MOBILE_HANDOFF_VH = 2.6;
const MOBILE_CONTACT_HOLD_VH = 0.25;
const MOBILE_HANDOFF_TRACK_VH =
  MOBILE_ABOUT_HOLD_VH + MOBILE_HANDOFF_VH + MOBILE_CONTACT_HOLD_VH;

/** About ↔ Contact nav — same axis as scroll handoff. */
const HANDOFF_NAV_MS = 820;

let handoffRaf = 0;

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function isMobile() {
  return window.matchMedia("(max-width: 767px)").matches;
}

function track() {
  if (isMobile()) {
    return {
      aboutHold: MOBILE_ABOUT_HOLD_VH,
      handoff: MOBILE_HANDOFF_VH,
      contactHold: MOBILE_CONTACT_HOLD_VH,
      total: MOBILE_HANDOFF_TRACK_VH,
    };
  }
  return {
    aboutHold: ABOUT_HOLD_VH,
    handoff: HANDOFF_VH,
    contactHold: CONTACT_HOLD_VH,
    total: HANDOFF_TRACK_VH,
  };
}

function aboutPanel() {
  return document.querySelector<HTMLElement>(".about-handoff");
}

/**
 * `#contact` lives in a sticky absolute band — its layout Y is not the
 * scroll position where Contact is centered. Aim at the handoff runway instead.
 */
function sectionTop(id: JumpSection) {
  const panel = aboutPanel();
  const viewH = window.innerHeight;

  if (panel) {
    const panelDocTop = panel.getBoundingClientRect().top + window.scrollY;
    const travel = Math.max(panel.offsetHeight - viewH, 1);
    const t = track();

    if (id === "about") {
      // Lock About sticky at the start of the hold.
      return panelDocTop;
    }

    // Contact centered: just after the About → Contact handoff.
    const targetScrolled = t.aboutHold + t.handoff;
    return panelDocTop + (targetScrolled / t.total) * travel;
  }

  const el = document.getElementById(id);
  if (!el) return null;
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  return el.getBoundingClientRect().top + window.scrollY - margin;
}

/** True while the album sticky still covers the viewport. */
function seriesCoveringView() {
  const sticky = document.querySelector<HTMLElement>(".image-series__sticky");
  if (!sticky) return false;
  if (sticky.style.visibility === "hidden") return false;
  return sticky.getBoundingClientRect().bottom > window.innerHeight * 0.35;
}

/**
 * About sticky owns the view (series has handed off). The tall series panel
 * still overlaps via margin-top: -100svh, so don't use its box alone.
 */
function aboutHandoffOwnsView() {
  const panel = aboutPanel();
  if (!panel) return false;
  // Match About.tsx sticky threshold (mobile chrome rarely hits exact 0).
  if (panel.getBoundingClientRect().top > 16) return false;
  if (seriesCoveringView()) return false;
  return true;
}

function seriesStillActive() {
  if (aboutHandoffOwnsView()) return false;
  if (seriesCoveringView()) return true;

  const panel = document.querySelector<HTMLElement>(".image-series__panel");
  if (!panel) return false;
  const rect = panel.getBoundingClientRect();
  return (
    rect.top < window.innerHeight * 0.15 &&
    rect.bottom > window.innerHeight * 0.55
  );
}

/** Where the page currently sits for nav choreography. */
export function currentNavZone(): NavZone {
  // Prefer About/Contact once their sticky runway owns the screen.
  if (aboutHandoffOwnsView()) {
    const panel = aboutPanel();
    if (!panel) return "about";
    const viewH = window.innerHeight;
    const top = panel.getBoundingClientRect().top;
    const total = Math.max(panel.offsetHeight - viewH, 1);
    const progress = clamp01(-top / total);
    const t = track();
    const scrolled = progress * t.total;
    if (scrolled < t.aboutHold + t.handoff * 0.5) return "about";
    return "contact";
  }

  if (seriesStillActive() || seriesCoveringView()) return "albums";
  return "albums";
}

function cancelHandoffScroll() {
  if (handoffRaf) {
    cancelAnimationFrame(handoffRaf);
    handoffRaf = 0;
  }
}

/** Scrub About ↔ Contact the same way wheel scroll does. */
function animateHandoffScroll(to: number, duration: number) {
  cancelHandoffScroll();
  const html = document.documentElement;
  const from = window.scrollY;
  const delta = to - from;
  if (Math.abs(delta) < 1) {
    window.scrollTo({ top: to, behavior: "auto" });
    return;
  }

  html.style.scrollBehavior = "auto";
  const start = performance.now();

  const tick = (now: number) => {
    const t = clamp01((now - start) / duration);
    window.scrollTo({
      top: from + delta * easeInOutCubic(t),
      behavior: "auto",
    });
    if (t < 1) {
      handoffRaf = requestAnimationFrame(tick);
    } else {
      handoffRaf = 0;
      html.style.scrollBehavior = "";
    }
  };

  handoffRaf = requestAnimationFrame(tick);
}

function snapScroll(top: number) {
  cancelHandoffScroll();
  const html = document.documentElement;
  html.style.scrollBehavior = "auto";
  window.scrollTo({ top, behavior: "auto" });
  requestAnimationFrame(() => {
    html.style.scrollBehavior = "";
  });
}

/**
 * Jump / handoff to About or Contact based on where we are:
 * - album expand open → scatter flies right, About/Contact arrive
 * - albums → about/contact: skip album scrub (series exit)
 * - about ↔ contact: same left/right motion as scrolling the handoff
 */
export function jumpToSection(id: JumpSection) {
  const top = sectionTop(id);
  if (top == null) return;

  const from = currentNavZone();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  setPageHash(id);

  // Open album: leave the scatter the same way the landing album leaves.
  if (isSeriesExpandOpen()) {
    if (reduce) {
      closeSeriesExpand();
      snapScroll(top);
      return;
    }
    exitSeriesExpandTo(id);
    window.dispatchEvent(
      new CustomEvent("series-nav-exit", { detail: { target: id } }),
    );
    snapScroll(top);
    return;
  }

  if (from === id) {
    snapScroll(top);
    return;
  }

  // About ↔ Contact: same left/right motion as scrolling the handoff.
  // Check this before albums — About overlaps the series panel in layout.
  if (
    (from === "about" || from === "contact") &&
    (id === "about" || id === "contact")
  ) {
    // Don't let a leftover series pin block About's handoff paint.
    delete document.documentElement.dataset.aboutFromSeries;
    if (reduce) {
      snapScroll(top);
    } else {
      window.dispatchEvent(
        new CustomEvent("about-contact-handoff", { detail: { to: id } }),
      );
      animateHandoffScroll(top, HANDOFF_NAV_MS);
    }
    return;
  }

  // Albums → About / Contact: short series leave, no album scrub.
  if (from === "albums") {
    if (!reduce) {
      window.dispatchEvent(
        new CustomEvent("series-nav-exit", { detail: { target: id } }),
      );
    }
    snapScroll(top);
    return;
  }

  snapScroll(top);
}

export function onNavSectionClick(
  event: { preventDefault(): void },
  id: string,
) {
  if (id !== "about" && id !== "contact") return false;
  event.preventDefault();
  jumpToSection(id);
  return true;
}

/** Brand mark — scroll home without leaving a #top / #image hash. */
export function onBrandClick(event: { preventDefault(): void }) {
  event.preventDefault();
  setPageHash(null);
  if (isSeriesExpandOpen()) closeSeriesExpand();
  clearAboutChrome();
  snapScroll(0);
}

/** Drop About/Contact pin styles left over from a series leave. */
function clearAboutChrome() {
  delete document.documentElement.dataset.aboutFromSeries;
  for (const sel of ["[data-about-arrive]", "[data-contact-block]"]) {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) continue;
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
  const sticky = document.querySelector<HTMLElement>(".image-series__sticky");
  if (sticky) {
    sticky.style.opacity = "";
    sticky.style.visibility = "";
    sticky.style.pointerEvents = "";
  }
}

/**
 * Nav album pick — cover first, then park the runway under the expand
 * so About never clears to cream before the scatter is up.
 */
export function openAlbumFromNav(albumId: string) {
  openSeriesExpand(albumId);

  const prepareUnderCover = () => {
    clearAboutChrome();
    window.dispatchEvent(
      new CustomEvent("series-focus-album", { detail: { albumId } }),
    );
  };

  // Wait until expand is covering, then scroll/clear underneath.
  if (document.documentElement.classList.contains("series-expand-open")) {
    prepareUnderCover();
    return;
  }

  const start = performance.now();
  const wait = () => {
    if (
      document.documentElement.classList.contains("series-expand-open") ||
      performance.now() - start > 500
    ) {
      prepareUnderCover();
      return;
    }
    requestAnimationFrame(wait);
  };
  requestAnimationFrame(wait);
}
