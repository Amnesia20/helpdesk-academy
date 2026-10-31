// Points the website (docs/index.html) at the installer for the version in package.json:
// download links, file name, "Version x.y.z", file size and SHA-256 checksum.
// Run it after `npm run dist`, once the GitHub release for this version exists.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const file = `HelpDesk-Academy-Setup-${version}.exe`;
const exe = path.join(root, "dist", file);
if (!fs.existsSync(exe)) {
  console.error(`dist\\${file} not found. Run "npm run dist" first.`);
  process.exit(1);
}

const bytes = fs.readFileSync(exe);
const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
const mb = Math.round(bytes.length / 1024 / 1024);

const page = path.join(root, "docs", "index.html");
let html = fs.readFileSync(page, "utf8");
const V = String.raw`\d+\.\d+\.\d+`;
const changes = [
  ["download links", new RegExp(String.raw`releases/download/v${V}/`, "g"), `releases/download/v${version}/`],
  ["file names", new RegExp(String.raw`HelpDesk-Academy-Setup-${V}\.exe`, "g"), file],
  ["version text", new RegExp(String.raw`Version ${V}\b`, "g"), `Version ${version}`],
  ["checksum label", new RegExp(String.raw`checksum of the ${V} installer`, "g"), `checksum of the ${version} installer`],
  ["checksum", /<code class="hash">[0-9a-f]{64}<\/code>/g, `<code class="hash">${sha256}</code>`],
  ["file size", /\b\d{2,4} MB\b/g, `${mb} MB`],
];

for (const [label, pattern, value] of changes) {
  const count = (html.match(pattern) || []).length;
  if (!count) {
    console.error(`Couldn't find the ${label} in docs/index.html. Update it by hand.`);
    process.exit(1);
  }
  html = html.replace(pattern, value);
  console.log(`${label.padEnd(15)} ${count}x`);
}

fs.writeFileSync(page, html);
console.log(`\ndocs/index.html now offers ${file} (${mb} MB).`);
console.log(`SHA-256 for the release notes:\n${sha256}`);
