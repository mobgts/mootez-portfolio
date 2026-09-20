// Pixel-true background swap: keep the original subject (+ red warp arc),
 // put them on a dark void. Uses @imgly/background-removal-node for the matte.
import { removeBackground } from "@imgly/background-removal-node";
import fs from "fs";
import sharp from "sharp";

const SRC =
  "C:/Users/bough/.cursor/projects/c-Users-bough-Desktop-Mootez-Boughattas-Portfolio-mootez-portfolio/assets/c__Users_bough_AppData_Roaming_Cursor_User_workspaceStorage_74acdffe2068cf0639decac37b3c24a4_images_DSCF8753-96417d8c-f94d-4db7-ba99-83a9dd597042.jpg";
const OUT = "assets/hero-source.jpg";

const srcBuf = fs.readFileSync(SRC);
const srcBlob = new Blob([srcBuf], { type: "image/jpeg" });
const meta = await sharp(srcBuf).metadata();
const w = meta.width;
const h = meta.height;

console.log("segmenting…", w, "x", h);
const cutCache = "assets/hero-cutout.png";
let cutBuf;
if (fs.existsSync(cutCache)) {
  cutBuf = fs.readFileSync(cutCache);
  console.log("using cached cutout");
} else {
  const cutBlob = await removeBackground(srcBlob, {
    output: { format: "image/png", quality: 1 },
  });
  cutBuf = Buffer.from(await cutBlob.arrayBuffer());
  await sharp(cutBuf).png().toFile(cutCache);
}

const { data: rgba, info } = await sharp(cutBuf)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { data: orig } = await sharp(srcBuf)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

// Soft dark void with a warm key-light spill from upper-left, matching the portrait.
const bg = Buffer.alloc(w * h * 4);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const nx = x / (w - 1);
    const ny = y / (h - 1);
    // Warm spill near the light source (top-left of face).
    const dx = nx - 0.32;
    const dy = ny - 0.12;
    const spill = Math.exp(-(dx * dx * 9 + dy * dy * 14)) * 0.22;
    const edge = Math.min(nx, 1 - nx, ny, 1 - ny);
    const vignette = Math.max(0, 1 - Math.pow(1 - edge * 2.2, 2)) * 0.04;
    const r = Math.round(8 + spill * 70 + vignette * 10);
    const g = Math.round(4 + spill * 28);
    const b = Math.round(2 + spill * 8);
    bg[i] = r;
    bg[i + 1] = g;
    bg[i + 2] = b;
    bg[i + 3] = 255;
  }
}

// Preserve + punch the red warp arc: keep original non-subject pixels in the
// top band, boost warmth, fade before the desk returns.
const topSolid = Math.round(h * 0.12);
const topFade = Math.round(h * 0.28);
const out = Buffer.from(bg);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const aSub = rgba[i + 3] / 255;

    // Subject always wins — exact original RGB.
    if (aSub > 0.02) {
      const a = Math.min(1, aSub);
      out[i] = Math.round(orig[i] * a + out[i] * (1 - a));
      out[i + 1] = Math.round(orig[i + 1] * a + out[i + 1] * (1 - a));
      out[i + 2] = Math.round(orig[i + 2] * a + out[i + 2] * (1 - a));
      continue;
    }

    if (y >= topFade) continue;

    const r = orig[i];
    const g = orig[i + 1];
    const b = orig[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // Skip empty black corners so we don't reintroduce noise.
    if (lum < 5) continue;
    // Kill cool desk clutter (blue cup etc.) — warp arc is warm only.
    if (b > r + 8 && b > g) continue;

    let strength =
      y <= topSolid ? 1 : 1 - (y - topSolid) / Math.max(1, topFade - topSolid);
    // Prefer warm/lit fabric over cool desk clutter as we fade.
    const warm = (r - b) / 255;
    strength *= 0.7 + 0.3 * Math.min(1, Math.max(0, warm * 2.8 + lum / 110));
    if (strength < 0.02) continue;

    // Punch the arc so it reads against the void.
    const punch = 1.0 + 0.55 * strength;
    const rr = Math.min(255, r * punch + 18 * strength);
    const gg = Math.min(255, g * punch * 0.92 + 4 * strength);
    const bb = Math.min(255, b * punch * 0.75);

    out[i] = Math.round(rr * strength + out[i] * (1 - strength));
    out[i + 1] = Math.round(gg * strength + out[i + 1] * (1 - strength));
    out[i + 2] = Math.round(bb * strength + out[i + 2] * (1 - strength));
  }
}

await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  .jpeg({ quality: 95, mozjpeg: true })
  .toFile(OUT);

console.log("wrote", OUT);
