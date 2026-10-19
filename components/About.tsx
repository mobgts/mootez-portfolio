"use client";

import { useEffect, useRef } from "react";
import { heroPhoto, photos } from "@/content/photos";
import { site } from "@/content/site";
import {
  Spiral3DSlider,
  type Spiral3DSlide,
} from "@/components/ui/spiral-3d-slider";
import { useSoftDrift } from "@/lib/softDrift";
import { AboutPhoto } from "./AboutPhoto";
import { SilkArrive, useSilkDrive } from "./AboutSilk";

const spiralSlides: Spiral3DSlide[] = photos
  .filter((photo) => !photo.src.endsWith(".svg"))
  .map((photo) => ({
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

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function paintBand(
  el: HTMLElement,
  delta: number,
  spacing: number,
  /** Flip album x so leave goes left / enter comes from right. */
  mirrorX: boolean,
) {
  const sign = mirrorX ? -1 : 1;
  const x = sign * delta * spacing;
  const abs = Math.abs(delta);
  const arc = Math.min(abs, 1.55);
  const y = arc * arc * 26;
  const rot = sign * delta * 2.8;
  const scale = 1 - Math.min(abs, 1.25) * 0.12;
  const opacity = abs < 0.08 ? 1 : Math.max(0, 1 - abs * 0.95);
  el.style.transform = `translate3d(calc(-50% + ${x.toFixed(2)}px), calc(-50% + ${y.toFixed(2)}px), 0) rotate(${rot.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
  el.style.opacity = opacity.toFixed(3);
  el.style.zIndex = String(Math.round(40 - abs * 10));
  el.style.pointerEvents = abs < 0.35 ? "auto" : "none";
}

export function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  const drive = useSilkDrive(sectionRef);
  // Photo + copy soft-wander — same living motion as the nav, kept slight.
  useSoftDrift(sectionRef);

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

    const handoffTFromScroll = () => {
      const viewH = window.innerHeight;
      const top = panel.getBoundingClientRect().top;
      const total = Math.max(panel.offsetHeight - viewH, 1);
      const progress = clamp01(-top / total);
      const scrolled =
        progress * (ABOUT_HOLD_VH + HANDOFF_VH + CONTACT_HOLD_VH);
      if (scrolled <= ABOUT_HOLD_VH) return 0;
      if (scrolled >= ABOUT_HOLD_VH + HANDOFF_VH) return 1;
      return (scrolled - ABOUT_HOLD_VH) / HANDOFF_VH;
    };

    const paint = (now = performance.now()) => {
      const desktop = window.matchMedia("(min-width: 768px)").matches;
      if (!desktop) {
        aboutEl.style.transform = "";
        aboutEl.style.opacity = "";
        aboutEl.style.zIndex = "";
        aboutEl.style.pointerEvents = "";
        contactEl.style.transform = "";
        contactEl.style.opacity = "";
        contactEl.style.zIndex = "";
        contactEl.style.pointerEvents = "";
        return;
      }

      const spacing = Math.min(window.innerWidth * 0.44, 520);
      const top = panel.getBoundingClientRect().top;

      // Series owns the handoff (scroll leave or nav jump) — don't overwrite pins.
      if (document.documentElement.dataset.aboutFromSeries === "1") {
        return;
      }

      // Sticky not locked yet (or released on scroll-up) — don't paint About
      // ourselves or it flashes for a frame before series reclaims it.
      if (top > 1 && !navHandoff) {
        paintBand(contactEl, -VISUAL_STEP_GAP, spacing, true);
        return;
      }

      // Series sticky still covering the viewport — keep About invisible so it
      // can't peek through from document flow under a fading album.
      const seriesSticky = document.querySelector<HTMLElement>(
        ".image-series__sticky",
      );
      const seriesCovering =
        !!seriesSticky &&
        seriesSticky.style.visibility !== "hidden" &&
        seriesSticky.getBoundingClientRect().bottom > window.innerHeight * 0.35;
      if (seriesCovering && !navHandoff) {
        aboutEl.style.opacity = "0";
        aboutEl.style.visibility = "hidden";
        aboutEl.style.pointerEvents = "none";
        paintBand(contactEl, -VISUAL_STEP_GAP, spacing, true);
        return;
      }

      if (aboutEl.style.visibility === "hidden") {
        aboutEl.style.visibility = "";
      }

      let handoffT = handoffTFromScroll();
      if (navHandoff) {
        const raw = clamp01((now - navHandoff.start) / navHandoff.duration);
        const ease =
          raw < 0.5 ? 4 * raw * raw * raw : 1 - (-2 * raw + 2) ** 3 / 2;
        handoffT =
          navHandoff.fromT + (navHandoff.toT - navHandoff.fromT) * ease;
        if (raw >= 1) navHandoff = null;
      }

      const playhead = handoffT * VISUAL_STEP_GAP;

      // Mirror album axis: About leaves left, Contact enters from right.
      paintBand(aboutEl, playhead - 0, spacing, true);
      paintBand(contactEl, playhead - VISUAL_STEP_GAP, spacing, true);
    };

    const onNavHandoff = (event: Event) => {
      const detail = (event as CustomEvent<{ to?: string }>).detail;
      const toContact = detail?.to === "contact";
      navHandoff = {
        start: performance.now(),
        fromT: handoffTFromScroll(),
        toT: toContact ? 1 : 0,
        duration: 820,
      };
    };

    const tick = (now: number) => {
      paint(now);
      raf = requestAnimationFrame(tick);
    };

    const onResize = () => paint();

    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", onResize);
    window.addEventListener("about-contact-handoff", onNavHandoff);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("about-contact-handoff", onNavHandoff);
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
        style={{ height: `${RUNWAY_VH * 100}vh` }}
      >
        <div className="about-handoff__sticky">
          <div
            ref={aboutRef}
            data-about-arrive
            className="about-handoff__band about-handoff__band--about mx-auto grid w-full max-w-5xl grid-cols-1 items-start gap-x-14 gap-y-12 px-5 md:grid-cols-2 md:gap-y-16 md:px-8 lg:gap-x-16"
          >
            <div
              data-soft-drift="slight"
              className="relative aspect-[3/2] w-full max-w-[22rem] overflow-hidden md:max-w-none"
            >
              <AboutPhoto
                src={heroPhoto.src}
                maskSrc={heroPhoto.maskSrc}
                alt={heroPhoto.alt}
              />
            </div>

            <div data-soft-drift="slight" className="relative z-10 w-full max-w-md md:max-w-none">
              <SilkArrive
                drive={drive}
                strength={1}
                className="space-y-5 text-[16px] font-medium leading-[1.5] tracking-[0.01em] md:text-[18px]"
              >
                <p>{site.about.story}</p>
                <p className="text-[14px] leading-[1.55] tracking-[0.01em] text-muted md:text-[15px]">
                  {site.about.body}
                </p>
              </SilkArrive>
            </div>
          </div>

          <div
            ref={contactRef}
            data-contact-block
            className="about-handoff__band about-handoff__band--contact mx-auto grid w-full max-w-5xl grid-cols-1 items-start gap-x-14 gap-y-12 px-5 md:grid-cols-2 md:gap-y-16 md:px-8 lg:gap-x-16"
          >
            <div
              id="contact"
              className="scroll-mt-16 md:flex md:h-full md:min-h-[480px] md:flex-col md:justify-center lg:min-h-[560px]"
            >
              <SilkArrive
                drive={drive}
                strength={1}
                className="max-w-md space-y-6 text-[22px] font-medium leading-[1.35] tracking-[0.01em] md:max-w-none md:text-[28px]"
              >
                <p>Interested in working together?</p>
                <p className="text-[16px] leading-[1.55] tracking-[0.01em] text-muted md:text-[18px]">
                  Have a product or creative project and think we&apos;d be a
                  good fit?
                </p>
                <p className="pt-2 text-[13px] font-medium tracking-[0.06em]">
                  Send me an email at{" "}
                  <a
                    href={`mailto:${site.email}`}
                    className="underline underline-offset-4 transition-colors hover:text-olive-deep"
                  >
                    {site.email}
                  </a>
                </p>
              </SilkArrive>
              <SilkArrive drive={drive} strength={0.7}>
                <footer className="mt-10 border-t border-ink pt-4 text-[11px] lowercase tracking-[0.16em] md:mt-12">
                  © {new Date().getFullYear()} {site.name}.{site.surname}
                </footer>
              </SilkArrive>
            </div>

            <div className="min-w-0 w-full md:h-full">
              <Spiral3DSlider
                items={spiralSlides}
                autoRotate
                autoSpeed={0.13}
                className="min-h-[360px] md:min-h-[480px] lg:min-h-[560px]"
                ariaLabel="Selected photography spiral gallery"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
