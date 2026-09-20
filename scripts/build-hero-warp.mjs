// Generates the hero warp assets from assets/:
//   public/photos/hero-warp.jpg    — portrait still (kept in colour, greyscaled at runtime)
//   public/photos/warp-flow.webp   — RG = line tangent, B = line strength, A = line ridge
// The flow map is derived from the silk reference with a structure tensor, so the
// hero interaction follows the real streak directions of that warp instead of a
// procedural pattern. Run with: node scripts/build-hero-warp.mjs
import sharp from "sharp";

const HERO_SOURCE = "assets/hero-source.jpg";
const WARP_SOURCE = "assets/warp-source.jpg";

// Small edge cleanup so hard JPEG borders don't read as a frame once the photo
// fills the viewport. Keep top light — the warm warp arc is part of the picture.
const HERO_TRIM = { left: 1, top: 1, right: 1, bottom: 1 };

// Power of two so WebGL1 can sample it with REPEAT — the page tiles this map
// vertically, and NPOT textures render black under REPEAT.
const FLOW_W = 512;
const FLOW_H = 512;

function blur(src, w, h, radius) {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = Math.min(w - 1, Math.max(0, x + k));
        sum += src[y * w + xx];
      }
      tmp[y * w + x] = sum / (radius * 2 + 1);
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = Math.min(h - 1, Math.max(0, y + k));
        sum += tmp[yy * w + x];
      }
      out[y * w + x] = sum / (radius * 2 + 1);
    }
  }
  return out;
}

const warpMeta = await sharp(WARP_SOURCE).metadata();
// Crop past the colourful inset in the top-left of the silk reference so it
// doesn't pollute the orientation field.
const WARP_CROP = {
  left: 140,
  top: 40,
  width: warpMeta.width - 140,
  height: warpMeta.height - 40,
};

const { data: silkRaw } = await sharp(WARP_SOURCE)
  .extract(WARP_CROP)
  .resize(FLOW_W, FLOW_H, { fit: "fill" })
  .greyscale()
  .raw()
  .toBuffer({ resolveWithObject: true });

const luma = new Float32Array(FLOW_W * FLOW_H);
for (let i = 0; i < luma.length; i++) luma[i] = silkRaw[i] / 255;

// Structure tensor over a lightly smoothed copy — keep enough detail that the
// uploaded silk ridges stay readable in the flow map.
const base = blur(luma, FLOW_W, FLOW_H, 1);
const gx = new Float32Array(FLOW_W * FLOW_H);
const gy = new Float32Array(FLOW_W * FLOW_H);
for (let y = 0; y < FLOW_H; y++) {
  for (let x = 0; x < FLOW_W; x++) {
    const xl = (x - 1 + FLOW_W) % FLOW_W;
    const xr = (x + 1) % FLOW_W;
    const yu = (y - 1 + FLOW_H) % FLOW_H;
    const yd = (y + 1) % FLOW_H;
    gx[y * FLOW_W + x] = (base[y * FLOW_W + xr] - base[y * FLOW_W + xl]) * 0.5;
    gy[y * FLOW_W + x] = (base[yd * FLOW_W + x] - base[yu * FLOW_W + x]) * 0.5;
  }
}

const jxx = new Float32Array(FLOW_W * FLOW_H);
const jyy = new Float32Array(FLOW_W * FLOW_H);
const jxy = new Float32Array(FLOW_W * FLOW_H);
for (let i = 0; i < jxx.length; i++) {
  jxx[i] = gx[i] * gx[i];
  jyy[i] = gy[i] * gy[i];
  jxy[i] = gx[i] * gy[i];
}
const sxx = blur(jxx, FLOW_W, FLOW_H, 4);
const syy = blur(jyy, FLOW_W, FLOW_H, 4);
const sxy = blur(jxy, FLOW_W, FLOW_H, 4);

// Ridge signal: how much brighter a pixel is than its neighbourhood, i.e. where the
// silk folds catch light. Drives the visible highlight along each line.
const wide = blur(luma, FLOW_W, FLOW_H, 10);
let ridgeMax = 1e-6;
const ridge = new Float32Array(FLOW_W * FLOW_H);
for (let i = 0; i < ridge.length; i++) {
  ridge[i] = luma[i] - wide[i];
  ridgeMax = Math.max(ridgeMax, Math.abs(ridge[i]));
}

