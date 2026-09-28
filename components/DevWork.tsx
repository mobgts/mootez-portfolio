"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { projects } from "@/content/projects";
import { site } from "@/content/site";
import type { Project } from "@/content/types";
import { FromNavMark } from "./FromNavMark";
import { SilkArrive, useSilkDrive } from "./AboutSilk";

/** Desktop layout width so Co-Erasmus renders at ~100% desktop, then scales into the card. */
const DESKTOP_WIDTH = 1280;
const OPEN_TAB_PREFIX = "say-hi";
const OPEN_TAB_TITLE = "Say hi!";
const MAX_SAY_HI_TABS = 4;
const TOAST_MS = 1800;
const CHROME_MS = 320;
const DOCK_MS = 720;

type ChromePhase =
  | "open"
  | "closing"
  | "minimizing"
  | "closed"
  | "opening"
  | "restoring";

type ClosedAs = "folder" | "mark";

function isSayHiTab(slug: string) {
  return slug.startsWith(`${OPEN_TAB_PREFIX}-`);
}

function setDockVars(browser: HTMLElement, mark: HTMLElement) {
  const from = browser.getBoundingClientRect();
  const to = mark.getBoundingClientRect();
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const scale = Math.max(
    Math.min(to.width / from.width, to.height / from.height),
    0.045,
  );
  browser.style.setProperty("--dock-x", `${dx.toFixed(1)}px`);
  browser.style.setProperty("--dock-y", `${dy.toFixed(1)}px`);
  browser.style.setProperty("--dock-scale", scale.toFixed(4));
}

function clearDockVars(browser: HTMLElement | null) {
  if (!browser) return;
  browser.style.removeProperty("--dock-x");
  browser.style.removeProperty("--dock-y");
  browser.style.removeProperty("--dock-scale");
}

function hostFromUrl(url?: string) {
  if (!url) return "about:blank";
  if (url.startsWith("/")) return "mootez.bgts";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function absoluteUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).href;
}

