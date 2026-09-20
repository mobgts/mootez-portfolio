// Offline preview of the hero shader (no cursor): fold shading from the flow map,
// the swells that enter at the frame edges and travel inward along the folds, plus
// the grain pass — so tone and travel can be checked without a browser. Writes
// preview-hero-warp.png at the repo root, one panel per time step.
// Run: node scripts/preview-hero-warp.mjs
import sharp from "sharp";

const W = 720;
const H = 960;
const FLOW = 512;
const FRAMES = [0, 1.2, 2.4, 3.6];

const photo = await sharp("public/photos/hero-warp.jpg")
  .resize(W, H, { fit: "cover" })
  .raw()
  .toBuffer();

// Sampled the way the page samples it: the square map tiled at the viewport width
// and mirrored on alternate tiles, not stretched to fit the panel.
const flow = await sharp("public/photos/warp-flow.webp")
  .resize(FLOW, FLOW, { fit: "fill" })
  .ensureAlpha()
  .raw()
  .toBuffer();

const tileH = Math.max(W, 640);

function fract(v) {
  return v - Math.floor(v);
}

// flow.webp is stored bottom-up relative to the GL sampler (UNPACK_FLIP_Y_WEBGL),
// so the row index is mirrored here to match what the shader reads.
function silk(x, pageY) {
  const u = Math.min(1, Math.max(0, x));
  const v = Math.abs(fract((pageY / tileH) * 0.5) * 2 - 1);
  const cx = Math.min(FLOW - 1, Math.max(0, Math.round(u * (FLOW - 1))));
  const cy = Math.min(FLOW - 1, Math.max(0, Math.round((1 - v) * (FLOW - 1))));
  const i = (cy * FLOW + cx) * 4;
  return {
    tx: (flow[i] / 255) * 2 - 1,
    ty: (flow[i + 1] / 255) * 2 - 1,
    strength: flow[i + 2] / 255,
    ridge: (flow[i + 3] / 255) * 2 - 1,
  };
}

// The two ends of this fold's run across the frame, as distances along the tangent.
// Flipping the tangent swaps the pair, so callers can stay free of its missing sign.
function foldEnds(qx, qy, dx, dy) {
  const ex = (dx >= 0 ? 1 : -1) * Math.max(Math.abs(dx), 0.004);
  const ey = (dy >= 0 ? 1 : -1) * Math.max(Math.abs(dy), 0.004);
  const loX = -qx / ex;
  const hiX = (W - qx) / ex;
  const loY = -qy / ey;
  const hiY = (H - qy) / ey;
  const ahead = Math.min(Math.max(loX, hiX), Math.max(loY, hiY));
  const behind = -Math.max(Math.min(loX, hiX), Math.min(loY, hiY));
  return [ahead, behind];
}

const out = Buffer.alloc(W * FRAMES.length * H * 3);
const LUMA = [0.2126, 0.7152, 0.0722];

for (let frame = 0; frame < FRAMES.length; frame++) {
  const time = FRAMES[frame];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const docY = y;
      const rest = silk(x / W, docY);
      const restLen = Math.hypot(rest.tx, rest.ty);
      const rx = restLen > 0.001 ? rest.tx / restLen : 1;
      const ry = restLen > 0.001 ? rest.ty / restLen : 0;

      const [ahead, behind] = foldEnds(x, H - y, rx, ry);
      const lean = Math.min(1, Math.max(-1, (ahead - behind) / 300));
      const tvx = rx * lean;
      const tvy = ry * lean;

      const lane = Math.max(H, 420) * 0.75;
      const journey = (docY + rest.ridge * 90 - time * 150) / lane;
      const seat = fract(journey) - 0.5;
      const ball = Math.exp(-seat * seat * 11);
      const undertow = Math.sin(journey * 2.2 + rest.ridge * 2.4) * 0.3;
      const ripple = ball + undertow;

      const slideX = (tvx * 60 + -tvy * 26) * ripple;
      const slideY = (tvy * 60 + tvx * 26) * ripple;
      const cell = silk(x / W + slideX / W, docY + slideY);
      const crest = Math.max(0, ball - 0.12) * cell.strength;

      const src = (y * W + x) * 3;
      const grey =
        (photo[src] / 255) * LUMA[0] +
        (photo[src + 1] / 255) * LUMA[1] +
        (photo[src + 2] / 255) * LUMA[2];
      const bw = Math.min(1, Math.max(0, (grey - 0.5) * 1.08 + 0.54));

      const fold = cell.ridge * cell.strength;
      const sheen = Math.max(0, cell.ridge) * cell.strength;
      let c = bw * (1 + fold * 0.42) * (1 + crest * 0.14) + sheen * 0.09;

      const gx = Math.floor(x / 1.5);
      const gy = Math.floor(y / 1.5);
      const s = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453;
      const grain = s - Math.floor(s);
      const grainMask = 0.45 + 0.55 * (1 - Math.abs(c * 2 - 1));
      c += (grain - 0.5) * 0.14 * grainMask;

      const v = Math.round(Math.min(1, Math.max(0, c)) * 255);
      const dst = (y * W * FRAMES.length + frame * W + x) * 3;
      out[dst] = v;
      out[dst + 1] = v;
      out[dst + 2] = v;
    }
  }
}

await sharp(out, {
  raw: { width: W * FRAMES.length, height: H, channels: 3 },
})
  .png()
  .toFile("preview-hero-warp.png");

console.log(`wrote preview-hero-warp.png — ${FRAMES.length} frames at`, FRAMES);
