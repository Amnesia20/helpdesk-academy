// Builds the Microsoft Store package (MSIX): npm run dist:store
//
// electron-builder's own copies of Microsoft's makeappx.exe don't start on
// recent Windows builds ("side-by-side configuration is incorrect"), so this
// uses the newest Windows SDK installed on this PC when there is one.
// Get the SDK from https://developer.microsoft.com/windows/downloads/windows-sdk/
// Extra arguments are passed on to electron-builder.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...process.env };

if (!env.ELECTRON_BUILDER_WINDOWS_KITS_PATH) {
  const bin = path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Windows Kits", "10", "bin");
  const versions = fs.existsSync(bin)
    ? fs.readdirSync(bin).filter((v) => /^10\.\d+\.\d+\.\d+$/.test(v) && fs.existsSync(path.join(bin, v, "x64", "makeappx.exe")))
    : [];
  versions.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (versions.length) {
    env.ELECTRON_BUILDER_WINDOWS_KITS_PATH = path.join(bin, versions.at(-1), "x64");
    console.log(`Using the Windows SDK in ${env.ELECTRON_BUILDER_WINDOWS_KITS_PATH}`);
  } else {
    console.warn("No Windows SDK found; trying electron-builder's own tools. If makeappx fails, install the Windows SDK.");
  }
}

const cli = path.join(root, "node_modules", "electron-builder", "cli.js");
const args = [cli, "--win", "appx", "--x64", "--publish", "never", "-c.toolsets.winCodeSign=1.1.0", ...process.argv.slice(2)];
const r = spawnSync(process.execPath, args, { cwd: root, env, stdio: "inherit" });
process.exit(r.status ?? 1);
