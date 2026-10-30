// Renders the Microsoft Store listing logos into store/logos/ from build/icon.svg:
//   app-tile-300.png    1:1 app tile icon (300x300)
//   box-art-1080.png    1:1 box art (1080x1080)
//   poster-720x1080.png 2:3 poster art (720x1080)
// Upload them under Store listing > Store logos in Partner Center.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "store", "logos");
fs.mkdirSync(out, { recursive: true });
const iconSvg = fs.readFileSync(path.join(root, "build", "icon.svg"), "utf8");
const glyph = iconSvg.split("\n").filter((l) => /<(path|circle)|<rect x=/.test(l)).join("");
const GLYPH_H = 19.6, CX = 16, CY = 17.8;

const render = (svg, width) =>
  new Resvg(svg, { fitTo: { mode: "width", value: width }, font: { loadSystemFonts: true, defaultFontFamily: "Segoe UI" } }).render().asPng();
const glyphAt = (x, y, h) => {
  const s = h / GLYPH_H;
  return `<g transform="translate(${x - CX * s} ${y - CY * s}) scale(${s})">${glyph}</g>`;
};
const bg = (w, h) =>
  `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#11867d"/><stop offset="1" stop-color="#0b5f58"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>`;
const write = (name, png) => {
  fs.writeFileSync(path.join(out, name), png);
  console.log(`store/logos/${name}`);
};

write("app-tile-300.png", render(iconSvg, 300));

write("box-art-1080.png", render(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">${bg(1080, 1080)}${glyphAt(540, 540, 520)}</svg>`, 1080));

write("poster-720x1080.png", render(
  `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1080" viewBox="0 0 720 1080">${bg(720, 1080)}${glyphAt(360, 420, 330)}` +
  `<text x="360" y="720" text-anchor="middle" font-family="Segoe UI" font-weight="700" font-size="72" fill="#ffffff">HelpDesk Academy</text>` +
  `<text x="360" y="790" text-anchor="middle" font-family="Segoe UI" font-size="34" fill="#c9f2ec">Help desk training with AI callers</text></svg>`, 720));
