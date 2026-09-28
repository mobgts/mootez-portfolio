// Swap the About/hero portrait for a new photo at original quality,
// then rebuild bleed + subject mask for the warp shader.
import { removeBackground } from "@imgly/background-removal-node";
import fs from "fs";
import sharp from "sharp";

const SRC = process.argv[2];
if (!SRC) {
  console.error("usage: node scripts/swap-profile.mjs <source.jpg>");
  process.exit(1);
}

const HERO_SOURCE = "assets/hero-source.jpg";
const HERO_WARP = "public/photos/hero-warp.jpg";
const HERO_BLEED = "public/photos/hero-warp-bleed.jpg";
const HERO_MASK = "public/photos/hero-warp-mask.png";
const HERO_CUTOUT = "assets/hero-cutout.png";

const srcBuf = fs.readFileSync(SRC);
fs.writeFileSync(HERO_SOURCE, srcBuf);
fs.writeFileSync(HERO_WARP, srcBuf);
console.log("wrote", HERO_SOURCE, "and", HERO_WARP, `(${srcBuf.length} bytes, original)`);

const meta = await sharp(srcBuf).metadata();
console.log("source", meta.width, "x", meta.height);

await sharp(srcBuf)
  .resize(256)
  .blur(9)
  .jpeg({ quality: 72, mozjpeg: true })
  .toFile(HERO_BLEED);
console.log("wrote", HERO_BLEED);

console.log("segmenting subject mask…");
const srcBlob = new Blob([srcBuf], { type: "image/jpeg" });
const cutBlob = await removeBackground(srcBlob, {
  output: { format: "image/png", quality: 1 },
});
const cutBuf = Buffer.from(await cutBlob.arrayBuffer());
await sharp(cutBuf).png().toFile(HERO_CUTOUT);
await sharp(cutBuf).png().toFile(HERO_MASK);
console.log("wrote", HERO_MASK, "and", HERO_CUTOUT);

const outMeta = await sharp(HERO_WARP).metadata();
console.log("done", { hero: [outMeta.width, outMeta.height], bytes: srcBuf.length });
