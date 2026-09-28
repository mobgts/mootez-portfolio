"use client";

import { useEffect, useRef, useState } from "react";
import { sets } from "@/content/sets";
import { FromNavMark } from "./FromNavMark";
import { SilkArrive, useSilkDrive } from "./AboutSilk";
import { Still } from "./Still";

type SoundCloudWidget = {
  bind: (event: string, listener: (data?: SoundCloudProgress) => void) => void;
  unbind: (event: string) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seekTo: (ms: number) => void;
  getPosition: (callback: (ms: number) => void) => void;
  getDuration: (callback: (ms: number) => void) => void;
  getCurrentSound: (
    callback: (sound: SoundCloudTrack | null) => void,
  ) => void;
};

type SoundCloudProgress = {
  currentPosition?: number;
  relativePosition?: number;
};

type SoundCloudTrack = {
  waveform_url?: string;
};

type SoundCloudApi = {
  Widget: {
    (iframe: HTMLIFrameElement): SoundCloudWidget;
    Events: {
      READY: string;
      PLAY: string;
      PAUSE: string;
      FINISH: string;
      PLAY_PROGRESS: string;
    };
  };
};

declare global {
  interface Window {
    SC?: SoundCloudApi;
  }
}

const WAVE_BARS = 96;

function SoundCloudIcon() {
  return (
    <svg
      viewBox="0 0 640 512"
      height="1em"
      xmlns="http://www.w3.org/2000/svg"
      fill="#ff8800"
      className="sound-player__cloud"
      aria-hidden
    >
      <path d="M111.4 256.3l5.8 65-5.8 68.3c-.3 2.5-2.2 4.4-4.4 4.4s-4.2-1.9-4.2-4.4l-5.6-68.3 5.6-65c0-2.2 1.9-4.2 4.2-4.2 2.2 0 4.1 2 4.4 4.2zm21.4-45.6c-2.8 0-4.7 2.2-5 5l-5 105.6 5 68.3c.3 2.8 2.2 5 5 5 2.5 0 4.7-2.2 4.7-5l5.8-68.3-5.8-105.6c0-2.8-2.2-5-4.7-5zm25.5-24.1c-3.1 0-5.3 2.2-5.6 5.3l-4.4 130 4.4 67.8c.3 3.1 2.5 5.3 5.6 5.3 2.8 0 5.3-2.2 5.3-5.3l5.3-67.8-5.3-130c0-3.1-2.5-5.3-5.3-5.3zM7.2 283.2c-1.4 0-2.2 1.1-2.5 2.5L0 321.3l4.7 35c.3 1.4 1.1 2.5 2.5 2.5s2.2-1.1 2.5-2.5l5.6-35-5.6-35.6c-.3-1.4-1.1-2.5-2.5-2.5zm23.6-21.9c-1.4 0-2.5 1.1-2.5 2.5l-6.4 57.5 6.4 56.1c0 1.7 1.1 2.8 2.5 2.8s2.5-1.1 2.8-2.5l7.2-56.4-7.2-57.5c-.3-1.4-1.4-2.5-2.8-2.5zm25.3-11.4c-1.7 0-3.1 1.4-3.3 3.3L47 321.3l5.8 65.8c.3 1.7 1.7 3.1 3.3 3.1 1.7 0 3.1-1.4 3.1-3.1l6.9-65.8-6.9-68.1c0-1.9-1.4-3.3-3.1-3.3zm25.3-2.2c-1.9 0-3.6 1.4-3.6 3.6l-5.8 70 5.8 67.8c0 2.2 1.7 3.6 3.6 3.6s3.6-1.4 3.9-3.6l6.4-67.8-6.4-70c-.3-2.2-2-3.6-3.9-3.6zm241.4-110.9c-1.1-.8-2.8-1.4-4.2-1.4-2.2 0-4.2.8-5.6 1.9-1.9 1.7-3.1 4.2-3.3 6.7v.8l-3.3 176.7 1.7 32.5 1.7 31.7c.3 4.7 4.2 8.6 8.9 8.6s8.6-3.9 8.6-8.6l3.9-64.2-3.9-177.5c-.4-3-2-5.8-4.5-7.2zm-26.7 15.3c-1.4-.8-2.8-1.4-4.4-1.4s-3.1.6-4.4 1.4c-2.2 1.4-3.6 3.9-3.6 6.7l-.3 1.7-2.8 160.8s0 .3 3.1 65.6v.3c0 1.7.6 3.3 1.7 4.7 1.7 1.9 3.9 3.1 6.4 3.1 2.2 0 4.2-1.1 5.6-2.5 1.7-1.4 2.5-3.3 2.5-5.6l.3-6.7 3.1-58.6-3.3-162.8c-.3-2.8-1.7-5.3-3.9-6.7zm-111.4 22.5c-3.1 0-5.8 2.8-5.8 6.1l-4.4 140.6 4.4 67.2c.3 3.3 2.8 5.8 5.8 5.8 3.3 0 5.8-2.5 6.1-5.8l5-67.2-5-140.6c-.2-3.3-2.7-6.1-6.1-6.1zm376.7 62.8c-10.8 0-21.1 2.2-30.6 6.1-6.4-70.8-65.8-126.4-138.3-126.4-17.8 0-35 3.3-50.3 9.4-6.1 2.2-7.8 4.4-7.8 9.2v249.7c0 5 3.9 8.6 8.6 9.2h218.3c43.3 0 78.6-35 78.6-78.3.1-43.6-35.2-78.9-78.5-78.9zm-296.7-60.3c-4.2 0-7.5 3.3-7.8 7.8l-3.3 136.7 3.3 65.6c.3 4.2 3.6 7.5 7.8 7.5 4.2 0 7.5-3.3 7.5-7.5l3.9-65.6-3.9-136.7c-.3-4.5-3.3-7.8-7.5-7.8zm-53.6-7.8c-3.3 0-6.4 3.1-6.4 6.7l-3.9 145.3 3.9 66.9c.3 3.6 3.1 6.4 6.4 6.4 3.6 0 6.4-2.8 6.7-6.4l4.4-66.9-4.4-145.3c-.3-3.6-3.1-6.7-6.7-6.7zm26.7 3.4c-3.9 0-6.9 3.1-6.9 6.9L227 321.3l3.9 66.4c.3 3.9 3.1 6.9 6.9 6.9s6.9-3.1 6.9-6.9l4.2-66.4-4.2-141.7c0-3.9-3-6.9-6.9-6.9z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      className="sound-player__play-icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden
    >
      <path d="M8 5.5v13l11-6.5L8 5.5z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      className="sound-player__play-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden
    >
      <path d="M7 5h3.5v14H7V5zm6.5 0H17v14h-3.5V5z" fill="currentColor" />
    </svg>
  );
}

