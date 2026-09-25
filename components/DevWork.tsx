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

function hostFromUrl(url?: string) {
  if (!url) return "about:blank";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function liveEmbedSrc(project: Project) {
  if (!project.url) return "";
  if (!project.embedQuery) return project.url;
  const joiner = project.url.includes("?") ? "&" : "?";
  return `${project.url}${joiner}${project.embedQuery}`;
}

function ProjectFrame({ src, title }: { src: string; title: string }) {
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
  const isOpenTab = active === OPEN_TAB_SLUG;
  const project = isOpenTab
    ? null
    : (projects.find((p) => p.slug === active) ?? projects[0]);

  if (!isOpenTab && !project) return null;

  const showIntro = Boolean(
    project?.url && project.preview && !liveSlugs[project.slug],
  );
  const showEmbed = Boolean(project?.url && !showIntro);
  const addressValue = isOpenTab
    ? "mootez.bgts/new"
    : showIntro
      ? `${hostFromUrl(project!.url)} · intro`
      : hostFromUrl(project!.url);

  const openAvailabilityTab = () => {
    setOpenTabAdded(true);
    setActive(OPEN_TAB_SLUG);
  };

  const closeAvailabilityTab = () => {
    setOpenTabAdded(false);
    setActive(projects[0]?.slug ?? "");
  };

  return (
    <section id="dev" className="scroll-mt-16 px-4 py-16 md:px-8 md:py-24">
      <SectionMark label="Dev" extra="Projects and products" />

      <div className="mt-8 flex justify-center">
        <div className="project-browser" role="region" aria-label="Project browser">
          <div className="project-browser__tabs-head">
            <div className="project-browser__tabs" role="tablist" aria-label="Projects">
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
                    <span className="project-browser__tab-label">{item.title}</span>
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
                  <span className="project-browser__tab-label">{OPEN_TAB_TITLE}</span>
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

            <div className="project-browser__window-opt" aria-hidden>
              <button type="button" tabIndex={-1}>
                −
              </button>
              <button type="button" tabIndex={-1}>
                □
              </button>
              <button
                type="button"
                className="project-browser__window-close"
                tabIndex={-1}
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
              ←
            </button>
            <button type="button" aria-label="Forward" disabled>
              →
            </button>

            <input
              type="text"
              readOnly
              value={addressValue}
              aria-label="Address"
              className="project-browser__address"
            />

            <button type="button" aria-label="Menu" tabIndex={-1}>
              ⋮
            </button>
            <span className="project-browser__star" aria-hidden>
              ✰
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
                <p className="project-browser__meta">Available · {site.year}</p>
                <h3 className="project-browser__title">OPEN FOR PROJECTS</h3>
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
                />
                <a
                  href={project!.url}
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
                <h3 className="project-browser__title">
                  {project!.title.toUpperCase()}
                </h3>
                <p className="project-browser__summary">{project!.summary}</p>
                {project!.url && project!.preview ? (
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
                    See it
                  </button>
                ) : project!.placeholder ? (
                  <p className="project-browser__soon">Coming soon</p>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
