"use client";

import { useEffect, useRef, useState } from "react";
import { heroPhoto, photos } from "@/content/photos";
import { site } from "@/content/site";
import {
  Spiral3DSlider,
  type Spiral3DSlide,
} from "@/components/ui/spiral-3d-slider";
import { bindMobileAxisScrub } from "@/lib/mobileAxisScrub";
import { useSoftDrift } from "@/lib/softDrift";
import { viewportH } from "@/lib/viewport";
import { AboutPhoto } from "./AboutPhoto";
import { SilkArrive, useSilkDrive } from "./AboutSilk";

const spiralSlides: Spiral3DSlide[] = photos.map((photo) => ({
  src: photo.src,
  alt: photo.alt,
}));

/**
 * About ↔ Contact uses the same axis math as album ↔ album in ImageSeries:
 * VISUAL_STEP_GAP travel over ALBUM_GAP_SLOTS * SCROLL_VH scroll.
 * About leaves left; Contact enters from the right.
 */
const SCROLL_VH = 0.9;
const ALBUM_GAP_SLOTS = 1.75;
const VISUAL_STEP_GAP = 1.9;
/** Short park on About before the album-speed handoff. */
const ABOUT_HOLD_VH = 0.08;
/** Same scroll length as an album-to-album gap. */
const HANDOFF_VH = ALBUM_GAP_SLOTS * SCROLL_VH;
/** Short park once Contact is centered. */
const CONTACT_HOLD_VH = 0.08;
/** Sticky travel + one viewport (same runway pattern as ImageSeries). */
const RUNWAY_VH = ABOUT_HOLD_VH + HANDOFF_VH + CONTACT_HOLD_VH + 1;

