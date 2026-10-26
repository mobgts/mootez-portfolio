import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const photosPath = path.join(root, "content", "photos.ts");
let src = fs.readFileSync(photosPath, "utf8");

src = src.replace(/src: "(\/photos\/[^"]+)"/g, (match, url) => {
  const clean = url.split("?")[0];
  const filePath = path.join(root, "public", clean.replace(/^\//, ""));
  let resolved = filePath;
  if (!fs.existsSync(resolved)) {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    const found = fs
      .readdirSync(dir)
      .find((f) => f.toLowerCase() === base.toLowerCase());
    if (!found) {
      console.warn("missing", clean);
      return match;
    }
    resolved = path.join(dir, found);
  }
  const hash = crypto
    .createHash("sha256")
    .update(fs.readFileSync(resolved))
    .digest("hex")
    .slice(0, 8);
  return `src: "${clean}?v=${hash}"`;
});

fs.writeFileSync(photosPath, src);
console.log("updated src cache-busters in photos.ts");
