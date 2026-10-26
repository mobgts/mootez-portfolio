import sharp from "sharp";
import fs from "node:fs";

const src = "public/photos/people/03.JPG";
const out = "public/photos/people/03w.jpg";

const buf = await sharp(src, { failOn: "none" })
  .rotate()
  .jpeg({
    quality: 90,
    mozjpeg: true,
    progressive: true,
    chromaSubsampling: "4:4:4",
  })
  .toBuffer();

fs.writeFileSync(out, buf);
console.log("wrote", out, buf.length, "bytes");

let s = fs.readFileSync("content/photos.ts", "utf8");
const next = s.replace(
  /src: "\/photos\/people\/03\.JPG"/,
  'src: "/photos/people/03w.jpg"',
);
if (next === s) {
  console.warn("catalog src for 03.JPG not found — checking 03w already");
} else {
  fs.writeFileSync("content/photos.ts", next);
  console.log("catalog now points at /photos/people/03w.jpg");
}