/** Mobile: longer scrub so touch momentum still shows the slide. */
const MOBILE_ABOUT_HOLD_VH = 0.2;
const MOBILE_HANDOFF_VH = 2.6;
const MOBILE_CONTACT_HOLD_VH = 0.25;
const MOBILE_RUNWAY_VH =
  MOBILE_ABOUT_HOLD_VH + MOBILE_HANDOFF_VH + MOBILE_CONTACT_HOLD_VH + 1;

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function clearBandPin(el: HTMLElement) {
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

/**
 * Same motion as ImageSeries frames: slide on X, slight arc/rotate/scale, fade.
 * mirrorX: leave goes left / enter comes from right (About → Contact).
 */
function paintBand(
  el: HTMLElement,
  delta: number,
  spacing: number,
  mirrorX: boolean,
) {
  const sign = mirrorX ? -1 : 1;
  const x = sign * delta * spacing;
  const abs = Math.abs(delta);
  const arc = Math.min(abs, 1.55);
  const y = arc * arc * 26;
  const rot = sign * delta * 2.8;
  const scale = 1 - Math.min(abs, 1.25) * 0.12;
  // Keep mid-travel readable (desktop album curve is steeper; phone needs more signal).
  const opacity = abs < 0.08 ? 1 : Math.max(0, 1 - abs * 0.72);
  el.style.transform = `translate3d(calc(-50% + ${x.toFixed(2)}px), calc(-50% + ${y.toFixed(2)}px), 0) rotate(${rot.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
  el.style.opacity = opacity.toFixed(3);
  el.style.visibility = opacity <= 0.01 ? "hidden" : "visible";
  el.style.zIndex = String(Math.round(40 - abs * 10));
  el.style.pointerEvents = abs < 0.35 ? "auto" : "none";
}

/** Viewport-pin both bands so the axis scrub doesn't depend on sticky sticking. */
function pinBandFixed(el: HTMLElement, mobile: boolean) {
  el.style.position = "fixed";
  el.style.top = "calc(var(--app-h) / 2)";
  el.style.left = "50%";
  el.style.right = "auto";
  el.style.width = mobile ? "100%" : "min(100%, 64rem)";
  el.style.maxWidth = mobile ? "100%" : "64rem";
  el.style.zIndex = "30";
  el.style.willChange = "transform, opacity";
  el.style.margin = "0";
}

export function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  const drive = useSilkDrive(sectionRef);
  // Photo + copy soft-wander — same living motion as the nav, kept slight.
  useSoftDrift(sectionRef);
  // 3D spiral is desktop-only — skip mount on phone (no WebGL cost).
  const [showSpiral, setShowSpiral] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setShowSpiral(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    const aboutEl = aboutRef.current;
    const contactEl = contactRef.current;
    if (!panel || !aboutEl || !contactEl) return;

    let raf = 0;
    /** Nav-driven About ↔ Contact scrub (same axis as wheel scroll). */
    let navHandoff: null | {
      start: number;
      fromT: number;
      toT: number;
      duration: number;
    } = null;

    const trackVh = (mobile: boolean) => {
      if (mobile) {
        return {
          aboutHold: MOBILE_ABOUT_HOLD_VH,
          handoff: MOBILE_HANDOFF_VH,
          contactHold: MOBILE_CONTACT_HOLD_VH,
        };
      }
      return {
        aboutHold: ABOUT_HOLD_VH,
        handoff: HANDOFF_VH,
        contactHold: CONTACT_HOLD_VH,
      };
    };

    const handoffTFromScroll = (mobile: boolean) => {
      const viewH = viewportH();
      const top = panel.getBoundingClientRect().top;
      const total = Math.max(panel.offsetHeight - viewH, 1);
      const progress = clamp01(-top / total);
      const { aboutHold, handoff, contactHold } = trackVh(mobile);
      const track = aboutHold + handoff + contactHold;
      const scrolled = progress * track;
      if (scrolled <= aboutHold) return 0;
      if (scrolled >= aboutHold + handoff) return 1;
      return (scrolled - aboutHold) / handoff;
    };

    const paint = (now = performance.now()) => {
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      // Match album spacing — full-width travel so enter/leave clear the screen.
      const spacing = mobile
        ? Math.min(window.innerWidth * 0.88, 380)
        : Math.min(window.innerWidth * 0.44, 520);
      const viewH = viewportH();
      const top = panel.getBoundingClientRect().top;
      const total = Math.max(panel.offsetHeight - viewH, 1);
      const inRunway = top <= 16 && top > -total + 1;

      const seriesSticky = document.querySelector<HTMLElement>(
        ".image-series__sticky",
      );
      const seriesCovering =
        !!seriesSticky &&
        seriesSticky.style.visibility !== "hidden" &&
        seriesSticky.getBoundingClientRect().bottom > viewH * 0.35;

      // Series owns the arrive/leave pin — don't paint over it (avoids the
      // about↔albums overlap when scrolling back up on phone).
      if (document.documentElement.dataset.aboutFromSeries === "1") {
        return;
      }

      // Before About locks — park Contact off-screen to the right (album enter pose).
      if (!inRunway && !navHandoff) {
        if (top > 16) {
          // Don't touch About — series may still own its arrive pin.
          if (mobile) pinBandFixed(contactEl, true);
          else if (contactEl.style.position === "fixed") clearBandPin(contactEl);
          paintBand(contactEl, -VISUAL_STEP_GAP, spacing, true);
        } else {
          // Past the runway — settle Contact; About parked off-left.
          clearBandPin(aboutEl);
          clearBandPin(contactEl);
          aboutEl.style.transform = `translate3d(calc(-50% - ${(VISUAL_STEP_GAP * spacing).toFixed(2)}px), -50%, 0)`;
          aboutEl.style.opacity = "0";
          aboutEl.style.visibility = "hidden";
          aboutEl.style.pointerEvents = "none";
          contactEl.style.transform = "translate3d(-50%, -50%, 0)";
          contactEl.style.opacity = "1";
          contactEl.style.visibility = "visible";
          contactEl.style.pointerEvents = "auto";
        }
        return;
      }

      // Album still covering — don't let About peek.
      if (seriesCovering && !navHandoff) {
        aboutEl.style.opacity = "0";
        aboutEl.style.visibility = "hidden";
        aboutEl.style.pointerEvents = "none";
        if (mobile) pinBandFixed(contactEl, true);
        paintBand(contactEl, -VISUAL_STEP_GAP, spacing, true);
        return;
      }

      let handoffT = handoffTFromScroll(mobile);
      if (navHandoff) {
        const raw = clamp01((now - navHandoff.start) / navHandoff.duration);
        const ease =
          raw < 0.5 ? 4 * raw * raw * raw : 1 - (-2 * raw + 2) ** 3 / 2;
        handoffT =
          navHandoff.fromT + (navHandoff.toT - navHandoff.fromT) * ease;
        if (raw >= 1) navHandoff = null;
      }

      const playhead = handoffT * VISUAL_STEP_GAP;

      // Mobile: pin to the viewport so the axis scrub doesn't need sticky.
      // Desktop: CSS sticky + absolute bands already hold the stage.
      if (mobile) {
        pinBandFixed(aboutEl, true);
        pinBandFixed(contactEl, true);
      } else {
        // Ensure series fixed-pin is cleared so sticky absolute can own layout.
        if (aboutEl.style.position === "fixed") clearBandPin(aboutEl);
        if (contactEl.style.position === "fixed") clearBandPin(contactEl);
      }
      // About at 0 → leaves left. Contact at -gap → enters from the right.
      paintBand(aboutEl, playhead - 0, spacing, true);
      paintBand(contactEl, playhead - VISUAL_STEP_GAP, spacing, true);
    };

    const onNavHandoff = (event: Event) => {
      const detail = (event as CustomEvent<{ to?: string }>).detail;
      const toContact = detail?.to === "contact";
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      delete document.documentElement.dataset.aboutFromSeries;
      navHandoff = {
        start: performance.now(),
        fromT: handoffTFromScroll(mobile),
        toT: toContact ? 1 : 0,
        duration: 820,
      };
    };

    const syncRunwayHeight = () => {
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      panel.style.height = `calc(${mobile ? MOBILE_RUNWAY_VH : RUNWAY_VH} * var(--app-h))`;
    };

    // Same idle cadence as ImageSeries — full rate only while scrolling.
    let lastScrollY = Number.NaN;
    let idleFrames = 0;
    const tick = (now: number) => {
      const y = window.scrollY;
      if (y !== lastScrollY || navHandoff) {
        lastScrollY = y;
        idleFrames = 0;
        paint(now);
      } else if (++idleFrames % 8 === 0) {
        paint(now);
      }
      raf = requestAnimationFrame(tick);
    };

    const onResize = () => {
      syncRunwayHeight();
      paint();
    };

    syncRunwayHeight();
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", onResize);
    window.addEventListener("about-contact-handoff", onNavHandoff);
    // Same horizontal scrub as albums — left advances, right reverses.
    const unbindAxisScrub = bindMobileAxisScrub();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("about-contact-handoff", onNavHandoff);
      unbindAxisScrub();
      clearBandPin(aboutEl);
      clearBandPin(contactEl);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="story-about relative z-10 scroll-mt-16"
    >
      <div
        ref={panelRef}
        className="about-handoff"
        style={{ height: `calc(${RUNWAY_VH} * var(--app-h))` }}
      >
        <div className="about-handoff__sticky">
          <div
            ref={aboutRef}
            data-about-arrive
            className="about-handoff__band about-handoff__band--about mx-auto grid w-full max-w-5xl grid-cols-1 items-start gap-x-14 gap-y-5 px-5 md:grid-cols-2 md:gap-y-16 md:px-8 lg:gap-x-16"
          >
            <div
              data-soft-drift="slight"
              className="relative w-full max-w-[16rem] md:max-w-none"
            >
              {/* Same living sway as the copy — warpScale 0 so the photo doesn't fold. */}
              <SilkArrive
                drive={drive}
                strength={1}
                warpScale={0}
                startVisible
                className="relative aspect-[3/2] w-full overflow-hidden"
              >
                <AboutPhoto
                  src={heroPhoto.src}
                  maskSrc={heroPhoto.maskSrc}
                  alt={heroPhoto.alt}
                />
              </SilkArrive>
            </div>

            <div data-soft-drift="slight" className="relative z-10 w-full max-w-md md:max-w-none">
              <SilkArrive
                drive={drive}
                strength={1}
                className="space-y-3 text-[15px] font-medium leading-[1.45] tracking-[0.01em] md:space-y-5 md:text-[18px] md:leading-[1.5]"
              >
                <p>{site.about.story}</p>
                <p className="text-muted">{site.about.body}</p>
              </SilkArrive>
            </div>
          </div>

          <div
            ref={contactRef}
            data-contact-block
            className="about-handoff__band about-handoff__band--contact mx-auto grid w-full max-w-5xl grid-cols-1 items-start gap-x-14 gap-y-4 px-5 md:grid-cols-2 md:gap-y-16 md:px-8 lg:gap-x-16"
          >
            <div
              id="contact"
              className="scroll-mt-16 md:flex md:h-full md:min-h-[480px] md:flex-col md:justify-center lg:min-h-[560px]"
            >
              <SilkArrive
                drive={drive}
                strength={1}
                className="max-w-md space-y-3 text-[20px] font-medium leading-[1.3] tracking-[0.01em] md:max-w-none md:space-y-6 md:text-[28px] md:leading-[1.35]"
              >
                <p>Do you have a creative project in mind?</p>
                <p className="text-[14px] leading-[1.5] tracking-[0.01em] text-muted md:text-[18px] md:leading-[1.55]">
                  I&apos;m always excited to discuss new ideas and
                  collaboration opportunities.
                </p>
                <p className="pt-1 text-[12px] font-medium tracking-[0.06em] md:pt-2 md:text-[13px]">
                  Feel free to reach out at{" "}
                  <a
                    href={`mailto:${site.email}`}
                    className="underline underline-offset-4 transition-colors hover:text-olive-deep"
                  >
                    {site.email}
                  </a>
                </p>
              </SilkArrive>
              <SilkArrive drive={drive} strength={0.7}>
                <footer className="mt-6 border-t border-ink pt-3 text-[11px] lowercase tracking-[0.16em] md:mt-12 md:pt-4">
                  © {new Date().getFullYear()} {site.name}.{site.surname}
                </footer>
              </SilkArrive>
            </div>

            {showSpiral ? (
              <div className="min-w-0 w-full md:h-full">
                <Spiral3DSlider
                  items={spiralSlides}
                  autoRotate
                  autoSpeed={0.13}
                  className="min-h-[480px] lg:min-h-[560px]"
                  ariaLabel="Selected photography spiral gallery"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
