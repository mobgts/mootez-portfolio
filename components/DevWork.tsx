"use client";

import { useEffect, useRef, useState } from "react";
import { projects } from "@/content/projects";
import { site } from "@/content/site";
import type { Project } from "@/content/types";
import { SectionMark } from "./SectionMark";

/** Desktop layout width so Co-Erasmus renders at ~100% desktop, then scales into the card. */
const DESKTOP_WIDTH = 1280;
const OPEN_TAB_SLUG = "open-for-projects";
const OPEN_TAB_TITLE = "New project";
const TOAST_MS = 1800;
const CHROME_MS = 320;

type ChromePhase = "open" | "closing" | "closed" | "opening";

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
  const [openTabAdded, setOpenTabAdded] = useState(false);
  const [inEmbed, setInEmbed] = useState(false);
  const [chromePhase, setChromePhase] = useState<ChromePhase>("open");
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chromeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOpenTab = active === OPEN_TAB_SLUG;
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

  const openAvailabilityTab = () => {
    setOpenTabAdded(true);
    setActive(OPEN_TAB_SLUG);
    setMenuOpen(false);
  };

  const closeAvailabilityTab = () => {
    setOpenTabAdded(false);
    setActive(projects[0]?.slug ?? "");
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
    setChromePhase("closing");
    if (chromeTimer.current) clearTimeout(chromeTimer.current);
    chromeTimer.current = setTimeout(() => {
      setChromePhase("closed");
      chromeTimer.current = null;
    }, CHROME_MS);
  };

  const openChrome = () => {
    if (chromePhase !== "closed") return;
    setChromePhase("opening");
    if (chromeTimer.current) clearTimeout(chromeTimer.current);
    chromeTimer.current = setTimeout(() => {
      setChromePhase("open");
      chromeTimer.current = null;
    }, CHROME_MS);
  };

  const showBrowser = chromePhase !== "closed";
  const showFolder = chromePhase !== "open";

  const browserClass = [
    "project-browser",
    "project-browser__stage-item",
    expanded ? "project-browser--expanded" : "",
    menuOpen ? "project-browser--menu-open" : "",
    chromePhase === "closing" ? "project-browser__stage-item--exit" : "",
    chromePhase === "opening" ? "project-browser__stage-item--enter" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const folderClass = [
    "project-browser__file",
    "project-browser__stage-item",
    chromePhase === "opening" ? "project-browser__stage-item--exit" : "",
    chromePhase === "closing" ? "project-browser__stage-item--enter" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section id="dev" className="scroll-mt-16 px-4 py-10 md:px-8 md:py-14">
      <SectionMark label="Dev" />

      <div className="project-browser__stage">
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
            className={browserClass}
            role="region"
            aria-label="Project browser"
            aria-hidden={chromePhase !== "open"}
          >
            <div className="project-browser__tabs-head">
              <div
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
                      <span className="project-browser__close-tab" aria-hidden>
                        ×
                      </span>
                    </button>
                  );
                })}

                {openTabAdded ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isOpenTab}
                    className={
                      isOpenTab
                        ? "project-browser__tab project-browser__tab--open"
                        : "project-browser__tab"
                    }
                    onClick={() => setActive(OPEN_TAB_SLUG)}
                  >
                    <span className="project-browser__tab-label">
                      {OPEN_TAB_TITLE}
                    </span>
                    <span
                      className="project-browser__close-tab"
                      role="presentation"
                      onClick={(event) => {
                        event.stopPropagation();
                        closeAvailabilityTab();
                      }}
                    >
                      ×
                    </span>
                  </button>
                ) : null}

                <button
                  type="button"
                  className="project-browser__new-tab"
                  aria-label="Open for new projects"
                  onClick={openAvailabilityTab}
                >
                  +
                </button>
              </div>

              <div className="project-browser__window-opt">
                <button
                  type="button"
                  aria-label="Minimize"
                  onClick={() => showToast("Nope, can't do that.")}
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
              <span className="project-browser__star" aria-hidden>
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                  <path
                    d="M8 1.75l1.62 3.28 3.62.53-2.62 2.55.62 3.61L8 9.98l-3.24 1.74.62-3.61L2.76 5.56l3.62-.53L8 1.75z"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>

            <div
              className={
                showEmbed
                  ? "project-browser__body project-browser__body--embed"
                  : "project-browser__body"
              }
              role="tabpanel"
              aria-label={isOpenTab ? OPEN_TAB_TITLE : project!.title}
            >
              {isOpenTab ? (
                <>
                  <p className="project-browser__meta">
                    Available · {site.year}
                  </p>
                  <h3 className="project-browser__title">Open for projects</h3>
                  <p className="project-browser__summary">
                    Looking for a product partner, a build, or something between
                    image and code. Say what you need — I&apos;m open.
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
                  <a
                    href={absoluteUrl(project!.url!)}
                    target="_blank"
                    rel="noreferrer"
                    className="project-browser__open-live"
                  >
                    Open live
                  </a>
                </>
              ) : (
                <>
                  <p className="project-browser__meta">
                    {project!.role} · {project!.year}
                  </p>
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
                      Check it out
                    </button>
                  ) : project!.placeholder ? (
                    <p className="project-browser__soon">Coming soon</p>
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
      </div>
    </section>
  );
}
