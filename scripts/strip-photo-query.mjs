import fs from "node:fs";

const p = "content/photos.ts";
let s = fs.readFileSync(p, "utf8");
s = s.replace(/(\/photos\/[^"?]+)\?v=[a-f0-9]+/g, "$1");
fs.writeFileSync(p, s);
console.log("remaining ?v=", (s.match(/\?v=/g) || []).length);