// Orientation is only defined modulo 180°, so it is averaged in doubled-angle space
// before being blurred back into a tangent. Without this the field flips sign between
// neighbouring pixels, which both looks noisy and compresses badly.
const cos2 = new Float32Array(FLOW_W * FLOW_H);
const sin2 = new Float32Array(FLOW_W * FLOW_H);
const rawStrength = new Float32Array(FLOW_W * FLOW_H);
let strengthMax = 1e-6;

for (let i = 0; i < rawStrength.length; i++) {
  const a = sxx[i];
  const b = sxy[i];
  const d = syy[i];
  const diff = a - d;
  const root = Math.sqrt(diff * diff + 4 * b * b);
  const l1 = (a + d + root) * 0.5;
  const l2 = (a + d - root) * 0.5;
  const coherence = l1 + l2 > 1e-9 ? (l1 - l2) / (l1 + l2) : 0;
  const s = coherence * Math.sqrt(Math.max(0, l1));
  rawStrength[i] = s;
  strengthMax = Math.max(strengthMax, s);
  // Gradient angle doubled; the tangent is this rotated by 90°.
  const angle2 = Math.atan2(2 * b, diff);
  cos2[i] = Math.cos(angle2) * s;
  sin2[i] = Math.sin(angle2) * s;
}

const cos2s = blur(cos2, FLOW_W, FLOW_H, 3);
const sin2s = blur(sin2, FLOW_W, FLOW_H, 3);
const strengthS = blur(rawStrength, FLOW_W, FLOW_H, 2);
const ridgeS = blur(ridge, FLOW_W, FLOW_H, 1);

const flow = Buffer.alloc(FLOW_W * FLOW_H * 4);
for (let i = 0; i < flow.length / 4; i++) {
  const angle = Math.atan2(sin2s[i], cos2s[i]) * 0.5;
  // Rotate the gradient direction by 90° to ride along the streak.
  const tx = -Math.sin(angle);
  const ty = Math.cos(angle);
  const s = Math.min(1, strengthS[i] / strengthMax);
  // Punch strength + ridge so the uploaded silk reads clearly on the portrait.
  const sOut = Math.min(1, Math.pow(s, 0.42) * 1.15);
  const rNorm = ridgeS[i] / ridgeMax;
  const rOut = Math.min(1, Math.max(0, rNorm * 0.72 + 0.5));
  flow[i * 4] = Math.round((tx * 0.5 + 0.5) * 255);
  flow[i * 4 + 1] = Math.round((ty * 0.5 + 0.5) * 255);
  flow[i * 4 + 2] = Math.round(sOut * 255);
  flow[i * 4 + 3] = Math.round(rOut * 255);
}

await sharp(flow, { raw: { width: FLOW_W, height: FLOW_H, channels: 4 } })
  .webp({ lossless: true, effort: 6 })
  .toFile("public/photos/warp-flow.webp");

const heroMeta = await sharp(HERO_SOURCE).metadata();
const heroCrop = {
  left: HERO_TRIM.left,
  top: HERO_TRIM.top,
  width: heroMeta.width - HERO_TRIM.left - HERO_TRIM.right,
  height: heroMeta.height - HERO_TRIM.top - HERO_TRIM.bottom,
};

// Shadows are lifted off black before export. The warp is shaded, not drawn, so any
// area that clips to black shows no fold at all. The bleed copy gets the same curve,
// otherwise the field would not match the frame it continues from.
const TONE = { slope: 0.86, offset: 30 };

await sharp(HERO_SOURCE)
  .extract(heroCrop)
  .resize(1800, null, { withoutEnlargement: false })
  .linear(TONE.slope, TONE.offset)
  .jpeg({ quality: 92, mozjpeg: true })
  .toFile("public/photos/hero-warp.jpg");

// Soft enlargement of the same frame. The hero bleeds this into whatever space the
// viewport has left over, so the portrait can fill the page without being cropped.
await sharp(HERO_SOURCE)
  .extract(heroCrop)
  .resize(256)
  .linear(TONE.slope, TONE.offset)
  .blur(9)
  .jpeg({ quality: 72, mozjpeg: true })
  .toFile("public/photos/hero-warp-bleed.jpg");

const outMeta = await sharp("public/photos/hero-warp.jpg").metadata();
console.log({
  source: [heroMeta.width, heroMeta.height],
  hero: [outMeta.width, outMeta.height],
  flow: [FLOW_W, FLOW_H],
  strengthMax: strengthMax.toFixed(5),
  ridgeMax: ridgeMax.toFixed(5),
});
