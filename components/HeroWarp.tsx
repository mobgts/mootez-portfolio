"use client";

import { useEffect, useRef, useState } from "react";
import {
  getVibe,
  mapVibeColor,
  sampleVibeTintAt,
  silkMotionScale,
  subscribeVibe,
  vibeRibbon,
} from "@/content/vibe";
import { useCursorReveal } from "./CursorReveal";

type HeroWarpProps = {
  src: string;
  flowSrc: string;
  bleedSrc: string;
  maskSrc: string;
  alt: string;
};

/** Bump when fragment logic changes so the WebGL program recompiles on HMR. */
const WARP_SHADER_REV = 9;

/** Layout + visual viewport — mobile chrome must never undersize the field. */
function viewportBox() {
  const vv = window.visualViewport;
  const w = Math.max(
    1,
    Math.round(Math.max(window.innerWidth, vv?.width ?? 0)),
  );
  const h = Math.max(
    1,
    Math.round(Math.max(window.innerHeight, vv?.height ?? 0)),
  );
  return { w, h };
}

/** Touch / narrow devices: fewer pixels + cheaper field reads so scroll stays fluid. */
function isLiteField() {
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 767px)").matches
  );
}

const VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

// Fixed viewport canvas: silk runs the whole page while paper grades olive →
// cream. Portrait is a normal About image (not woven into this field).
// Swells travel the folds; cursor brings colour.
const FRAGMENT = `
precision highp float;

varying vec2 vUv;

uniform vec2 uRes;
uniform float uPhotoAspect;
uniform float uFit;
uniform float uFocusX;
uniform float uHeroH;
uniform float uPortraitTop;
uniform float uPortraitH;
uniform float uScroll;
uniform float uViewH;
uniform float uPageH;
uniform vec3 uPaper;
uniform vec3 uWash;
uniform float uY0;
uniform float uY1;
uniform float uY2;
uniform float uY3;
uniform float uY4;
uniform vec3 uP0;
uniform vec3 uP1;
uniform vec3 uP2;
uniform vec3 uP3;
uniform vec3 uP4;
uniform vec3 uW0;
uniform vec3 uW1;
uniform vec3 uW2;
uniform vec3 uW3;
uniform vec3 uW4;
uniform vec2 uCursor;
uniform vec2 uCursorTrail;
uniform vec2 uCursorVel;
uniform float uOn;
uniform float uRadius;
uniform float uTime;
uniform float uMotion;
uniform float uTint;
uniform sampler2D uPhoto;
uniform sampler2D uFlow;
uniform sampler2D uBleed;
uniform sampler2D uMask;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

vec2 unitOr(vec2 v, vec2 fallback) {
  float len = length(v);
  return len > 0.001 ? v / len : fallback;
}

void gradeAt(float y, out vec3 paper, out vec3 wash) {
  if (y <= uY0) { paper = uP0; wash = uW0; return; }
  if (y >= uY4) { paper = uP4; wash = uW4; return; }
  vec3 pa = uP0; vec3 wa = uW0; float ya = uY0;
  vec3 pb = uP1; vec3 wb = uW1; float yb = uY1;
  if (y > uY1) { pa = uP1; wa = uW1; ya = uY1; pb = uP2; wb = uW2; yb = uY2; }
  if (y > uY2) { pa = uP2; wa = uW2; ya = uY2; pb = uP3; wb = uW3; yb = uY3; }
  if (y > uY3) { pa = uP3; wa = uW3; ya = uY3; pb = uP4; wb = uW4; yb = uY4; }
  float u = clamp((y - ya) / max(yb - ya, 1.0), 0.0, 1.0);
  u = u * u * (3.0 - 2.0 * u);
  paper = mix(pa, pb, u);
  wash = mix(wa, wb, u);
}

// Period matches desktop: viewport width, or 1.6 viewports if the screen is narrow.
// Same formula on every device so folds (and the wash they pick up) match.
float silkTileH() {
  return max(max(uRes.x, 640.0), uViewH * 1.6);
}

vec2 silkUv(float x, float pageY) {
  float tileH = silkTileH();
  return vec2(x, abs(fract((pageY / tileH) * 0.5) * 2.0 - 1.0));
}

vec4 flowSample(float x, float pageY) {
  float tileH = silkTileH();
  float dx = 1.25 / max(uRes.x, 1.0);
  float dy = 1.25 * clamp(tileH / max(uViewH, 1.0), 0.85, 2.4);
  vec4 c = texture2D(uFlow, silkUv(x, pageY)) * 0.4;
  c += texture2D(uFlow, silkUv(x + dx, pageY)) * 0.15;
  c += texture2D(uFlow, silkUv(x - dx, pageY)) * 0.15;
  c += texture2D(uFlow, silkUv(x, pageY + dy)) * 0.15;
  c += texture2D(uFlow, silkUv(x, pageY - dy)) * 0.15;
  return c;
}

// The run this fold makes across the frame, as the distance from the point to each
// of its two ends: x ahead of the tangent, y behind it. A slab test against the
// viewport, with the tangent nudged off the axes so a fold lying along one never
// divides by zero. Flipping the tangent swaps the pair exactly, which is how the
// callers stay clear of the sign the orientation field does not carry.
vec2 foldEnds(vec2 q, vec2 dir) {
  vec2 frame = vec2(uRes.x, uViewH);
  vec2 way = mix(vec2(-1.0), vec2(1.0), step(0.0, dir));
  vec2 d = way * max(abs(dir), vec2(0.004));
  vec2 lo = -q / d;
  vec2 hi = (frame - q) / d;
  float ahead = min(max(lo.x, hi.x), max(lo.y, hi.y));
  float behind = -max(min(lo.x, hi.x), min(lo.y, hi.y));
  return vec2(ahead, behind);
}

float hash21(vec2 q) {
  return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453);
}

// Smooth value noise. Interpolated rather than per-pixel, so the silhouette edge
// wobbles like a wet edge instead of breaking into salt-and-pepper.
float vnoise(vec2 q) {
  vec2 i = floor(q);
  vec2 f = fract(q);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm2(vec2 q) {
  return vnoise(q) * 0.66 + vnoise(q * 2.13 + 7.3) * 0.34;
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
  float aspect = uRes.x / max(uViewH, 1.0);
  // Page-tall canvas: fold math stays viewport-sized so baked silk matches desktop.
  float pageMode = step(uViewH * 1.25, uRes.y);
  vec2 foldQ = vec2(px.x, mix(px.y, uViewH * 0.5, pageMode));

  // Document Y of this pixel (px from top of page).
  float docY = uScroll + (1.0 - p.y) * uRes.y;
  vec3 livePaper = uPaper;
  vec3 liveWash = uWash;
  if (pageMode > 0.5) gradeAt(docY, livePaper, liveWash);
  float heroH = max(uHeroH, 1.0);
  float portraitTop = uPortraitTop;
  float portraitH = max(uPortraitH, 1.0);
  float localY = docY - portraitTop;

  // Portrait is a normal About <Image> — never embed it into the silk field.
  float enter = 0.0;
  float leave = 1.0;
  float clear = 1.0;

  // Portrait framing on the About band. About: nudge silhouette left + down.
  float bandY = 1.0 - clamp(localY / portraitH, 0.0, 1.0);
  vec2 heroP = vec2(p.x, bandY);
  float heroAspect = uRes.x / max(portraitH, 1.0);
  vec2 fit = vec2(uPhotoAspect / max(heroAspect, 0.001), 1.0) * uFit;

  float aboutOn = 1.0 - clear;
  float faceScreen = clamp(uFocusX - aboutOn * 0.07, 0.35, 0.9);
  float frameX = (heroP.x - faceScreen) / fit.x + 0.5;
  float photoLeft = faceScreen - 0.5 * fit.x;
  float field = clamp(photoLeft, 0.0, 0.58);

  float across = field > 0.001 ? clamp(heroP.x / field, 0.0, 1.0) : 1.0;
  float stretch = field > 0.001 ? max(field / max(fit.x * 0.08, 0.001), 1.0) : 1.0;
  float inField = (field > 0.001 && heroP.x < field) ? 1.0 : 0.0;
  float sampleXStretched = mix(frameX, 0.04 * pow(across, stretch), inField);
  // About only: no left photo stretch into the copy column.
  float sampleX = mix(sampleXStretched, frameX, aboutOn);
  // Positive Y shift samples higher in the photo → silhouette sits lower on screen.
  float sampleY = (heroP.y - 0.5) / fit.y + 0.5 - 0.035 + aboutOn * 0.055;

  // Narrower left haze so the figure itself stays sharp.
  float fuzzStart = field + 0.04;
  float fuzzFull = field > 0.001
    ? clamp((fuzzStart - heroP.x) / max(fuzzStart, 0.001), 0.0, 1.0)
    : 0.0;
  // About only: kill haze ghost on the left. Silk elsewhere keeps fuzzFull unused
  // once clear=1, but keep the path intact outside the band.
  float fuzz = fuzzFull * (1.0 - aboutOn);

  // Wide face lock — silk folds stay off the head and torso.
  float faceProtect = smoothstep(0.05, 0.34, abs(p.x - faceScreen));

  // Cream paper clips silk highlights to white — thin motion + lift when bright.
  // Tint 0 is nearly flat; silk returns as colour arrives.
  float paperLum = dot(livePaper, LUMA);
  float paperBright = smoothstep(0.58, 0.9, paperLum);
  float tintLive = smoothstep(0.03, 0.55, uTint);
  float silkGain = mix(0.06, 1.0, tintLive) * mix(1.0, 0.45, paperBright * (1.0 - tintLive));
  float liftGain = mix(0.08, 1.0, tintLive) * mix(1.0, 0.28, paperBright * (1.0 - tintLive));
  float shadeGain = mix(0.35, 1.0, tintLive) * mix(1.0, 1.15, paperBright);
  float motionAmt = uMotion;

  // The silk at rest, read only to find how the fold under this pixel sits.
  vec4 rest = flowSample(p.x, docY);
  vec2 restDir = unitOr(rest.rg * 2.0 - 1.0, vec2(1.0, 0.0));
  float restRidge = rest.a * 2.0 - 1.0;

  // Which way along the fold counts as inward: from the nearer end of its run
  // across the frame toward this point. Reading the direction off the run rather
  // than off the tangent cancels the sign the orientation field does not carry,
  // and eases it to nothing mid-run, where neither end is nearer.
  vec2 ends = foldEnds(foldQ, restDir);
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
  float ripple = (ball + undertow) * motionAmt * silkGain;

  // Extra continuity bead: seeds in the left wrap and rides the same fold line
  // downward so the eye catches the drape starting there and continuing on.
  vec2 aheadPt = px + restDir * ends.x;
  vec2 behindPt = px - restDir * ends.y;
  float fromLeft = aheadPt.x < behindPt.x ? ends.x : ends.y;
  float leadLane = max(uViewH, 420.0) * 1.05;
  float leadJourney = (docY * 0.65 + fromLeft * 1.55 + restRidge * 55.0 - uTime * 110.0) / leadLane;
  float leadSeat = fract(leadJourney) - 0.5;
  float leadBall = exp(-leadSeat * leadSeat * 16.0);
  float leadOnLine = exp(-restRidge * restRidge * 4.2) * (0.25 + 0.75 * rest.b);
  float leadLeft = 1.0 - smoothstep(0.0, 0.38, p.x);
  float leadBead = leadBall * leadOnLine * (0.55 + 0.9 * leadLeft) * motionAmt * silkGain;

  // Re-read the fold map further along the fold's own line. Shifting the lookup
  // rather than the output means the drape itself rolls, which is what carries the
  // movement onto bare paper further down the page where there is no photo left.
  vec2 slide = (travel * 60.0 + vec2(-travel.y, travel.x) * 26.0) * ripple;
  slide += (travel * 78.0 + vec2(-travel.y, travel.x) * 34.0) * leadBead;
  vec4 flow = flowSample(p.x + slide.x / uRes.x, docY + slide.y);
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

  // Rough photo UV before warp — used to mask body/arm without fighting the face.
  // Portrait embed is off (aboutOn=0 / hold=0): skip the heavy photo/mask path so
  // phones are not sampling four textures for a mix that never shows.
  float reveal = clamp(fall * 1.25 * (0.45 + 0.55 * lineStrength), 0.0, 1.0);

  // Broaden the bands so each fold reads as a thick sweep of cloth rather than
  // a thin line. Slightly softer curve so ridges ease into the paper.
  float ridgeWide = sign(ridge) * pow(abs(ridge), 0.78);
  float fold = ridgeWide * lineStrength;
  float sheen = max(0.0, ridgeWide) * lineStrength * liftGain;
  float trough = max(0.0, -ridgeWide) * lineStrength;
  float portraitSilk = 1.0;

  // What the hand does to the light. Shadow gathers in the cloth behind it, which
  // is still dropping back, and deepest where that cloth was already a trough; the
  // ridge it is running into catches the highlight. Both come up with speed, so a
  // resting cursor stays the colour reveal it was and a moving one presses the
  // sheet. Under the hand itself the weave takes a small even press either way,
  // which is the only part of this that survives the hand coming to a stop.
  float bank = fall * speed;
  float shade = bank * max(0.0, -wake) * (0.45 + 0.55 * trough) * shadeGain;
  float gleam = bank * max(0.0, wake) * (0.4 + 0.6 * sheen) * liftGain;
  float weight = fall * fall * (0.3 + 0.4 * speed) * shadeGain;

  // Light gathers on the folds the swell is passing over, so you can see where it
  // has got to even on bare paper, where there is no photo detail left to smear.
  float crest = max(0.0, ball - 0.12) * lineStrength * motionAmt * silkGain;
  float leadCrest = max(0.0, leadBead - 0.08) * lineStrength;

  // Hero landing keeps the left-name drape; no under-portrait crush (figure-only hold).
  float landing = 1.0 - smoothstep(heroH * 0.6, heroH * 1.05, docY);
  float besideName = (1.0 - smoothstep(0.1, 0.8, p.x)) * smoothstep(0.34, 0.98, p.y);
  float underPortrait = 0.0;
  float landingSilk = 1.0 + landing * 1.45 * besideName + underPortrait;

  vec3 portrait = livePaper;
  float figure = 0.0;
  float band = 0.0;

  if (aboutOn > 0.001) {
    vec2 preUv = vec2(sampleX, sampleY);
    float faceKeep = 1.0 - smoothstep(
      0.08,
      0.22,
      length((preUv - vec2(0.50, 0.44)) * vec2(1.2, 1.55))
    );
    float armDown = 1.0 - smoothstep(0.08, 0.42, preUv.y);
    float leftArm = (1.0 - smoothstep(0.12, 0.48, preUv.x))
                  * smoothstep(0.28, 0.48, preUv.y)
                  * (1.0 - smoothstep(0.62, 0.82, preUv.y))
                  * (1.0 - faceKeep);
    leftArm *= mix(0.25, 1.4, armDown);
    float armPulse = (0.55 + 0.65 * abs(ripple) + 0.85 * leadBead) * motionAmt;

    float amp = (0.003 * fall * (1.0 + 1.3 * speed) + 0.004 * ripple * faceProtect + 0.006 * leadBead * faceProtect) * lineStrength;
    amp += (0.016 * ripple + 0.022 * leadBead) * leftArm * armPulse;
    amp *= mix(1.0, 0.35, paperBright * (1.0 - tintLive));
    amp *= mix(0.4, 1.0, tintLive);
    vec2 push = tangent * 0.35 + perp * (ridge * 0.55) + sweepDir * drag * 1.1;
    push += vec2(-0.22, 1.15) * leftArm * armPulse;
    vec2 uvDelta = vec2(push.x / aspect, push.y) * amp / fit;

    vec2 frameUv = preUv;
    vec2 guard = smoothstep(vec2(0.0), vec2(0.04), frameUv)
               * smoothstep(vec2(0.0), vec2(0.04), 1.0 - frameUv);
    vec2 sampleUv = clamp(frameUv + uvDelta * min(guard.x, guard.y), 0.0, 1.0);
    sampleUv = mix(sampleUv, vec2(sampleUv.x, 0.02), step(portraitH, localY) + step(localY, 0.0));

    float smearAmt = mix(0.12, 0.75, clamp(leftArm * armPulse, 0.0, 1.0)) * (0.35 + 0.65 * faceProtect);
    vec2 mDir = vec2(0.0025, 0.014) * mix(1.0, 2.6, clamp(leftArm * armPulse, 0.0, 1.0));
    vec3 sharp = texture2D(uPhoto, sampleUv).rgb;
    vec3 smear = sharp * 0.30;
    smear += texture2D(uPhoto, clamp(sampleUv + mDir * 0.4, 0.0, 1.0)).rgb * 0.18;
    smear += texture2D(uPhoto, clamp(sampleUv - mDir * 0.4, 0.0, 1.0)).rgb * 0.18;
    smear += texture2D(uPhoto, clamp(sampleUv + mDir * 0.8, 0.0, 1.0)).rgb * 0.12;
    smear += texture2D(uPhoto, clamp(sampleUv - mDir * 0.8, 0.0, 1.0)).rgb * 0.12;
    smear += texture2D(uPhoto, clamp(sampleUv + mDir, 0.0, 1.0)).rgb * 0.05;
    smear += texture2D(uPhoto, clamp(sampleUv - mDir, 0.0, 1.0)).rgb * 0.05;
    vec3 sharpRaw = mix(sharp, smear, smearAmt);
    vec3 hazeRaw = fuzzSample(sampleUv + tangent * fuzz * 0.015, 0.004 + fuzz * 0.045);
    vec3 raw = mix(sharpRaw, hazeRaw, smoothstep(0.15, 0.9, fuzz) * 0.72);

    float grey = dot(raw, LUMA);
    float print = clamp((grey - 0.5) * 1.12 + 0.54, 0.0, 1.0);
    vec3 inkShadow = uWash * mix(0.55, 0.72, paperBright);
    vec3 inkHighlight = mix(uPaper, mix(uWash, uPaper, 0.65), mix(0.34, 0.12, paperBright));
    vec3 bw = mix(inkShadow, inkHighlight, print);
    vec3 saturated = clamp((raw - vec3(grey)) * 1.4 + vec3(grey), 0.0, 1.0);
    saturated = mix(saturated, saturated * mix(uPaper / max(dot(uPaper, LUMA), 0.001), vec3(1.0), 0.5), 0.18);
    vec3 photo = mix(bw, saturated, reveal);

    portraitSilk = mix(0.04, 1.0, max(faceProtect, clamp(leftArm, 0.0, 1.0) * 0.55));
    portrait = photo;
    portrait = clamp((portrait - 0.5) * 1.06 + 0.52, 0.0, 1.0);
    float foldLift = mix(0.45, 0.18, paperBright);
    portrait *= clamp(1.0 + fold * foldLift * portraitSilk * landingSilk, 0.4, mix(1.7, 1.25, paperBright));
    portrait *= clamp(1.0 - trough * mix(0.38, 0.48, paperBright) * portraitSilk * landingSilk, 0.4, 1.0);
    portrait += pow(sheen, 1.4) * (0.12 + 0.08 * fall) * portraitSilk * landingSilk * liftGain;
    portrait *= 1.0 + crest * 0.08 * portraitSilk * liftGain;
    portrait *= 1.0 + leadCrest * 0.12 * portraitSilk * liftGain;
    portrait *= 1.0 - 0.06 * fuzz * fuzz;
    portrait *= 1.0 - 0.04 * length((heroP - 0.5) * vec2(heroAspect, 1.0));

    vec2 eyeC = vec2(0.50, 0.435);
    float eyeMask =
      step(eyeC.x - 0.075, sampleUv.x) * step(sampleUv.x, eyeC.x + 0.075) *
      step(eyeC.y - 0.035, sampleUv.y) * step(sampleUv.y, eyeC.y + 0.035);
    vec3 eyeInv = 1.0 - portrait;
    eyeInv = mix(eyeInv, eyeInv * vec3(0.82, 0.76, 1.08) + vec3(0.06, 0.04, 0.12), 0.45);
    portrait = mix(portrait, eyeInv, eyeMask);

    float inFrame = min(guard.x, guard.y);
    vec2 wob = vec2(
      fbm2(sampleUv * vec2(13.0, 16.0)),
      fbm2(sampleUv * vec2(13.0, 16.0) + 31.7)
    ) - 0.5;
    vec2 maskUv = clamp(sampleUv + wob * 0.022 * aboutOn, 0.0, 1.0);
    float mr = mix(0.0015, 0.009, aboutOn);
    float maskA = texture2D(uMask, maskUv).a * 0.32;
    maskA += texture2D(uMask, clamp(maskUv + vec2(mr, 0.0), 0.0, 1.0)).a * 0.17;
    maskA += texture2D(uMask, clamp(maskUv - vec2(mr, 0.0), 0.0, 1.0)).a * 0.17;
    maskA += texture2D(uMask, clamp(maskUv + vec2(0.0, mr * 1.5), 0.0, 1.0)).a * 0.17;
    maskA += texture2D(uMask, clamp(maskUv - vec2(0.0, mr * 1.5), 0.0, 1.0)).a * 0.17;
    float thresh = 0.42 - (fold * 0.08 + sheen * 0.05) * aboutOn;
    float feather = mix(0.05, 0.26, aboutOn);
    figure = smoothstep(thresh - feather, thresh + feather, maskA);
    band = figure * (1.0 - figure) * 4.0;
    float fineGrain = fbm2(sampleUv * vec2(150.0, 180.0)) - 0.5;
    figure = clamp(figure + fineGrain * 0.22 * band * aboutOn, 0.0, 1.0);
    figure = max(figure, eyeMask) * inFrame;
  }

  // Scroll-graded field: flat on cream; folds only once tint has colour.
  // Same grade on phone and desktop — narrow only softens motion, not colour.
  vec3 fieldCol = mix(livePaper, liveWash, (mix(0.02, 0.12, tintLive) + 0.11 * trough * tintLive));
  float fieldFold = mix(0.04, 0.22, tintLive) * mix(1.0, 0.45, paperBright * (1.0 - tintLive));
  fieldCol *= clamp(1.0 + fold * fieldFold * landingSilk, 0.55, mix(1.08, 1.35, tintLive));
  fieldCol *= clamp(1.0 - trough * mix(0.06, 0.22, tintLive) * landingSilk, 0.55, 1.0);
  fieldCol *= 1.0 + crest * 0.14 * liftGain;
  fieldCol *= 1.0 + leadCrest * 0.26 * liftGain;
  fieldCol += sheen * 0.03 * landingSilk * tintLive;
  fieldCol += leadBead * lineStrength * 0.045 * liftGain;
  // Soft wash lift on the cursor reveal — never toward chalk white on cream.
  vec3 litTarget = mix(livePaper, mix(liveWash, mix(liveWash, livePaper, 0.55), paperBright), tintLive);
  vec3 lit = mix(fieldCol, litTarget, mix(0.12, 0.4, tintLive));
  fieldCol = mix(fieldCol, lit, reveal * mix(0.35, 1.0, tintLive));

  // Through the transition the print takes the paper's colour and the fold's
  // light, which is what seats it in the sheet rather than sitting on top of it.
  float silkRim = band * aboutOn;
  portrait = mix(portrait, fieldCol, silkRim * 0.34);
  portrait *= clamp(1.0 + silkRim * (fold * 0.16 - trough * 0.12) * liftGain, 0.7, mix(1.3, 1.12, paperBright));
  portrait += silkRim * sheen * 0.05;

  // Portrait lives in the About <Image> on the right — do not embed it in the silk.
  float hold = 0.0;
  vec3 col = mix(fieldCol, portrait, hold);

  // Laid on the finished sheet so the press reads the same on the portrait and on
  // the bare paper below it, held off the face by the same mask the folds use.
  float silkHold = mix(1.0, portraitSilk, hold);
  col *= clamp(1.0 - (shade * 0.78 + weight * 0.16) * silkHold, 0.18, 1.0);
  col += gleam * (0.17 + 0.09 * (1.0 - hold)) * silkHold * liftGain;

  // Quiet film grain — almost gone on cream, present once tint has colour.
  float grain = fract(sin(dot(px, vec2(12.9898, 78.233))) * 43758.5453);
  float grainMask = 0.4 + 0.6 * (1.0 - abs(dot(col, LUMA) * 2.0 - 1.0));
  float grainAmt = mix(0.04, 0.018, clear);
  grainAmt = mix(grainAmt, 0.018, aboutOn * (1.0 - hold));
  grainAmt *= mix(0.12, 1.0, tintLive);
  col += (grain - 0.5) * grainAmt * grainMask;

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

export function HeroWarp({ src, flowSrc, bleedSrc, maskSrc, alt }: HeroWarpProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursor = useCursorReveal();
  const [mode, setMode] = useState<"pending" | "gl" | "fallback">("pending");

  const pointer = useRef({ x: 0, y: 0, on: 0, moved: false });
  const scrollRef = useRef({
    y: 0,
    viewH: 1,
    heroH: 1,
    pageH: 1,
    portraitTop: 1,
    portraitH: 1,
  });
  const reduceMotionRef = useRef(false);
  const silkRef = useRef(getVibe().silk);
  const tintColorRef = useRef(mapVibeColor(getVibe().color));
  const motionRef = useRef(
    silkMotionScale(getVibe().silk, getVibe().color),
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => {
      reduceMotionRef.current = query.matches;
      silkRef.current = getVibe().silk;
      tintColorRef.current = mapVibeColor(getVibe().color);
      motionRef.current = query.matches
        ? 0
        : silkMotionScale(silkRef.current, tintColorRef.current);
    };
    syncMotion();
    query.addEventListener("change", syncMotion);
    const unsub = subscribeVibe(syncMotion);
    return () => {
      query.removeEventListener("change", syncMotion);
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!cursor) return;

    return cursor.subscribe(({ x, y, fine }) => {
      if (!fine) {
        pointer.current.on = 0;
        return;
      }

      const { w, h } = viewportBox();
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
      const { h: viewH } = viewportBox();
      const heroEl = document.querySelector<HTMLElement>("[data-story-hero]");
      const heroH = heroEl ? heroEl.offsetHeight : viewH;
      // Portrait embed disabled — photo lives in About as a normal image.
      const portraitH = 1;
      const portraitTop = 1e9;
      scrollRef.current = {
        y: window.scrollY,
        viewH,
        heroH,
        pageH: Math.max(
          viewH,
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
        ),
        portraitTop,
        portraitH,
      };
    };

    // Layout only — the scroll offset and the tint are read in the draw loop, so
    // there is no scroll listener here to run on the phone's main thread.
    readScroll();
    window.addEventListener("resize", readScroll);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", readScroll);
    const unsub = subscribeVibe(readScroll);
    const ro = new ResizeObserver(readScroll);
    ro.observe(document.documentElement);
    if (document.body) ro.observe(document.body);
    const aboutEl = document.querySelector<HTMLElement>("#about");
    if (aboutEl) ro.observe(aboutEl);
    return () => {
      window.removeEventListener("resize", readScroll);
      vv?.removeEventListener("resize", readScroll);
      unsub();
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
      powerPreference: isLiteField() ? "high-performance" : "low-power",
      desynchronized: true,
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
      portraitTop: gl.getUniformLocation(program, "uPortraitTop"),
      portraitH: gl.getUniformLocation(program, "uPortraitH"),
      scroll: gl.getUniformLocation(program, "uScroll"),
      viewH: gl.getUniformLocation(program, "uViewH"),
      pageH: gl.getUniformLocation(program, "uPageH"),
      paper: gl.getUniformLocation(program, "uPaper"),
      wash: gl.getUniformLocation(program, "uWash"),
      y0: gl.getUniformLocation(program, "uY0"),
      y1: gl.getUniformLocation(program, "uY1"),
      y2: gl.getUniformLocation(program, "uY2"),
      y3: gl.getUniformLocation(program, "uY3"),
      y4: gl.getUniformLocation(program, "uY4"),
      p0: gl.getUniformLocation(program, "uP0"),
      p1: gl.getUniformLocation(program, "uP1"),
      p2: gl.getUniformLocation(program, "uP2"),
      p3: gl.getUniformLocation(program, "uP3"),
      p4: gl.getUniformLocation(program, "uP4"),
      w0: gl.getUniformLocation(program, "uW0"),
      w1: gl.getUniformLocation(program, "uW1"),
      w2: gl.getUniformLocation(program, "uW2"),
      w3: gl.getUniformLocation(program, "uW3"),
      w4: gl.getUniformLocation(program, "uW4"),
      cursor: gl.getUniformLocation(program, "uCursor"),
      cursorTrail: gl.getUniformLocation(program, "uCursorTrail"),
      cursorVel: gl.getUniformLocation(program, "uCursorVel"),
      on: gl.getUniformLocation(program, "uOn"),
      radius: gl.getUniformLocation(program, "uRadius"),
      time: gl.getUniformLocation(program, "uTime"),
      motion: gl.getUniformLocation(program, "uMotion"),
      tint: gl.getUniformLocation(program, "uTint"),
      photo: gl.getUniformLocation(program, "uPhoto"),
      flow: gl.getUniformLocation(program, "uFlow"),
      bleed: gl.getUniformLocation(program, "uBleed"),
      mask: gl.getUniformLocation(program, "uMask"),
    };

    let disposed = false;
    let raf = 0;
    let observer: ResizeObserver | null = null;
    let photoTex: WebGLTexture | null = null;
    let flowTex: WebGLTexture | null = null;
    let bleedTex: WebGLTexture | null = null;
    let maskTex: WebGLTexture | null = null;
    let width = 0;
    let height = 0;
    let viewH = 1;
    const lite = isLiteField();
    let scrollBusyUntil = 0;
    let lastDraw = 0;

    const markScrollBusy = () => {
      scrollBusyUntil = performance.now() + 180;
    };

    const resize = () => {
      const box = viewportBox();
      const cssW = Math.max(1, Math.round(Math.max(box.w, wrap.clientWidth || 0)));
      viewH = Math.max(1, Math.round(box.h));
      const pageH = Math.max(
        viewH,
        wrap.clientHeight || 0,
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      );
      width = cssW;
      height = lite ? Math.max(pageH, wrap.clientHeight || pageH) : viewH;

      const maxR = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 4096;
      const want = lite ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      const dpr = Math.max(
        0.35,
        Math.min(want, maxR / Math.max(width, 1), maxR / Math.max(height, 1)),
      );
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const contextLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(raf);
      setMode("fallback");
    };
    canvas.addEventListener("webglcontextlost", contextLost);

    Promise.all([
      loadImage(src),
      loadImage(flowSrc),
      loadImage(bleedSrc),
      loadImage(maskSrc),
    ])
      .then(([photo, flow, bleedImage, maskImage]) => {
        if (disposed) return;

        photoTex = uploadTexture(gl, photo);
        flowTex = uploadTexture(gl, flow);
        bleedTex = uploadTexture(gl, bleedImage);
        maskTex = uploadTexture(gl, maskImage);
        const photoAspect = photo.naturalWidth / photo.naturalHeight;

        gl.useProgram(program);
        gl.uniform1i(u.photo, 0);
        gl.uniform1i(u.flow, 1);
        gl.uniform1i(u.bleed, 2);
        gl.uniform1i(u.mask, 3);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, photoTex);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, flowTex);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, bleedTex);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, maskTex);

        resize();
        observer = new ResizeObserver(resize);
        observer.observe(document.documentElement);
        observer.observe(wrap);
        const parent = wrap.parentElement;
        if (parent) observer.observe(parent);
        const vv = window.visualViewport;
        vv?.addEventListener("resize", resize);
        window.addEventListener("resize", resize);
        if (lite) {
          window.addEventListener("scroll", markScrollBusy, { passive: true });
          window.addEventListener("touchmove", markScrollBusy, { passive: true });
        }
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
        let primed = false;
        let smoothMotion = motionRef.current;
        let smoothTint = tintColorRef.current;
        let animTime = 0;
        let lastNow = performance.now();

        const tick = () => {
          if (disposed) return;
          raf = requestAnimationFrame(tick);
          const now = performance.now();
          if (lite) {
            // Let the compositor scroll the baked field. Drawing here would stall
            // the main thread and the silk would lag the finger again.
            if (now < scrollBusyUntil) return;
            if (now - lastDraw < 50) return;
            lastDraw = now;
          }
          const dt = Math.min(0.05, (now - lastNow) / 1000);
          lastNow = now;
          animTime += dt * (reduceMotionRef.current
            ? 0
            : silkMotionScale(silkRef.current, tintColorRef.current));
          const { heroH, pageH, portraitTop, portraitH } = scrollRef.current;
          const scrollY = lite ? 0 : window.scrollY;

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
          smoothTint += (tintColorRef.current - smoothTint) * 0.1;

          // Same grade as desktop CSS — no catch-up lerp (that was the colour lag).
          const tint = sampleVibeTintAt(
            lite ? 0 : window.scrollY,
            window.innerHeight,
            getVibe().color,
          );
          const paper = [
            tint.paper[0] / 255,
            tint.paper[1] / 255,
            tint.paper[2] / 255,
          ] as const;
          const wash = [
            tint.wash[0] / 255,
            tint.wash[1] / 255,
            tint.wash[2] / 255,
          ] as const;

          gl.uniform2f(u.res, width, height);
          gl.uniform1f(u.photoAspect, photoAspect);
          gl.uniform1f(u.fit, width < 768 ? 0.66 : 0.8);
          gl.uniform1f(u.focusX, width < 768 ? 0.58 : 0.55);
          gl.uniform1f(u.heroH, heroH);
          gl.uniform1f(u.portraitTop, portraitTop);
          gl.uniform1f(u.portraitH, portraitH);
          gl.uniform1f(u.scroll, scrollY);
          gl.uniform1f(u.viewH, viewH);
          gl.uniform1f(u.pageH, Math.max(pageH, height));
          gl.uniform3f(u.paper, paper[0], paper[1], paper[2]);
          gl.uniform3f(u.wash, wash[0], wash[1], wash[2]);
          if (lite) {
            const ribbon = vibeRibbon(getVibe().color);
            const ys = [u.y0, u.y1, u.y2, u.y3, u.y4];
            const ps = [u.p0, u.p1, u.p2, u.p3, u.p4];
            const ws = [u.w0, u.w1, u.w2, u.w3, u.w4];
            ribbon.forEach((stop, i) => {
              gl.uniform1f(ys[i], stop.y);
              gl.uniform3f(
                ps[i],
                stop.paper[0] / 255,
                stop.paper[1] / 255,
                stop.paper[2] / 255,
              );
              gl.uniform3f(
                ws[i],
                stop.wash[0] / 255,
                stop.wash[1] / 255,
                stop.wash[2] / 255,
              );
            });
          }
          gl.uniform2f(u.cursor, smoothX, smoothY);
          gl.uniform2f(u.cursorTrail, trailX, trailY);
          gl.uniform2f(u.cursorVel, dirX * speed, dirY * speed);
          gl.uniform1f(u.on, smoothOn);
          gl.uniform1f(u.radius, Math.max(160, Math.min(width, height) * 0.3));
          gl.uniform1f(u.time, animTime);
          gl.uniform1f(u.motion, smoothMotion);
          gl.uniform1f(u.tint, smoothTint);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
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
      window.visualViewport?.removeEventListener("resize", resize);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", markScrollBusy);
      window.removeEventListener("touchmove", markScrollBusy);
      canvas.removeEventListener("webglcontextlost", contextLost);
      if (photoTex) gl.deleteTexture(photoTex);
      if (flowTex) gl.deleteTexture(flowTex);
      if (bleedTex) gl.deleteTexture(bleedTex);
      if (maskTex) gl.deleteTexture(maskTex);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [src, flowSrc, bleedSrc, maskSrc, WARP_SHADER_REV]);

  return (
    <div
      ref={wrapRef}
      className={`hero-warp pointer-events-none z-0 overflow-hidden bg-paper${
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
        <div className="hero-warp__fallback absolute inset-0 bg-paper" aria-hidden />
      ) : null}
      {mode === "fallback" ? <span className="sr-only">{alt}</span> : null}
    </div>
  );
}