function soundcloudEmbedSrc(trackUrl: string) {
  const params = new URLSearchParams({
    url: trackUrl,
    color: "#221c16",
    auto_play: "true",
    hide_related: "true",
    show_comments: "false",
    show_user: "false",
    show_reposts: "false",
    show_teaser: "false",
    show_artwork: "false",
    visual: "false",
    buying: "false",
    sharing: "false",
    download: "false",
  });
  return `https://w.soundcloud.com/player/?${params.toString()}`;
}

function loadSoundCloudApi() {
  if (typeof window === "undefined") return Promise.reject();
  if (window.SC?.Widget) return Promise.resolve(window.SC);
  return new Promise<SoundCloudApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-sc-widget="1"]',
    );
    if (existing) {
      if (window.SC) {
        resolve(window.SC);
        return;
      }
      existing.addEventListener(
        "load",
        () => {
          if (window.SC) resolve(window.SC);
          else reject(new Error("SoundCloud API missing"));
        },
        { once: true },
      );
      existing.addEventListener("error", () => reject(), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://w.soundcloud.com/player/api.js";
    script.async = true;
    script.dataset.scWidget = "1";
    script.onload = () => {
      if (window.SC) resolve(window.SC);
      else reject(new Error("SoundCloud API missing"));
    };
    script.onerror = () => reject();
    document.body.appendChild(script);
  });
}

function waveHeights(seed: string, count: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const n = h / 0xffffffff;
    const envelope = 0.35 + 0.65 * Math.sin((i / (count - 1)) * Math.PI);
    values.push(0.18 + envelope * (0.22 + n * 0.6));
  }
  return values;
}

function waveformJsonUrl(url: string) {
  return url.replace(/\.png(\?.*)?$/i, ".json$1");
}

/** Downsample SoundCloud’s official waveform samples into our bar heights. */
async function sampleWaveformBars(url: string, count: number) {
  const res = await fetch(waveformJsonUrl(url));
  if (!res.ok) throw new Error(`waveform fetch ${res.status}`);
  const data = (await res.json()) as {
    height?: number;
    samples?: number[];
  };
  const samples = data.samples;
  if (!samples?.length) throw new Error("empty waveform samples");

  const peak = Math.max(data.height ?? 0, ...samples, 1);
  const heights: number[] = [];
  const bucket = samples.length / count;

  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * bucket);
    const end = Math.max(start + 1, Math.floor((i + 1) * bucket));
    let max = 0;
    for (let j = start; j < end; j++) {
      if (samples[j] > max) max = samples[j];
    }
    heights.push(Math.min(1, Math.max(0.08, max / peak)));
  }

  return heights;
}

