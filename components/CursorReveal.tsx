"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

export type CursorKind = "default" | "text" | "spotlight";

type Point = { x: number; y: number; fine: boolean; kind: CursorKind };

type CursorApi = {
  subscribe: (fn: (point: Point) => void) => () => void;
};

const CursorContext = createContext<CursorApi | null>(null);

const TEXT_HOST =
  "h1, h2, h3, h4, p, span, li, a, time, label, figcaption, blockquote, em, strong, small, dt, dd, nav";

function caretHeightFor(el: HTMLElement) {
  const style = getComputedStyle(el);
  const fontSize = parseFloat(style.fontSize) || 16;
  const lineHeight = parseFloat(style.lineHeight);
  const height = Number.isFinite(lineHeight) ? lineHeight : fontSize * 1.12;
  return Math.max(8, height);
}

function kindAtPoint(
  x: number,
  y: number,
): { kind: CursorKind; fontSize: number } {
  const stack = document.elementsFromPoint(x, y);

  for (const node of stack) {
    if (!(node instanceof Element)) continue;
    if (node.closest(".studio-cursor-follow")) continue;
    if (node.closest("[data-cursor-through]")) continue;

    if (node.closest(".color-still")) {
      return { kind: "spotlight", fontSize: 16 };
    }

    const textHost = node.closest<HTMLElement>(TEXT_HOST);
    if (textHost && !textHost.closest("[data-cursor-through]")) {
      return { kind: "text", fontSize: caretHeightFor(textHost) };
    }

    const field = node.closest<HTMLElement>(
      "input, textarea, [contenteditable='true']",
    );
    if (field) {
      return { kind: "text", fontSize: caretHeightFor(field) };
    }
  }

  return { kind: "default", fontSize: 16 };
}

export function CursorRevealProvider({ children }: { children: ReactNode }) {
  const listeners = useRef(new Set<(point: Point) => void>());
  const followRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    document.documentElement.classList.add("has-cursor-none");

    let targetX = -9999;
    let targetY = -9999;
    let x = -9999;
    let y = -9999;
    let primed = false;
    let snapUntil = 0;
    let raf = 0;

    const setTarget = (clientX: number, clientY: number, snap = false) => {
      targetX = clientX;
      targetY = clientY;
      if (!primed || snap) {
        x = clientX;
        y = clientY;
        primed = true;
      }
      if (snap) snapUntil = performance.now() + 90;
    };

    const move = (event: PointerEvent) => setTarget(event.clientX, event.clientY);
    const leave = () => {
      targetX = -9999;
      targetY = -9999;
      primed = false;
    };
    const scroll = () => {
      if (!primed) return;
      setTarget(targetX, targetY, true);
    };

    const tick = () => {
      const snapping = performance.now() < snapUntil;
      const settled = x < -1000 && targetX < -1000;
      const ease = settled || snapping ? 1 : 0.55;
      x += (targetX - x) * ease;
      y += (targetY - y) * ease;

      const visible = primed && x > -1000;
      const next = visible
        ? kindAtPoint(targetX, targetY)
        : { kind: "default" as CursorKind, fontSize: 16 };

      listeners.current.forEach((fn) =>
        fn({ x, y, fine: true, kind: next.kind }),
      );

      const follow = followRef.current;
      const cursor = cursorRef.current;
      if (follow) {
        follow.style.opacity = visible ? "1" : "0";
        follow.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      }
      if (cursor) {
        const caret = next.kind === "text";
        cursor.classList.toggle("is-caret", caret);
        cursor.style.width = caret ? "2px" : "";
        cursor.style.height = caret ? `${next.fontSize}px` : "";
        cursor.style.borderRadius = caret ? "1px" : "";
      }

      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("mouseleave", leave);
    window.addEventListener("scroll", scroll, { passive: true, capture: true });
    window.addEventListener("wheel", scroll, { passive: true, capture: true });
    raf = requestAnimationFrame(tick);

    return () => {
      document.documentElement.classList.remove("has-cursor-none");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("mouseleave", leave);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("wheel", scroll, true);
      cancelAnimationFrame(raf);
    };
  }, []);

  const api = useRef<CursorApi>({
    subscribe: (fn) => {
      listeners.current.add(fn);
      return () => listeners.current.delete(fn);
    },
  }).current;

  return (
    <CursorContext.Provider value={api}>
      {children}
      <div ref={followRef} className="studio-cursor-follow" aria-hidden>
        <div ref={cursorRef} className="studio-cursor" />
      </div>
    </CursorContext.Provider>
  );
}

export function useCursorReveal() {
  return useContext(CursorContext);
}
