// Renders build/icon.svg to build/icon.png (512x512) for the desktop app and installer.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const svg = fs.readFileSync(path.join(root, "build", "icon.svg"));
const png = new Resvg(svg, { fitTo: { mode: "width", value: 512 } }).render().asPng();
fs.writeFileSync(path.join(root, "build", "icon.png"), png);
console.log(`build/icon.png written (${Math.round(png.length / 1024)} KB)`);
