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

/** About ↔ Contact nav — same axis as scroll handoff. */
const HANDOFF_NAV_MS = 820;

let handoffRaf = 0;

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
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

    if (id === "about") {
      // Lock About sticky at the start of the hold.
      return panelDocTop;
    }

    // Contact centered: just after the About → Contact handoff.
    const targetScrolled = ABOUT_HOLD_VH + HANDOFF_VH;
    return panelDocTop + (targetScrolled / HANDOFF_TRACK_VH) * travel;
  }

  const el = document.getElementById(id);
  if (!el) return null;
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  return el.getBoundingClientRect().top + window.scrollY - margin;
}

/** True while the album sticky still covers the viewport. */
function seriesCoveringView() {
  if (!window.matchMedia("(min-width: 768px)").matches) return false;
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
  if (panel.getBoundingClientRect().top > 1) return false;
  if (seriesCoveringView()) return false;
  return true;
}

function seriesStillActive() {
  if (aboutHandoffOwnsView()) return false;
  if (seriesCoveringView()) return true;

  const panel = document.querySelector<HTMLElement>(".image-series__panel");
  if (!panel) return false;
  if (!window.matchMedia("(min-width: 768px)").matches) return false;
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
    const scrolled = progress * HANDOFF_TRACK_VH;
    if (scrolled < ABOUT_HOLD_VH + HANDOFF_VH * 0.5) return "about";
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
 * - albums → about/contact: skip album scrub (series exit)
 * - about ↔ contact: same left/right motion as scrolling the handoff
 */
export function jumpToSection(id: JumpSection) {
  const top = sectionTop(id);
  if (top == null) return;

  const from = currentNavZone();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  history.replaceState(null, "", `#${id}`);

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