function formatMs(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SoundWork() {
  const [active, setActive] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [positionMs, setPositionMs] = useState(0);
  const [bars, setBars] = useState<number[]>(() =>
    waveHeights("wave", WAVE_BARS),
  );
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const widgetRef = useRef<SoundCloudWidget | null>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const drive = useSilkDrive(sectionRef);

  const activeSet = sets.find((set) => set.slug === active) ?? null;

  useEffect(() => {
    if (!active || !activeSet?.embedUrl) {
      widgetRef.current = null;
      setIsPlaying(false);
      setProgress(0);
      setDurationMs(0);
      setPositionMs(0);
      return;
    }

    setBars(waveHeights(activeSet.slug, WAVE_BARS));

    let cancelled = false;
    if (!iframeRef.current) return;

    loadSoundCloudApi()
      .then((SC) => {
        if (cancelled || !iframeRef.current) return;
        const widget = SC.Widget(iframeRef.current);
        widgetRef.current = widget;

        widget.bind(SC.Widget.Events.READY, () => {
          if (cancelled) return;
          widget.getDuration((ms) => {
            if (!cancelled) setDurationMs(ms);
          });
          widget.getCurrentSound((sound) => {
            if (cancelled || !sound?.waveform_url) return;
            sampleWaveformBars(sound.waveform_url, WAVE_BARS)
              .then((heights) => {
                if (!cancelled) setBars(heights);
              })
              .catch(() => {
                /* Keep the seeded placeholder if sampling fails. */
              });
          });
          widget.play();
        });
        widget.bind(SC.Widget.Events.PLAY, () => {
          if (!cancelled) setIsPlaying(true);
        });
        widget.bind(SC.Widget.Events.PAUSE, () => {
          if (!cancelled) setIsPlaying(false);
        });
        widget.bind(SC.Widget.Events.FINISH, () => {
          if (cancelled) return;
          setIsPlaying(false);
          setProgress(0);
          setPositionMs(0);
        });
        widget.bind(SC.Widget.Events.PLAY_PROGRESS, (data) => {
          if (cancelled || !data) return;
          if (typeof data.currentPosition === "number") {
            setPositionMs(data.currentPosition);
          }
          if (typeof data.relativePosition === "number") {
            setProgress(Math.min(1, Math.max(0, data.relativePosition)));
          }
        });
      })
      .catch(() => {
        /* Audio iframe may still autoplay without the API. */
      });

    return () => {
      cancelled = true;
      widgetRef.current = null;
    };
  }, [active, activeSet?.embedUrl, activeSet?.slug]);

  function openSet(slug: string) {
    setActive(slug);
    setIsPlaying(true);
    setProgress(0);
    setPositionMs(0);
  }

  function closeSet() {
    widgetRef.current?.pause();
    setActive(null);
    setIsPlaying(false);
    setProgress(0);
    setPositionMs(0);
    setDurationMs(0);
  }

  function togglePlayback() {
    const widget = widgetRef.current;
    if (widget) {
      widget.toggle();
      return;
    }
    if (isPlaying) closeSet();
  }

  function seekFromPointer(clientX: number) {
    const el = waveRef.current;
    const widget = widgetRef.current;
    if (!el || !widget || durationMs <= 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    widget.seekTo(ratio * durationMs);
    setProgress(ratio);
    setPositionMs(ratio * durationMs);
  }

  return (
    <section
      ref={sectionRef}
      id="sound"
      className="scroll-mt-16 px-4 pt-6 pb-10 md:px-8 md:pt-8 md:pb-14"
    >
      <FromNavMark navId="sound" label="Sound" />
      <SilkArrive
        drive={drive}
        strength={1.1}
        still
        className="flex justify-center"
      >
        <div className="sound-player">
          <div className="sound-player__header">
            <SoundCloudIcon />
            <div className="sound-player__copy">
              <p className="sound-player__heading">
                I&apos;ll be uploading my mixes here :)
              </p>
              <p className="sound-player__subhead">
                Meanwhile, a track that will always have my heart
              </p>
            </div>
          </div>
          {sets.map((set) => {
            const isOpen = active === set.slug;
            const timeLabel =
              durationMs > 0
                ? formatMs(positionMs)
                : (set.duration ?? "");
            return (
              <div
                key={set.slug}
                className={`sound-player__track${isOpen ? " is-open" : ""}`}
              >
                <button
                  type="button"
                  className="sound-player__row"
                  onClick={() => (isOpen ? closeSet() : openSet(set.slug))}
                  aria-pressed={isOpen}
                  aria-expanded={isOpen}
                  aria-label={
                    isOpen ? `Close ${set.title}` : `Open ${set.title}`
                  }
                >
                  <div className="sound-player__cover">
                    <Still
                      src={set.cover}
                      alt={`${set.title} cover`}
                      sizes="(max-width: 520px) 72px, 96px"
                      radius={6}
                      reveal={false}
                    />
                  </div>
                  <div className="sound-player__song">
                    <p className="sound-player__name">{set.title}</p>
                    <p className="sound-player__artist">
                      {set.filename} · {set.venue}
                    </p>
                    <div className="sound-player__meta" aria-hidden={!isOpen}>
                      {[set.year, set.duration, set.filename]
                        .filter(Boolean)
                        .map((item, i, arr) => (
                          <span key={item}>
                            {item}
                            {i < arr.length - 1 ? (
                              <span className="sound-player__dot" aria-hidden>
                                ·
                              </span>
                            ) : null}
                          </span>
                        ))}
                    </div>
                  </div>
                  {!isOpen ? (
                    <span className="sound-player__play" aria-hidden>
                      <PlayIcon />
                    </span>
                  ) : isPlaying ? (
                    <div className="sound-player__eq" aria-hidden>
                      <div className="sound-player__bar" />
                      <div className="sound-player__bar" />
                      <div className="sound-player__bar" />
                      <div className="sound-player__bar" />
                    </div>
                  ) : (
                    <span className="sound-player__play" aria-hidden>
                      <PlayIcon />
                    </span>
                  )}
                </button>
                <div className="sound-player__stage">
                  {isOpen && set.embedUrl ? (
                    <div className="sound-player__wave-row">
                      <button
                        type="button"
                        className="sound-player__wave-play"
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePlayback();
                        }}
                        aria-label={
                          isPlaying
                            ? `Pause ${set.title}`
                            : `Play ${set.title}`
                        }
                      >
                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                      </button>
                      <div
                        ref={waveRef}
                        className="sound-player__wave"
                        role="slider"
                        tabIndex={0}
                        aria-label={`${set.title} position`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(progress * 100)}
                        onClick={(event) => {
                          event.stopPropagation();
                          seekFromPointer(event.clientX);
                        }}
                        onKeyDown={(event) => {
                          if (!widgetRef.current || durationMs <= 0) return;
                          const step = durationMs * 0.05;
                          if (event.key === "ArrowRight") {
                            event.preventDefault();
                            widgetRef.current.seekTo(
                              Math.min(durationMs, positionMs + step),
                            );
                          }
                          if (event.key === "ArrowLeft") {
                            event.preventDefault();
                            widgetRef.current.seekTo(
                              Math.max(0, positionMs - step),
                            );
                          }
                        }}
                      >
                        <div className="sound-player__wave-track" aria-hidden>
                          <div className="sound-player__wave-half sound-player__wave-half--top">
                            {bars.map((height, i) => {
                              const played = i / WAVE_BARS <= progress;
                              return (
                                <span
                                  key={`t-${i}`}
                                  className={`sound-player__wave-bar${played ? " is-played" : ""}`}
                                  style={{ height: `${height * 100}%` }}
                                />
                              );
                            })}
                          </div>
                          <div className="sound-player__wave-half sound-player__wave-half--bot">
                            {bars.map((height, i) => {
                              const played = i / WAVE_BARS <= progress;
                              return (
                                <span
                                  key={`b-${i}`}
                                  className={`sound-player__wave-bar sound-player__wave-bar--mirror${played ? " is-played" : ""}`}
                                  style={{ height: `${height * 55}%` }}
                                />
                              );
                            })}
                          </div>
                        </div>
                        {timeLabel ? (
                          <span className="sound-player__wave-time">
                            {timeLabel}
                          </span>
                        ) : null}
                      </div>
                      <iframe
                        ref={iframeRef}
                        className="sound-player__embed"
                        title={`${set.title} on SoundCloud`}
                        allow="autoplay"
                        tabIndex={-1}
                        aria-hidden
                        src={soundcloudEmbedSrc(set.embedUrl)}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </SilkArrive>
    </section>
  );
}
