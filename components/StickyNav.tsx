"use client";

import { useEffect, useRef, useState } from "react";
import { albums } from "@/content/photos";
import { openAlbum } from "@/content/albumUi";
import { site } from "@/content/site";

function scrollToImage() {
  const target =
    document.getElementById("image") ?? document.getElementById("top");
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

type DriftSpec = {
  el: HTMLElement;
  ampX: number;
  ampY: number;
  ampR: number;
  speedX: number;
  speedY: number;
  speedR: number;
  phaseX: number;
  phaseY: number;
  phaseR: number;
  biasX: number;
  biasY: number;
};

function navItem(id: string) {
  const item = site.nav.find((entry) => entry.id === id);
  if (!item) throw new Error(`Missing nav item: ${id}`);
  return item;
}

/**
 * Mouth geometry. Letters ride a shallow circle so about/contact hint at a
 * smile without announcing it. Units: x in % of mouth width (box 100 × 16).
 */
const SMILE = {
  cx: 50,
  cy: -118,
  radius: 130,
  maxDeg: 12,
  boxHeight: 16,
  wordGap: 2.6,
};

type SmileLetter = { char: string; deg: number; x: number; y: number };

function placeOnSmile(char: string, slot: number, step: number): SmileLetter {
  const deg = -SMILE.maxDeg + slot * step;
  const rad = (deg * Math.PI) / 180;
  return {
    char,
    deg,
    x: SMILE.cx + SMILE.radius * Math.sin(rad),
    y: SMILE.cy + SMILE.radius * Math.cos(rad),
  };
}

/** Even angular spacing across both words, with a gap where they meet. */
function smileLetters(left: string, right: string) {
  const leftChars = [...left];
  const rightChars = [...right];
  const slots =
    leftChars.length - 1 + SMILE.wordGap + rightChars.length - 1;
  const step = (SMILE.maxDeg * 2) / slots;
  const rightStart = leftChars.length - 1 + SMILE.wordGap;

  return {
    left: leftChars.map((char, i) => placeOnSmile(char, i, step)),
    right: rightChars.map((char, i) => placeOnSmile(char, rightStart + i, step)),
  };
}

/** Each word is absolutely placed in its own half of the mouth box. */
function letterStyle(letter: SmileLetter, half: "left" | "right") {
  const localX = half === "left" ? letter.x * 2 : (letter.x - 50) * 2;
  return {
    left: `${localX.toFixed(3)}%`,
    top: `${((letter.y / SMILE.boxHeight) * 100).toFixed(3)}%`,
    transform: `translate(-50%, -50%) rotate(${letter.deg.toFixed(2)}deg)`,
  };
}

export function StickyNav() {
  const [imageOpen, setImageOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const brandExitRef = useRef<HTMLAnchorElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const image = navItem("image");
  const sound = navItem("sound");
  const dev = navItem("dev");
  const about = navItem("about");
  const contact = navItem("contact");
  const smile = smileLetters(about.label, contact.label);

  // Soft wander on labels (same as desktop rail).
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    const items = Array.from(
      bar.querySelectorAll<HTMLElement>("[data-rail-drift]"),
    );
    if (!items.length) return;

    const specs: DriftSpec[] = items.map((el, i) => {
      const album = el.classList.contains("site-nav__album-drift");
      return {
        el,
        ampX: album ? 2.4 : 3.2 + (i % 3) * 1.4,
        ampY: album ? 2.0 : 2.4 + (i % 4) * 1.1,
        ampR: album ? 0.4 : 0.55 + (i % 3) * 0.28,
        speedX: 0.00032 + i * 0.00006,
        speedY: 0.00026 + i * 0.00008,
        speedR: 0.0002 + i * 0.00005,
        phaseX: i * 1.73,
        phaseY: i * 2.41,
        phaseR: i * 1.19,
        biasX: album ? 1.6 : 0,
        biasY: album ? -1.2 : 0,
      };
    });

    let raf = 0;
    const driftStart = performance.now();

    const tick = (now: number) => {
      const gain = Math.min(1, Math.max(0, (now - driftStart - 400) / 900));
      const ease = 1 - Math.pow(1 - gain, 3);
      for (const s of specs) {
        const x =
          (Math.sin(now * s.speedX + s.phaseX) * s.ampX + s.biasX) * ease;
        const y =
          (Math.cos(now * s.speedY + s.phaseY) * s.ampY + s.biasY) * ease;
        const r = Math.sin(now * s.speedR + s.phaseR) * s.ampR * ease;
        s.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${r.toFixed(3)}deg)`;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      for (const s of specs) s.el.style.transform = "";
    };
  }, []);

  // Brand exits left, nav face exits right as you leave the hero — reverse on scroll up.
  useEffect(() => {
    const header = headerRef.current;
    const brand = brandExitRef.current;
    const bar = barRef.current;
    if (!header || !brand || !bar) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const linkItems = Array.from(
      bar.querySelectorAll<HTMLElement>("[data-nav-exit-item]"),
    );

    let raf = 0;

    const paint = () => {
      const end = window.innerHeight * 0.52;
      const raw = reduce.matches ? 0 : clamp01(window.scrollY / Math.max(end, 1));
      const p = easeInOutCubic(raw);

      const brandX = -Math.min(160, window.innerWidth * 0.42) * p;
      brand.style.transform = `translate3d(${brandX.toFixed(2)}px, 0, 0)`;
      brand.style.opacity = String(1 - p);

      const travel = Math.min(200, window.innerWidth * 0.55);
      linkItems.forEach((el, i) => {
        const stagger = i * 0.045;
        const local = clamp01((raw - stagger) / Math.max(1 - stagger, 0.001));
        const lp = easeInOutCubic(local);
        el.style.transform = `translate3d(${(travel * lp).toFixed(2)}px, 0, 0)`;
        el.style.opacity = String(1 - lp);
      });

      const gone = p > 0.92;
      header.classList.toggle("is-exited", gone);
      header.style.pointerEvents = gone ? "none" : "";
    };

    const tick = () => {
      paint();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    window.addEventListener("scroll", paint, { passive: true });
    window.addEventListener("resize", paint);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", paint);
      window.removeEventListener("resize", paint);
      brand.style.transform = "";
      brand.style.opacity = "";
      for (const el of linkItems) {
        el.style.transform = "";
        el.style.opacity = "";
      }
      header.classList.remove("is-exited");
      header.style.pointerEvents = "";
    };
  }, []);

  const toggleImage = () => {
    setImageOpen((open) => {
      const next = !open;
      if (next) scrollToImage();
      return next;
    });
  };

  return (
    <header ref={headerRef} className="site-nav fixed inset-x-0 top-0 z-40 md:hidden">
      <div ref={barRef} className="site-nav__bar">
        <a ref={brandExitRef} href="#top" className="site-nav__brand">
          <span data-rail-drift className="site-nav__brand-drift">
            <span>{site.name}.</span>
            <span className="site-nav__brand-soft">{site.surname}</span>
          </span>
        </a>

        <nav className="site-nav__links site-nav__face" aria-label="Site">
          <ul className="site-nav__face-parts">
            <li className="site-nav__face-eyes">
              <ul className="site-nav__face-row site-nav__face-row--eyes">
                <li data-nav-exit-item className="site-nav__face-eye site-nav__face-eye--left">
                  <button
                    type="button"
                    aria-expanded={imageOpen}
                    onClick={toggleImage}
                    data-nav-origin={image.id}
                    data-rail-drift
                    className="site-nav__image-btn"
                  >
                    <span>{image.label}</span>
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
                  <div
                    className={
                      imageOpen ? "site-nav__albums is-open" : "site-nav__albums"
                    }
                    aria-hidden={!imageOpen}
                  >
                    <div className="site-nav__albums-clip">
                      <ul className="site-nav__albums-row">
                        {albums.map((album, index) => (
                          <li key={album.id}>
                            <span
                              className="site-nav__album-drift"
                              data-rail-drift
                            >
                              <button
                                type="button"
                                tabIndex={imageOpen ? 0 : -1}
                                onClick={() => openAlbum(album.id)}
                                style={{ ["--i" as string]: index }}
                              >
                                {album.label.replace(/^series:\s*/i, "")}
                              </button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </li>
                <li data-nav-exit-item className="site-nav__face-eye site-nav__face-eye--right">
                  <a
                    href={`#${sound.id}`}
                    data-nav-origin={sound.id}
                    data-rail-drift
                  >
                    {sound.label}
                  </a>
                </li>
              </ul>
            </li>

            <li data-nav-exit-item className="site-nav__face-nose">
              <a
                href={`#${dev.id}`}
                data-nav-origin={dev.id}
                data-rail-drift
              >
                {dev.label}
              </a>
            </li>

            <li data-nav-exit-item className="site-nav__face-mouth">
              <div className="site-nav__face-mouth-stage" data-rail-drift>
                <a
                  href={`#${about.id}`}
                  data-nav-origin={about.id}
                  aria-label={about.label}
                  className="site-nav__face-smile site-nav__face-smile--left"
                >
                  {smile.left.map((letter, i) => (
                    <span
                      key={`${letter.char}-${i}`}
                      style={letterStyle(letter, "left")}
                      aria-hidden
                    >
                      {letter.char}
                    </span>
                  ))}
                </a>
                <a
                  href={`#${contact.id}`}
                  data-nav-origin={contact.id}
                  aria-label={contact.label}
                  className="site-nav__face-smile site-nav__face-smile--right"
                >
                  {smile.right.map((letter, i) => (
                    <span
                      key={`${letter.char}-${i}`}
                      style={letterStyle(letter, "right")}
                      aria-hidden
                    >
                      {letter.char}
                    </span>
                  ))}
                </a>
              </div>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
