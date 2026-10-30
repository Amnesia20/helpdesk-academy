// Runs before electron-builder (npm run dist):
//  1. renders the app icon (build/icon.svg -> build/icon.png)
//  2. copies LICENSE.md to build/license.txt, which the installer shows on a
//     license page before installing (electron-builder picks it up by name).
// The PolyForm license requires every copy to carry its terms and the
// "Required Notice" line, so the installer and the installed app include them.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await import("./make-icon.mjs");

const license = fs.readFileSync(path.join(root, "LICENSE.md"), "utf8");
if (/NAME NOT ADDED/.test(license)) throw new Error("LICENSE.md still has no copyright holder name.");
// Windows line endings so the installer's license box shows line breaks.
fs.writeFileSync(path.join(root, "build", "license.txt"), license.replace(/\r?\n/g, "\r\n"));
console.log("build/license.txt written from LICENSE.md");
