// Renders the Microsoft Store (MSIX) tile and logo images into build/appx/
// from build/icon.svg. electron-builder copies that folder into the package.
// Without it, the package would ship electron-builder's sample images.
//
// - Square44x44Logo: the full icon (Start menu list, taskbar). The
//   "altform-unplated" copies are drawn as-is, with no colored plate behind.
// - Square150x150 / Wide / Large / Small tiles: the white headset on the
//   tile's teal background color (appx.backgroundColor in package.json).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "build", "appx");
const iconSvg = fs.readFileSync(path.join(root, "build", "icon.svg"), "utf8");

// The headset drawing from icon.svg, in its 32x32 coordinates, without the
// teal square. Its box is about x 7-25, y 8-27.6 (center 16, 17.8).
const glyph = iconSvg
  .split("\n")
  .filter((line) => /<(path|circle)|<rect x=/.test(line))
  .join("");
const GLYPH_H = 19.6, CX = 16, CY = 17.8;

const render = (svg, width) => new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();

function glyphPng(w, h, glyphHeight) {
  const s = glyphHeight / GLYPH_H;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<g transform="translate(${w / 2 - CX * s} ${h / 2 - CY * s}) scale(${s})">${glyph}</g></svg>`;
  return render(svg, w);
}
const fullIconPng = (size) => render(iconSvg, size);

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const write = (name, png) => fs.writeFileSync(path.join(out, name), png);

// Package logo (installer dialog, Settings > Apps).
for (const [scale, px] of [[100, 50], [200, 100], [400, 200]]) write(`StoreLogo.scale-${scale}.png`, fullIconPng(px));

// App list and taskbar icon.
for (const [scale, px] of [[100, 44], [200, 88], [400, 176]]) write(`Square44x44Logo.scale-${scale}.png`, fullIconPng(px));
for (const px of [16, 24, 32, 48, 256]) {
  write(`Square44x44Logo.targetsize-${px}.png`, fullIconPng(px));
  write(`Square44x44Logo.targetsize-${px}_altform-unplated.png`, fullIconPng(px));
}

// Start tiles: white headset on the teal tile background.
const tiles = [
  ["Square150x150Logo", 150, 150, 0.5],
  ["Wide310x150Logo", 310, 150, 0.5],
  ["LargeTile", 310, 310, 0.45],
  ["SmallTile", 71, 71, 0.6],
];
for (const [name, w, h, frac] of tiles) {
  for (const scale of [100, 200, 400]) {
    const k = scale / 100;
    write(`${name}.scale-${scale}.png`, glyphPng(w * k, h * k, h * k * frac));
  }
}

console.log(`build/appx: ${fs.readdirSync(out).length} Store images written`);
