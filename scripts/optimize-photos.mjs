/**
 * Web-optimize album photos for fast loads with near-lossless screen quality.
 * - Backs up originals to _photo-masters/ (gitignored)
 * - Max long edge 2560px (retina-friendly); never upscales
 * - JPEG q90 mozjpeg progressive
 * Skips hero/, inbox/, sets/ (already small / staging / special assets)
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public", "photos");
const MASTERS = path.join(ROOT, "_photo-masters");
const MAX_EDGE = 2560;
const JPEG_QUALITY = 90;
const ALBUMS = ["drowning", "people", "doubles", "acro", "analog", "gardening"];
const JPEG_EXT = new Set([".jpg", ".jpeg", ".JPG", ".JPEG"]);

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function processFile(album, file) {
  const ext = path.extname(file);
  if (!JPEG_EXT.has(ext)) return null;

  const srcPath = path.join(PUBLIC, album, file);
  const masterPath = path.join(MASTERS, album, file);
  await ensureDir(path.dirname(masterPath));

  // Backup once — if master already exists, keep the true original
  try {
    await fs.access(masterPath);
  } catch {
    await fs.copyFile(srcPath, masterPath);
  }

  const input = sharp(masterPath, { failOn: "none" }).rotate();
  const meta = await input.metadata();
  const before = (await fs.stat(masterPath)).size;

  const pipeline = input
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({
      quality: JPEG_QUALITY,
      mozjpeg: true,
      progressive: true,
      chromaSubsampling: "4:4:4",
    });

  const buf = await pipeline.toBuffer();
  // Keep the original when re-encode isn't smaller (already web-sized).
  const after = buf.length < before ? buf.length : before;
  if (buf.length < before) {
    await fs.writeFile(srcPath, buf);
  } else {
    await fs.copyFile(masterPath, srcPath);
  }

  const w = meta.width ?? "?";
  const h = meta.height ?? "?";
  return {
    file: `${album}/${file}`,
    before,
    after,
    dims: `${w}x${h}`,
  };
}

async function main() {
  const results = [];
  for (const album of ALBUMS) {
    const dir = path.join(PUBLIC, album);
    let files;
    try {
      files = await fs.readdir(dir);
    } catch {
      console.warn(`skip missing album: ${album}`);
      continue;
    }
    files.sort();
    for (const file of files) {
      const r = await processFile(album, file);
      if (r) {
        results.push(r);
        const pct = ((1 - r.after / r.before) * 100).toFixed(0);
        console.log(
          `${r.file}  ${r.dims}  ${(r.before / 1e6).toFixed(1)}→${(r.after / 1e6).toFixed(2)} MB  (-${pct}%)`,
        );
      }
    }
  }

  const before = results.reduce((s, r) => s + r.before, 0);
  const after = results.reduce((s, r) => s + r.after, 0);
  console.log("\n---");
  console.log(
    `${results.length} files  ${(before / 1e6).toFixed(0)} → ${(after / 1e6).toFixed(1)} MB  (−${((1 - after / before) * 100).toFixed(0)}%)`,
  );
  console.log(`Masters kept in ${MASTERS}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