function liveEmbedSrc(project: Project) {
  if (!project.url) return "";
  const base = absoluteUrl(project.url);
  if (!project.embedQuery) return base;
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}${project.embedQuery}`;
}

function isSameOriginSrc(src: string) {
  if (typeof window === "undefined") return false;
  try {
    return new URL(src, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

function ProjectFrame({
  src,
  title,
  bridgeCursor,
}: {
  src: string;
  title: string;
  bridgeCursor?: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({
    scale: 1,
    width: DESKTOP_WIDTH,
    height: 800,
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const stageW = stage.clientWidth;
        const stageH = stage.clientHeight;
        if (stageW < 1 || stageH < 1) return;

        const width = Math.max(stageW, DESKTOP_WIDTH);
        const scale = stageW / width;
        const height = Math.round(stageH / scale);
        setView((prev) => {
          if (
            prev.scale === scale &&
            prev.width === width &&
            prev.height === height
          ) {
            return prev;
          }
          return { scale, width, height };
        });
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={stageRef} className="project-browser__frame-stage">
      <iframe
        src={src}
        title={title}
        className="project-browser__frame"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        data-embed-cursor={bridgeCursor ? "1" : undefined}
        style={{
          width: view.width,
          height: view.height,
          transform: `scale(${view.scale})`,
        }}
      />
    </div>
  );
}

export function DevWork() {
  const [active, setActive] = useState(projects[0]?.slug ?? "");
  const [liveSlugs, setLiveSlugs] = useState<Record<string, boolean>>({});
  const [sayHiTabs, setSayHiTabs] = useState<string[]>([`${OPEN_TAB_PREFIX}-1`]);
  const sayHiSeq = useRef(1);
  const [inEmbed, setInEmbed] = useState(false);
  const [chromePhase, setChromePhase] = useState<ChromePhase>("open");
  const [closedAs, setClosedAs] = useState<ClosedAs | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [dockReady, setDockReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [starred, setStarred] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [canScrollTabsRight, setCanScrollTabsRight] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const browserRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chromeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const drive = useSilkDrive(sectionRef);
  const isOpenTab = isSayHiTab(active);
  const project = isOpenTab
    ? null
    : (projects.find((p) => p.slug === active) ?? projects[0]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setInEmbed(params.has("embed") || window.self !== window.top);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (chromeTimer.current) clearTimeout(chromeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (chromePhase === "closed") {
      setCanScrollTabsRight(false);
      return;
    }

    const el = tabsRef.current;
    if (!el) return;

    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = el.scrollWidth - el.clientWidth;
        setCanScrollTabsRight(max > 4 && el.scrollLeft < max - 4);
      });
    };

    update();
    // Children changing width doesn't always resize the scroller box.
    const ro = new ResizeObserver(update);
    ro.observe(el);
    for (const child of el.children) {
      if (child instanceof HTMLElement) ro.observe(child);
    }
    const mo = new MutationObserver(() => {
      for (const child of el.children) {
        if (child instanceof HTMLElement) ro.observe(child);
      }
      update();
    });
    mo.observe(el, { childList: true });
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [chromePhase, sayHiTabs.length]);

  useEffect(() => {
    if (chromePhase === "closed") return;
    const el = tabsRef.current;
    if (!el) return;
    const selected = el.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!selected) return;
    const left = selected.offsetLeft;
    const right = left + selected.offsetWidth;
    const pad = 12;
    if (left < el.scrollLeft + pad) {
      el.scrollTo({ left: Math.max(0, left - pad), behavior: "smooth" });
    } else if (right > el.scrollLeft + el.clientWidth - pad) {
      el.scrollTo({
        left: right - el.clientWidth + pad,
        behavior: "smooth",
      });
    }
  }, [active, chromePhase]);

  // Same soft wander as the left-rail nav labels.
  useEffect(() => {
    const browser = browserRef.current;
    if (!browser || chromePhase === "closed") return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    const el = browser.querySelector<HTMLElement>(".project-browser__see-it");
    if (!el) return;

    const ampX = 4.2;
    const ampY = 3.2;
    const ampR = 0.7;
    const speedX = 0.00038;
    const speedY = 0.0003;
    const speedR = 0.00024;
    const phaseX = 2.1;
    const phaseY = 3.4;
    const phaseR = 1.7;

    let raf = 0;
    const driftStart = performance.now();
    const tick = (now: number) => {
      const gain = Math.min(1, Math.max(0, (now - driftStart - 400) / 900));
      const ease = 1 - Math.pow(1 - gain, 3);
      const x = Math.sin(now * speedX + phaseX) * ampX * ease;
      const y = Math.cos(now * speedY + phaseY) * ampY * ease;
      const r = Math.sin(now * speedR + phaseR) * ampR * ease;
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${r.toFixed(3)}deg)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      el.style.transform = "";
    };
  }, [active, liveSlugs, chromePhase, isOpenTab]);

  if (!isOpenTab && !project) return null;

  const selfEmbedBlocked =
    inEmbed && Boolean(project?.url?.startsWith("/"));
  const showIntro = Boolean(
    project?.url &&
      project.preview &&
      !liveSlugs[project.slug] &&
      !selfEmbedBlocked,
  );
  const showEmbed = Boolean(
    project?.url && !showIntro && !selfEmbedBlocked,
  );
  const addressValue = isOpenTab
    ? "mootez.bgts/new"
    : showIntro
      ? `${hostFromUrl(project!.url)} · intro`
      : hostFromUrl(project!.url);
  const starKey = isOpenTab ? active : (project?.slug ?? "");
  const isStarred = Boolean(starKey && starred[starKey]);

  const openAvailabilityTab = () => {
    if (sayHiTabs.length >= MAX_SAY_HI_TABS) return;
    sayHiSeq.current += 1;
    const id = `${OPEN_TAB_PREFIX}-${sayHiSeq.current}`;
    setSayHiTabs((prev) => [...prev, id]);
    setActive(id);
    setMenuOpen(false);
  };

  const closeAvailabilityTab = (id: string) => {
    const remaining = sayHiTabs.filter((tab) => tab !== id);
    setSayHiTabs(remaining);
    if (active === id) {
      setActive(remaining[remaining.length - 1] ?? projects[0]?.slug ?? "");
    }
  };

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, TOAST_MS);
  };

  const closeChrome = () => {
    if (chromePhase !== "open") return;
    setMenuOpen(false);
    setClosedAs("folder");
    setChromePhase("closing");
    if (chromeTimer.current) clearTimeout(chromeTimer.current);
    chromeTimer.current = setTimeout(() => {
      setChromePhase("closed");
      chromeTimer.current = null;
    }, CHROME_MS);
  };

  const minimizeChrome = () => {
    if (chromePhase !== "open") return;
    setMenuOpen(false);

    const browser = browserRef.current;
    const mark = sectionRef.current?.querySelector<HTMLElement>(
      ".from-nav-mark__fly",
    );
    if (browser && mark) setDockVars(browser, mark);

    setClosedAs("mark");
    setChromePhase("minimizing");
    if (chromeTimer.current) clearTimeout(chromeTimer.current);
    chromeTimer.current = setTimeout(() => {
      clearDockVars(browserRef.current);
      setChromePhase("closed");
      chromeTimer.current = null;
    }, DOCK_MS);
  };

  const openChrome = () => {
    if (chromePhase !== "closed") return;
    setChromePhase("opening");
    if (chromeTimer.current) clearTimeout(chromeTimer.current);
    chromeTimer.current = setTimeout(() => {
      setClosedAs(null);
      setChromePhase("open");
      chromeTimer.current = null;
    }, CHROME_MS);
  };

  const restoreChrome = () => {
    if (chromePhase !== "closed" || closedAs !== "mark") return;
    setDockReady(false);
    setChromePhase("restoring");
    if (chromeTimer.current) clearTimeout(chromeTimer.current);
    chromeTimer.current = setTimeout(() => {
      clearDockVars(browserRef.current);
      setDockReady(false);
      setClosedAs(null);
      setChromePhase("open");
      chromeTimer.current = null;
    }, DOCK_MS);
  };

  useLayoutEffect(() => {
    if (chromePhase !== "restoring") return;
    const browser = browserRef.current;
    const mark = sectionRef.current?.querySelector<HTMLElement>(
      ".from-nav-mark__fly",
    );
    if (browser && mark) setDockVars(browser, mark);
    setDockReady(true);
  }, [chromePhase]);

  const showBrowser = chromePhase !== "closed";
  const showFolder = chromePhase !== "open";

  const browserClass = [
    "project-browser",
    "project-browser__stage-item",
    expanded ? "project-browser--expanded" : "",
    menuOpen ? "project-browser--menu-open" : "",
    chromePhase === "closing" ? "project-browser__stage-item--exit" : "",
    chromePhase === "minimizing" ? "project-browser--dock-exit" : "",
    chromePhase === "restoring" && !dockReady
      ? "project-browser--dock-pending"
      : "",
    chromePhase === "restoring" && dockReady
      ? "project-browser--dock-enter"
      : "",
    chromePhase === "opening" ? "project-browser__stage-item--enter" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const folderClass = [
    "project-browser__file",
    "project-browser__stage-item",
    chromePhase === "opening" || chromePhase === "restoring"
      ? "project-browser__stage-item--exit"
      : "",
    chromePhase === "closing" ? "project-browser__stage-item--enter" : "",
    chromePhase === "minimizing"
      ? "project-browser__stage-item--enter-late"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      ref={sectionRef}
      id="dev"
      className="scroll-mt-16 px-4 pt-20 pb-10 md:px-8 md:pt-28 md:pb-14"
    >
      <FromNavMark
        navId="dev"
        label="Dev"
        extra="Selected work"
        onActivate={
          chromePhase === "closed" && closedAs === "mark"
            ? restoreChrome
            : undefined
        }
        activateLabel="Open projects"
      />

      <SilkArrive
        drive={drive}
        strength={1.3}
        className="project-browser__stage"
      >
        {showFolder ? (
          <button
            type="button"
            className={folderClass}
            onClick={openChrome}
            aria-label="Open projects.folder"
            tabIndex={chromePhase === "closed" ? 0 : -1}
            aria-hidden={chromePhase !== "closed"}
          >
            <span className="project-browser__file-icon" aria-hidden>
              <svg viewBox="0 0 64 52" fill="none">
                <path
                  d="M4 14c0-3.3 2.7-6 6-6h14.2l4.4 4.8H54c3.3 0 6 2.7 6 6v26c0 3.3-2.7 6-6 6H10c-3.3 0-6-2.7-6-6V14Z"
                  fill="currentColor"
                  className="project-browser__file-folder"
                />
                <path
                  d="M4 22h56v24c0 3.3-2.7 6-6 6H10c-3.3 0-6-2.7-6-6V22Z"
                  fill="currentColor"
                  className="project-browser__file-folder-front"
                />
              </svg>
            </span>
            <span className="project-browser__file-name">projects.folder</span>
          </button>
        ) : null}

        {showBrowser ? (
          <div
            ref={browserRef}
            className={browserClass}
            role="region"
            aria-label="Project browser"
            aria-hidden={chromePhase !== "open"}
          >
            <div className="project-browser__tabs-head">
              <div
                className={
                  canScrollTabsRight
                    ? "project-browser__tabs-shell project-browser__tabs-shell--more"
                    : "project-browser__tabs-shell"
                }
              >
                <div
                  ref={tabsRef}
                  className="project-browser__tabs"
                  role="tablist"
                  aria-label="Projects"
                >
                  {projects.map((item) => {
                    const isOpen = !isOpenTab && item.slug === project?.slug;
                    return (
                      <button
                        key={item.slug}
                        type="button"
                        role="tab"
                        aria-selected={isOpen}
                        className={
                          isOpen
                            ? "project-browser__tab project-browser__tab--open"
                            : "project-browser__tab"
                        }
                        onClick={() => setActive(item.slug)}
                      >
                        <span className="project-browser__tab-label">
                          {item.title}
                        </span>
                      </button>
                    );
                  })}

                  {sayHiTabs.map((id) => {
                    const selected = active === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        className={
                          selected
                            ? "project-browser__tab project-browser__tab--open"
                            : "project-browser__tab"
                        }
                        onClick={() => setActive(id)}
                      >
                        <span className="project-browser__tab-label">
                          {OPEN_TAB_TITLE}
                        </span>
                        <span
                          className="project-browser__close-tab"
                          role="presentation"
                          onClick={(event) => {
                            event.stopPropagation();
                            closeAvailabilityTab(id);
                          }}
                        >
                          ×
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    className="project-browser__new-tab"
                    aria-label="Open Say hi! tab"
                    disabled={sayHiTabs.length >= MAX_SAY_HI_TABS}
                    onClick={openAvailabilityTab}
                  >
                    +
                  </button>
                </div>

                {canScrollTabsRight ? (
                  <button
                    type="button"
                    className="project-browser__tabs-more"
                    aria-label="Scroll tabs right"
                    onClick={() => {
                      const el = tabsRef.current;
                      if (!el) return;
                      const step = Math.max(120, Math.round(el.clientWidth * 0.55));
                      el.scrollLeft += step;
                    }}
                  >
                    <span aria-hidden>›</span>
                  </button>
                ) : null}
              </div>

              <div className="project-browser__window-opt">
                <button
                  type="button"
                  aria-label="Minimize"
                  onClick={minimizeChrome}
                >
                  −
                </button>
                <button
                  type="button"
                  aria-label={expanded ? "Restore" : "Maximize"}
                  aria-pressed={expanded}
                  onClick={() => setExpanded((prev) => !prev)}
                >
                  {expanded ? "❐" : "□"}
                </button>
                <button
                  type="button"
                  className="project-browser__window-close"
                  aria-label="Close to projects.folder"
                  onClick={closeChrome}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="project-browser__head">
              <button
                type="button"
                aria-label="Back to project intro"
                disabled={!showEmbed || !project?.preview}
                onClick={() => {
                  if (!project) return;
                  setLiveSlugs((prev) => {
                    const next = { ...prev };
                    delete next[project.slug];
                    return next;
                  });
                }}
              >
                <svg
                  className="project-browser__nav-icon"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M10 3.5 4.5 8 10 12.5M4.5 8H13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button type="button" aria-label="Forward" disabled>
                <svg
                  className="project-browser__nav-icon"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M6 3.5 11.5 8 6 12.5M11.5 8H3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <input
                type="text"
                readOnly
                value={addressValue}
                aria-label="Address"
                className="project-browser__address"
              />

              <div className="project-browser__menu" ref={menuRef}>
                <button
                  type="button"
                  aria-label="Menu"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  ⋮
                </button>
                {menuOpen ? (
                  <div className="project-browser__menu-panel" role="menu">
                    <a
                      role="menuitem"
                      href="#contact"
                      className="project-browser__menu-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      Get in touch
                    </a>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className={
                  isStarred
                    ? "project-browser__star project-browser__star--on"
                    : "project-browser__star"
                }
                aria-label={isStarred ? "Remove bookmark" : "Bookmark"}
                aria-pressed={isStarred}
                onClick={() => {
                  if (!starKey) return;
                  const next = !starred[starKey];
                  setStarred((prev) => ({ ...prev, [starKey]: next }));
                  showToast(next ? "Bookmarked." : "Removed.");
                }}
              >
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
                  <path
                    d="M8 1.75l1.62 3.28 3.62.53-2.62 2.55.62 3.61L8 9.98l-3.24 1.74.62-3.61L2.76 5.56l3.62-.53L8 1.75z"
                    fill={isStarred ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div
              className={
                showEmbed
                  ? "project-browser__body project-browser__body--embed"
                  : isOpenTab
                    ? "project-browser__body project-browser__body--say-hi"
                    : "project-browser__body"
              }
              role="tabpanel"
              aria-label={isOpenTab ? OPEN_TAB_TITLE : project!.title}
            >
              {isOpenTab ? (
                <>
                  <h3 className="project-browser__title">Open to projects :)</h3>
                  <p className="project-browser__summary">
                    Product design, development and creative direction. You
                    know where to click.
                  </p>
                  <a
                    href={`mailto:${site.email}?subject=New%20project`}
                    className="project-browser__see-it"
                  >
                    Get in touch
                  </a>
                </>
              ) : showEmbed ? (
                <>
                  <ProjectFrame
                    key={`${project!.slug}-live`}
                    src={liveEmbedSrc(project!)}
                    title={`${project!.title} — live site`}
                    bridgeCursor={isSameOriginSrc(liveEmbedSrc(project!))}
                  />
                  {project!.slug !== "portfolio" ? (
                    <a
                      href={absoluteUrl(project!.url!)}
                      target="_blank"
                      rel="noreferrer"
                      className="project-browser__open-live"
                    >
                      Open live
                    </a>
                  ) : null}
                </>
              ) : (
                <>
                  {(project!.role || project!.year) && (
                    <p className="project-browser__meta">
                      {[project!.role, project!.year].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <h3 className="project-browser__title">{project!.title}</h3>
                  <p className="project-browser__summary">{project!.summary}</p>
                  {selfEmbedBlocked ? (
                    <p className="project-browser__soon">
                      You&apos;re looking at it
                    </p>
                  ) : project!.url && project!.preview ? (
                    <button
                      type="button"
                      className="project-browser__see-it"
                      onClick={() =>
                        setLiveSlugs((prev) => ({
                          ...prev,
                          [project!.slug]: true,
                        }))
                      }
                    >
                      Check it out!
                    </button>
                  ) : project!.placeholder ? (
                    <p className="project-browser__soon">Coming soon :)</p>
                  ) : null}
                </>
              )}
            </div>

            {toast ? (
              <div className="project-browser__toast" role="status">
                {toast}
              </div>
            ) : null}
          </div>
        ) : null}
      </SilkArrive>
    </section>
  );
}
