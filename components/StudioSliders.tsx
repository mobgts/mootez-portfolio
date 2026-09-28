"use client";

import {
  useCallback,
  useId,
  useRef,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  COLOR_CEILING,
  getVibe,
  setVibeColor,
  setVibeSilk,
  subscribeVibe,
} from "@/content/vibe";

/** Sweep matches the six notch marks (0° → 300°). */
const MAX_DEG = 300;
const NOTCHES = 6;

function useVibe() {
  return useSyncExternalStore(subscribeVibe, getVibe, getVibe);
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function valueToDeg(value: number) {
  return clamp01(value) * MAX_DEG;
}

function degToValue(deg: number) {
  return clamp01(deg / MAX_DEG);
}

/** CSS rotate(0) points right; clockwise positive — same as atan2 mapped to 0–360. */
function angleFromPointer(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  maxDeg: number,
) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let deg = (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  if (deg < 0) deg += 360;

  // Dead zone past the last allowed notch: snap to nearest end.
  if (deg > maxDeg && deg < (maxDeg + 360) / 2) return maxDeg;
  if (deg >= (maxDeg + 360) / 2) return 0;
  return Math.min(deg, maxDeg);
}

function ClockKnob({
  label,
  value,
  onChange,
  valuetext,
  max = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  valuetext: string;
  /** Cap as a 0–1 fraction of the dial (e.g. 0.8 = notch 5). */
  max?: number;
}) {
  const uid = useId();
  const labelId = `${uid}-label`;
  const rootRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const maxValue = clamp01(max);
  const maxDeg = maxValue * MAX_DEG;

  const applyPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = rootRef.current;
      if (!el) return;
      const deg = angleFromPointer(
        clientX,
        clientY,
        el.getBoundingClientRect(),
        maxDeg,
      );
      onChange(Math.min(maxValue, degToValue(deg)));
    },
    [onChange, maxDeg, maxValue],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    applyPointer(e.clientX, e.clientY);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    applyPointer(e.clientX, e.clientY);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(Math.min(maxValue, clamp01(value + step)));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(clamp01(value - step));
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(0);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(maxValue);
    }
  };

  const deg = valueToDeg(Math.min(value, maxValue));

  return (
    <div className="studio-knob" data-rail-drift>
      <span className="studio-knob__label" id={labelId}>
        {label}
      </span>
      <div
        ref={rootRef}
        className="clock-input"
        role="slider"
        tabIndex={0}
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={Math.round(maxValue * 100)}
        aria-valuenow={Math.round(Math.min(value, maxValue) * 100)}
        aria-valuetext={valuetext}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <div
          className="dial"
          style={{ transform: `rotate(${deg}deg)` }}
          aria-hidden
        />
        <div className="notches" aria-hidden>
          {Array.from({ length: NOTCHES }, (_, i) => (
            <div
              key={i}
              className="notch"
              style={{ ["--n" as string]: i + 1 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function StudioSliders() {
  const vibe = useVibe();

  const tintText = vibe.color < 0.35 ? "cream" : "olive";

  return (
    <div className="studio-sliders" role="group" aria-label="Studio controls">
      <ClockKnob
        label="tint"
        value={vibe.color}
        valuetext={tintText}
        onChange={setVibeColor}
        max={COLOR_CEILING}
      />
      <ClockKnob
        label="movement"
        value={vibe.silk}
        valuetext={`${Math.round(vibe.silk * 100)} percent movement`}
        onChange={setVibeSilk}
      />
    </div>
  );
}
