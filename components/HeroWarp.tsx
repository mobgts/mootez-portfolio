"use client";

import NextImage from "next/image";
import { useEffect, useRef, useState } from "react";
import { sampleTintAt } from "@/content/tints";
import { useCursorReveal } from "./CursorReveal";

type HeroWarpProps = {
  src: string;
  flowSrc: string;
  bleedSrc: string;
  alt: string;
};

const VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

// Fixed viewport canvas: portrait in the hero, then the same silk runs the whole
// page while paper grades olive → deep olive → beige → warm. Swells enter at the
// frame edges and travel inward along the folds; the cursor brings colour back.
const FRAGMENT = `
precision highp float;

varying vec2 vUv;

uniform vec2 uRes;
uniform float uPhotoAspect;
uniform float uFit;
uniform float uFocusX;
uniform float uHeroH;
uniform float uScroll;
uniform float uViewH;
uniform float uPageH;
uniform vec3 uPaper;
uniform vec3 uWash;
uniform vec2 uCursor;
uniform vec2 uCursorTrail;
uniform vec2 uCursorVel;
uniform float uOn;
uniform float uRadius;
uniform float uTime;
uniform float uMotion;
uniform sampler2D uPhoto;
uniform sampler2D uFlow;
uniform sampler2D uBleed;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

vec2 unitOr(vec2 v, vec2 fallback) {
  float len = length(v);
  return len > 0.001 ? v / len : fallback;
}

// Where in the silk map a point of the page lands. The map is square and tiled at
// the viewport width, so a page pixel and a map pixel are the same size in both
// axes; mirroring on alternate tiles keeps the drape meeting edge to edge.
vec2 silkUv(float x, float pageY) {
  float tileH = max(uRes.x, 640.0);
  return vec2(x, abs(fract((pageY / tileH) * 0.5) * 2.0 - 1.0));
}

// The run this fold makes across the frame, as the distance from the point to each
// of its two ends: x ahead of the tangent, y behind it. A slab test against the
// viewport, with the tangent nudged off the axes so a fold lying along one never
// divides by zero. Flipping the tangent swaps the pair exactly, which is how the
// callers stay clear of the sign the orientation field does not carry.
vec2 foldEnds(vec2 q, vec2 dir) {
  vec2 way = mix(vec2(-1.0), vec2(1.0), step(0.0, dir));
  vec2 d = way * max(abs(dir), vec2(0.004));
  vec2 lo = -q / d;
  vec2 hi = (uRes - q) / d;
  float ahead = min(max(lo.x, hi.x), max(lo.y, hi.y));
  float behind = -max(min(lo.x, hi.x), min(lo.y, hi.y));
  return vec2(ahead, behind);
}

vec3 fuzzSample(vec2 uv, float radius) {
  vec3 c = texture2D(uBleed, clamp(uv, 0.0, 1.0)).rgb * 0.36;
  c += texture2D(uBleed, clamp(uv + vec2(radius, 0.0), 0.0, 1.0)).rgb * 0.16;
  c += texture2D(uBleed, clamp(uv - vec2(radius, 0.0), 0.0, 1.0)).rgb * 0.16;
  c += texture2D(uBleed, clamp(uv + vec2(0.0, radius * 1.7), 0.0, 1.0)).rgb * 0.16;
  c += texture2D(uBleed, clamp(uv - vec2(0.0, radius * 1.7), 0.0, 1.0)).rgb * 0.16;
  return c;
}

void main() {
  vec2 p = vUv;
  vec2 px = p * uRes;
  float aspect = uRes.x / max(uRes.y, 1.0);

  // Document Y of this pixel (px from top of page).
  float docY = uScroll + (1.0 - p.y) * uViewH;
  float heroH = max(uHeroH, 1.0);
  float clear = smoothstep(heroH * 0.55, heroH * 1.35, docY);

  // Portrait framing locked to the hero viewport.
  float heroY = 1.0 - clamp(docY / heroH, 0.0, 1.0);
  vec2 heroP = vec2(p.x, heroY);
  float heroAspect = uRes.x / max(heroH, 1.0);
  vec2 fit = vec2(uPhotoAspect / max(heroAspect, 0.001), 1.0) * uFit;

  float faceScreen = clamp(uFocusX, 0.35, 0.85);
  float frameX = (heroP.x - faceScreen) / fit.x + 0.5;
  float photoLeft = faceScreen - 0.5 * fit.x;
  float field = clamp(photoLeft, 0.0, 0.48);

  float across = field > 0.001 ? clamp(heroP.x / field, 0.0, 1.0) : 1.0;
  float stretch = field > 0.001 ? max(field / max(fit.x * 0.08, 0.001), 1.0) : 1.0;
  float inField = (field > 0.001 && heroP.x < field) ? 1.0 : 0.0;
  float sampleX = mix(frameX, 0.04 * pow(across, stretch), inField);

  float fuzzStart = field + 0.07;
  float fuzz = field > 0.001
    ? clamp((fuzzStart - heroP.x) / max(fuzzStart, 0.001), 0.0, 1.0)
    : 0.0;

  // Ease the silk off the face so folds — and the travelling swell below — never
  // bury it.
  float faceProtect = smoothstep(0.08, 0.28, abs(p.x - faceScreen));

  // The silk at rest, read only to find how the fold under this pixel sits.
  vec4 rest = texture2D(uFlow, silkUv(p.x, docY));
  vec2 restDir = unitOr(rest.rg * 2.0 - 1.0, vec2(1.0, 0.0));
  float restRidge = rest.a * 2.0 - 1.0;

  // Which way along the fold counts as inward: from the nearer end of its run
  // across the frame toward this point. Reading the direction off the run rather
  // than off the tangent cancels the sign the orientation field does not carry,
  // and eases it to nothing mid-run, where neither end is nearer.
  vec2 ends = foldEnds(px, restDir);
  float lean = clamp((ends.x - ends.y) / 300.0, -1.0, 1.0);
  vec2 travel = restDir * lean;

  // A swell the size of a fist sets off at the top of the document and works its
  // way down, one following another at three quarters of a screen so there is
  // always one somewhere in view. Its front is carried forward or held back by the
  // ridge it is crossing, which is what threads it along the folds instead of
  // letting it cross the page as a flat bar. Bend has to come off the ridge field
  // rather than the fold's run across the frame: the run is built from min() of two
  // slabs, and the kink where they trade places would set as a crease in the wave.
  float lane = max(uViewH, 420.0) * 0.75;
  float journey = (docY + restRidge * 90.0 - uTime * 150.0) / lane;
  float seat = fract(journey) - 0.5;
  float ball = exp(-seat * seat * 11.0);

  // Beneath it a slow undertow, so the drape is never quite still between passes.
  float undertow = sin(journey * 2.2 + restRidge * 2.4) * 0.3;
  float ripple = (ball + undertow) * uMotion;

  // Re-read the fold map further along the fold's own line. Shifting the lookup
  // rather than the output means the drape itself rolls, which is what carries the
  // movement onto bare paper further down the page where there is no photo left.
  vec2 slide = (travel * 60.0 + vec2(-travel.y, travel.x) * 26.0) * ripple;
  vec4 flow = texture2D(uFlow, silkUv(p.x + slide.x / uRes.x, docY + slide.y));
  vec2 tangent = unitOr(flow.rg * 2.0 - 1.0, vec2(1.0, 0.0));
  vec2 perp = vec2(-tangent.y, tangent.x);
  float lineStrength = flow.b;
  float ridge = flow.a * 2.0 - 1.0;

  // The hand holds a length of cloth, not a point of it: measure to the nearest
  // place on the run from where it was a moment ago to where it is now. At rest
  // the two ends meet and this is the plain radial falloff it has always been;
  // moving, the hold stretches out behind and the reach opens up.
  // Curved so the smallest deliberate move already tells, while a hand that has
  // actually stopped reads as exactly nothing.
  float speed = pow(clamp(length(uCursorVel), 0.0, 1.0), 0.65);
  vec2 sweep = uCursor - uCursorTrail;
  float onSweep = clamp(dot(px - uCursorTrail, sweep) / max(dot(sweep, sweep), 1.0), 0.0, 1.0);
  vec2 toCursor = px - (uCursorTrail + sweep * onSweep);
  float reach = uRadius * (1.0 + 0.5 * speed);
  float shaped = length(vec2(dot(toCursor, tangent) * 0.42, dot(toCursor, perp) * 1.5));
  float fall = 1.0 - smoothstep(0.0, reach, shaped);
  fall = pow(max(fall, 0.0), 1.15) * uOn;

  // Front and back of the sweep, as one signed lobe: positive in the cloth the
  // hand is running into, negative in the cloth it has just left. Normalised so
  // the lobe peaks at one, and nothing at all when the cursor is standing still.
  vec2 sweepDir = unitOr(uCursorVel, tangent);
  float lead = dot(toCursor, sweepDir) / max(reach, 1.0);
  float wake = lead * exp(-lead * lead * 2.2) * 3.4;
  float drag = wake * speed;

  // The swell drags the portrait along its folds; the cursor adds a tighter pull,
  // shearing the cloth forward ahead of the sweep and back behind it.
  float amp = (0.005 * fall * (1.0 + 1.3 * speed) + 0.008 * ripple * faceProtect) * lineStrength;
  vec2 push = tangent * 0.35 + perp * (ridge * 0.55) + sweepDir * drag * 1.1;
  vec2 uvDelta = vec2(push.x / aspect, push.y) * amp / fit;

  vec2 frameUv = vec2(sampleX, (heroP.y - 0.5) / fit.y + 0.5 - 0.035);
  vec2 guard = smoothstep(vec2(0.0), vec2(0.04), frameUv)
             * smoothstep(vec2(0.0), vec2(0.04), 1.0 - frameUv);
  vec2 sampleUv = clamp(frameUv + uvDelta * min(guard.x, guard.y), 0.0, 1.0);
  sampleUv = mix(sampleUv, vec2(sampleUv.x, 0.02), step(heroH, docY));

  vec3 sharpRaw = texture2D(uPhoto, sampleUv).rgb;
  vec3 hazeRaw = fuzzSample(sampleUv + tangent * fuzz * 0.02, 0.006 + fuzz * 0.07);
  vec3 raw = mix(sharpRaw, hazeRaw, smoothstep(0.0, 0.62, fuzz));

  float lineMask = 0.45 + 0.55 * lineStrength;
  float reveal = clamp(fall * 1.25 * lineMask, 0.0, 1.0);

  float grey = dot(raw, LUMA);
  vec3 bw = clamp((vec3(grey) - 0.5) * 1.08 + 0.54, 0.0, 1.0);
  vec3 saturated = clamp((raw - vec3(grey)) * 1.35 + vec3(grey), 0.0, 1.0);
  vec3 photo = mix(bw, saturated, reveal);

  // Broaden the bands so each fold reads as a thick sweep of cloth rather than
  // a thin line. Direction still comes from the raw ridge.
  float ridgeWide = sign(ridge) * pow(abs(ridge), 0.65);
  float fold = ridgeWide * lineStrength;
  float sheen = max(0.0, ridgeWide) * lineStrength;
  float trough = max(0.0, -ridgeWide) * lineStrength;

  float portraitSilk = mix(0.18, 1.0, faceProtect);

  // What the hand does to the light. Shadow gathers in the cloth behind it, which
  // is still dropping back, and deepest where that cloth was already a trough; the
  // ridge it is running into catches the highlight. Both come up with speed, so a
  // resting cursor stays the colour reveal it was and a moving one presses the
  // sheet. Under the hand itself the weave takes a small even press either way,
  // which is the only part of this that survives the hand coming to a stop.
  float bank = fall * speed;
  float shade = bank * max(0.0, -wake) * (0.45 + 0.55 * trough);
  float gleam = bank * max(0.0, wake) * (0.4 + 0.6 * sheen);
  float weight = fall * fall * (0.3 + 0.4 * speed);

  // Light gathers on the folds the swell is passing over, so you can see where it
  // has got to even on bare paper, where there is no photo detail left to smear.
  float crest = max(0.0, ball - 0.12) * lineStrength * uMotion;

  // The landing wears the most drape: beside the name up top, and along the
  // floor under the portrait. It fades out as the hero leaves.
  float landing = 1.0 - smoothstep(heroH * 0.6, heroH * 1.05, docY);
  float besideName = (1.0 - smoothstep(0.1, 0.8, p.x)) * smoothstep(0.34, 0.98, p.y);
  float underPortrait = 1.0 - smoothstep(0.08, 0.46, p.y);
  float landingSilk = 1.0 + landing * (1.45 * besideName + 0.75 * underPortrait);

  // Landing gets the same bold sheet the lower page shows: wide lit sweeps and
  // deep troughs. Everything here is scaled by portraitSilk, which is near zero
  // across the face, so the drape builds around it and never over it.
  vec3 portrait = photo;
  portrait *= clamp(1.0 + fold * 0.85 * portraitSilk * landingSilk, 0.22, 2.1);
  portrait *= clamp(1.0 - trough * 0.72 * portraitSilk * landingSilk, 0.22, 1.0);
  portrait += pow(sheen, 1.4) * (0.2 + 0.12 * fall) * portraitSilk * landingSilk;
  portrait *= 1.0 + crest * 0.14 * portraitSilk;
  portrait *= 1.0 - 0.18 * fuzz * fuzz;
  portrait *= 1.0 - 0.08 * length((heroP - 0.5) * vec2(heroAspect, 1.0));

  // Scroll-graded field: silk on the live paper colour — soft folds, no bright ridges.
  vec3 fieldCol = mix(uPaper, uWash, 0.12 + 0.14 * trough);
  fieldCol *= clamp(1.0 + fold * 0.32 * landingSilk, 0.4, 1.55);
  fieldCol *= clamp(1.0 - trough * 0.26 * landingSilk, 0.4, 1.0);
  fieldCol *= 1.0 + crest * 0.2;
  fieldCol += sheen * 0.045 * landingSilk;
  vec3 lit = mix(fieldCol, mix(uWash, vec3(0.86, 0.8, 0.68), 0.22), 0.4);
  fieldCol = mix(fieldCol, lit, reveal);

  vec3 col = mix(portrait, fieldCol, clear);

  // Laid on the finished sheet so the press reads the same on the portrait and on
  // the bare paper below it, held off the face by the same mask the folds use.
  float silkHold = mix(portraitSilk, 1.0, clear);
  col *= clamp(1.0 - (shade * 0.78 + weight * 0.16) * silkHold, 0.18, 1.0);
  col += gleam * (0.17 + 0.09 * clear) * silkHold;

  vec2 gpx = floor(px / 1.5);
  float grain = fract(sin(dot(gpx, vec2(12.9898, 78.233))) * 43758.5453);
  float grainMask = 0.45 + 0.55 * (1.0 - abs(dot(col, LUMA) * 2.0 - 1.0));
  col += (grain - 0.5) * mix(0.14, 0.055, clear) * grainMask;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // Without this a typo in the shader is indistinguishable from a machine that
    // has no WebGL: both just land on the still fallback.
    if (process.env.NODE_ENV !== "production") {
      console.error(gl.getShaderInfoLog(shader));
    }
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function buildProgram(gl: WebGLRenderingContext) {
  const vert = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const frag = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vert || !frag) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  gl.deleteShader(vert);
  gl.deleteShader(frag);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function uploadTexture(gl: WebGLRenderingContext, image: HTMLImageElement) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return texture;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`failed to load ${src}`));
    image.src = src;
  });
}

export function HeroWarp({ src, flowSrc, bleedSrc, alt }: HeroWarpProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursor = useCursorReveal();
  const [mode, setMode] = useState<"pending" | "gl" | "fallback">("pending");

  const pointer = useRef({ x: 0, y: 0, on: 0, moved: false });
  const scrollRef = useRef({ y: 0, viewH: 1, heroH: 1, pageH: 1 });
  const tintRef = useRef({
    paper: [86 / 255, 82 / 255, 58 / 255] as [number, number, number],
    wash: [108 / 255, 102 / 255, 72 / 255] as [number, number, number],
  });
  const motionRef = useRef(1);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => {
      motionRef.current = query.matches ? 0 : 1;
    };
    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, []);

  useEffect(() => {
    if (!cursor) return;

    return cursor.subscribe(({ x, y, fine }) => {
      if (!fine) {
        pointer.current.on = 0;
        return;
      }

      const w = window.innerWidth;
      const h = window.innerHeight;
      const inside = x >= 0 && x <= w && y >= 0 && y <= h;
      if (x > -1000) pointer.current.moved = true;
      pointer.current.on = inside ? 1 : 0;
      if (!inside) return;

      pointer.current.x = x;
      pointer.current.y = h - y;
    });
  }, [cursor]);

  useEffect(() => {
    const readScroll = () => {
      const viewH = window.innerHeight;
      const heroEl = document.querySelector<HTMLElement>("[data-story-hero]");
      scrollRef.current = {
        y: window.scrollY,
        viewH,
        heroH: heroEl ? heroEl.offsetHeight : viewH,
        pageH: Math.max(
          viewH,
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
        ),
      };
      const tint = sampleTintAt(window.scrollY, viewH);
      tintRef.current = {
        paper: [tint.paper[0] / 255, tint.paper[1] / 255, tint.paper[2] / 255],
        wash: [tint.wash[0] / 255, tint.wash[1] / 255, tint.wash[2] / 255],
      };
    };

    readScroll();
    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", readScroll);
    const ro = new ResizeObserver(readScroll);
    ro.observe(document.documentElement);
    if (document.body) ro.observe(document.body);
    return () => {
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", readScroll);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    if (!gl) {
      setMode("fallback");
      return;
    }

    const program = buildProgram(gl);
    if (!program) {
      setMode("fallback");
      return;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );

    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = {
      res: gl.getUniformLocation(program, "uRes"),
      photoAspect: gl.getUniformLocation(program, "uPhotoAspect"),
      fit: gl.getUniformLocation(program, "uFit"),
      focusX: gl.getUniformLocation(program, "uFocusX"),
      heroH: gl.getUniformLocation(program, "uHeroH"),
      scroll: gl.getUniformLocation(program, "uScroll"),
      viewH: gl.getUniformLocation(program, "uViewH"),
      pageH: gl.getUniformLocation(program, "uPageH"),
      paper: gl.getUniformLocation(program, "uPaper"),
      wash: gl.getUniformLocation(program, "uWash"),
      cursor: gl.getUniformLocation(program, "uCursor"),
      cursorTrail: gl.getUniformLocation(program, "uCursorTrail"),
      cursorVel: gl.getUniformLocation(program, "uCursorVel"),
      on: gl.getUniformLocation(program, "uOn"),
      radius: gl.getUniformLocation(program, "uRadius"),
      time: gl.getUniformLocation(program, "uTime"),
      motion: gl.getUniformLocation(program, "uMotion"),
      photo: gl.getUniformLocation(program, "uPhoto"),
      flow: gl.getUniformLocation(program, "uFlow"),
      bleed: gl.getUniformLocation(program, "uBleed"),
    };

    let disposed = false;
    let raf = 0;
    let observer: ResizeObserver | null = null;
    let photoTex: WebGLTexture | null = null;
    let flowTex: WebGLTexture | null = null;
    let bleedTex: WebGLTexture | null = null;
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.round(window.innerWidth));
      height = Math.max(1, Math.round(window.innerHeight));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const contextLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(raf);
      setMode("fallback");
    };
    canvas.addEventListener("webglcontextlost", contextLost);

    Promise.all([loadImage(src), loadImage(flowSrc), loadImage(bleedSrc)])
      .then(([photo, flow, bleedImage]) => {
        if (disposed) return;

        photoTex = uploadTexture(gl, photo);
        flowTex = uploadTexture(gl, flow);
        bleedTex = uploadTexture(gl, bleedImage);
        const photoAspect = photo.naturalWidth / photo.naturalHeight;

        gl.useProgram(program);
        gl.uniform1i(u.photo, 0);
        gl.uniform1i(u.flow, 1);
        gl.uniform1i(u.bleed, 2);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, photoTex);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, flowTex);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, bleedTex);

        resize();
        observer = new ResizeObserver(resize);
        observer.observe(document.documentElement);
        setMode("gl");

        let smoothX = width * 0.5;
        let smoothY = height * 0.5;
        let trailX = smoothX;
        let trailY = smoothY;
        let lastX = smoothX;
        let lastY = smoothY;
        let velX = 0;
        let velY = 0;
        let wasOn = false;
        let smoothOn = 0;
        let smoothPaper = [...tintRef.current.paper] as [number, number, number];
        let smoothWash = [...tintRef.current.wash] as [number, number, number];
        let primed = false;
        let smoothMotion = motionRef.current;
        const start = performance.now();

        const tick = () => {
          if (disposed) return;
          const { y: scrollY, viewH, heroH, pageH } = scrollRef.current;

          const targetX = pointer.current.x;
          const targetY = pointer.current.y;
          const targetOn = pointer.current.on;

          if (!primed) {
            smoothX = targetX || width * 0.5;
            smoothY = targetY || height * 0.5;
            trailX = smoothX;
            trailY = smoothY;
            lastX = targetX;
            lastY = targetY;
            primed = true;
          }
          // Follow close enough that the cloth feels attached to the hand, and let
          // the trailing point carry the lag instead.
          smoothX += (targetX - smoothX) * 0.34;
          smoothY += (targetY - smoothY) * 0.34;
          smoothOn += (targetOn - smoothOn) * 0.12;

          // Speed off the raw pointer. The jump across the frame the pointer comes
          // back on does not count as travel, and the rest is capped so a tab
          // returning to the front never reads as one enormous swipe.
          const stepCap = Math.max(width, height) * 0.25;
          const crossing = targetOn === 1 && !wasOn;
          const stepX = crossing
            ? 0
            : Math.max(-stepCap, Math.min(stepCap, targetX - lastX));
          const stepY = crossing
            ? 0
            : Math.max(-stepCap, Math.min(stepCap, targetY - lastY));
          lastX = targetX;
          lastY = targetY;
          wasOn = targetOn === 1;
          velX += (stepX - velX) * 0.26;
          velY += (stepY - velY) * 0.26;
          const velLen = Math.hypot(velX, velY);
          const speed = Math.min(1, velLen / 26) * smoothOn;
          const dirX = velLen > 0.001 ? velX / velLen : 0;
          const dirY = velLen > 0.001 ? velY / velLen : 0;

          // The trailing point is the cloth still catching up. Capped so a fast
          // flick across the screen smears a hand's length, not the whole page.
          trailX += (smoothX - trailX) * 0.14;
          trailY += (smoothY - trailY) * 0.14;
          const lagX = smoothX - trailX;
          const lagY = smoothY - trailY;
          const lag = Math.hypot(lagX, lagY);
          const maxLag = Math.max(120, Math.min(width, height) * 0.2);
          if (lag > maxLag) {
            trailX = smoothX - (lagX / lag) * maxLag;
            trailY = smoothY - (lagY / lag) * maxLag;
          }
          smoothMotion += (motionRef.current - smoothMotion) * 0.08;

          const tp = tintRef.current.paper;
          const tw = tintRef.current.wash;
          smoothPaper = [
            smoothPaper[0] + (tp[0] - smoothPaper[0]) * 0.16,
            smoothPaper[1] + (tp[1] - smoothPaper[1]) * 0.16,
            smoothPaper[2] + (tp[2] - smoothPaper[2]) * 0.16,
          ];
          smoothWash = [
            smoothWash[0] + (tw[0] - smoothWash[0]) * 0.16,
            smoothWash[1] + (tw[1] - smoothWash[1]) * 0.16,
            smoothWash[2] + (tw[2] - smoothWash[2]) * 0.16,
          ];

          gl.uniform2f(u.res, width, height);
          gl.uniform1f(u.photoAspect, photoAspect);
          gl.uniform1f(u.fit, 1.0);
          gl.uniform1f(u.focusX, 0.78);
          gl.uniform1f(u.heroH, heroH);
          gl.uniform1f(u.scroll, scrollY);
          gl.uniform1f(u.viewH, viewH);
          gl.uniform1f(u.pageH, pageH);
          gl.uniform3f(u.paper, smoothPaper[0], smoothPaper[1], smoothPaper[2]);
          gl.uniform3f(u.wash, smoothWash[0], smoothWash[1], smoothWash[2]);
          gl.uniform2f(u.cursor, smoothX, smoothY);
          gl.uniform2f(u.cursorTrail, trailX, trailY);
          gl.uniform2f(u.cursorVel, dirX * speed, dirY * speed);
          gl.uniform1f(u.on, smoothOn);
          gl.uniform1f(u.radius, Math.max(160, Math.min(width, height) * 0.3));
          gl.uniform1f(u.time, (performance.now() - start) / 1000);
          gl.uniform1f(u.motion, smoothMotion);
          gl.drawArrays(gl.TRIANGLES, 0, 3);

          raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
      })
      .catch(() => {
        if (!disposed) setMode("fallback");
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      canvas.removeEventListener("webglcontextlost", contextLost);
      if (photoTex) gl.deleteTexture(photoTex);
      if (flowTex) gl.deleteTexture(flowTex);
      if (bleedTex) gl.deleteTexture(bleedTex);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [src, flowSrc, bleedSrc]);

  return (
    <div
      ref={wrapRef}
      className={`hero-warp pointer-events-none fixed inset-0 z-0 overflow-hidden bg-ink${
        mode === "gl" ? " is-awake" : ""
      }`}
      aria-hidden={mode !== "fallback"}
    >
      <canvas
        ref={canvasRef}
        className="hero-warp__canvas absolute inset-0 h-full w-full"
        aria-hidden
      />
      {mode === "fallback" ? (
        <NextImage
          src={src}
          alt={alt}
          fill
          priority
          sizes="100vw"
          className="hero-warp__fallback object-contain object-top"
        />
      ) : null}
      {mode === "fallback" ? <span className="sr-only">{alt}</span> : null}
    </div>
  );
}
