// HelpDesk Academy desktop app (Electron). Runs the same server as the web
// version inside the app, shows it in a window, and adds a Settings screen so
// nobody has to edit .env files. Settings and data live in the user's profile:
// %APPDATA%\HelpDesk Academy\settings.env and ...\data\ (the Microsoft Store
// version uses its package folder instead; see storeLocalState below).
import { app, BrowserWindow, Menu, shell, dialog, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setupAutoUpdates, checkForUpdatesNow, updatesSupported } from "./updater.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const ICON = path.join(ROOT, "build", "icon.png");

// Microsoft Store (MSIX) version: Windows quietly redirects files written to
// %APPDATA% into the package's private storage, so Explorer would show the
// wrong folder. Use the package's own LocalState folder instead: a real path,
// and Windows removes it when the app is uninstalled.
function storeLocalState() {
  if (!process.windowsStore) return null;
  // The app runs from ...\WindowsApps\<Name>_<Version>_<Arch>_<ResourceId>_<PublisherId>\app\
  const fullName = path.basename(path.dirname(path.dirname(process.execPath)));
  const parts = fullName.split("_");
  if (parts.length < 5) return null;
  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  const dir = path.join(local, "Packages", `${parts[0]}_${parts.at(-1)}`, "LocalState");
  return fs.existsSync(dir) ? dir : null;
}

// Same settings folder whether running from source or installed.
app.setName("HelpDesk Academy");
const LEGACY_DIR = path.join(app.getPath("appData"), "HelpDesk Academy");
const STORE_DIR = storeLocalState();
app.setPath("userData", STORE_DIR ? path.join(STORE_DIR, "HelpDesk Academy") : LEGACY_DIR);

// First run of the Store version on a PC that had the GitHub version:
// bring over its settings and student progress.
if (STORE_DIR && !fs.existsSync(path.join(app.getPath("userData"), "settings.env"))) {
  try {
    if (fs.existsSync(path.join(LEGACY_DIR, "settings.env"))) {
      fs.mkdirSync(app.getPath("userData"), { recursive: true });
      fs.copyFileSync(path.join(LEGACY_DIR, "settings.env"), path.join(app.getPath("userData"), "settings.env"));
      if (fs.existsSync(path.join(LEGACY_DIR, "data"))) fs.cpSync(path.join(LEGACY_DIR, "data"), path.join(app.getPath("userData"), "data"), { recursive: true });
    }
  } catch {}
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

const USER_DIR = app.getPath("userData");
const SETTINGS_FILE = path.join(USER_DIR, "settings.env");
const DATA_DIR = path.join(USER_DIR, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

// In the installed app there's no console, so keep a log file for troubleshooting.
if (app.isPackaged) {
  const logFile = path.join(USER_DIR, "app.log");
  try {
    if (fs.existsSync(logFile) && fs.statSync(logFile).size > 2_000_000) fs.renameSync(logFile, logFile + ".old");
  } catch {}
  const out = fs.createWriteStream(logFile, { flags: "a" });
  for (const level of ["log", "warn", "error"]) {
    console[level] = (...args) => out.write(`[${new Date().toISOString()}] ${args.map(String).join(" ")}\n`);
  }
}

// ------------------------------------------------------------- settings ----
const MANAGED = ["AI_PROVIDER", "GROQ_API_KEY", "ANTHROPIC_API_KEY", "AI_BASE_URL", "CALLER_MODEL", "GRADER_MODEL", "CLASS_CODE", "INSTRUCTOR_PASSWORD", "SHARE_ON_NETWORK", "PORT"];
const randomString = (n, alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789") =>
  Array.from(crypto.randomBytes(n), (b) => alphabet[b % alphabet.length]).join("");

function readSettings() {
  const s = {};
  if (!fs.existsSync(SETTINGS_FILE)) return s;
  for (const line of fs.readFileSync(SETTINGS_FILE, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) s[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
  return s;
}

function writeSettings(s) {
  const lines = [
    "# HelpDesk Academy settings. Change these from the app: HelpDesk Academy > Settings.",
    ...MANAGED.filter((k) => s[k] !== undefined && s[k] !== "").map((k) => `${k}="${String(s[k]).replace(/["\r\n]/g, "")}"`),
    "",
  ];
  fs.writeFileSync(SETTINGS_FILE, lines.join("\n"), { mode: 0o600 });
}

function ensureFirstRunSettings() {
  const s = readSettings();
  let changed = false;
  if (!s.INSTRUCTOR_PASSWORD) {
    s.INSTRUCTOR_PASSWORD = randomString(16);
    changed = true;
  }
  if (!s.CLASS_CODE) {
    s.CLASS_CODE = "HD-" + randomString(6, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
    changed = true;
  }
  // The web version uses 3300 (and tunnels like Tailscale Funnel often point
  // there), so the desktop app uses 3310. Version 1.0.0 saved 3300: move it.
  if (!s.PORT || s.PORT === "3300") {
    s.PORT = "3310";
    changed = true;
  }
  if (changed) writeSettings(s);
  return s;
}

const aiConfigured = (s) =>
  (s.AI_PROVIDER === "groq" && s.GROQ_API_KEY) || (s.AI_PROVIDER === "anthropic" && s.ANTHROPIC_API_KEY) || (s.AI_PROVIDER === "openai" && s.AI_BASE_URL);

// --------------------------------------------------------------- server ----
let port = null;
let flushDb = () => {};

function isFree(p, host) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.listen(p, host, () => srv.close(() => resolve(true)));
  });
}

// A port counts as free only if nothing holds it on any address. (Windows can
// let a second program bind 127.0.0.1 while another already listens on all
// addresses, which would silently split traffic between them.)
async function pickPort(preferred) {
  for (let p = preferred; p < preferred + 30; p++) if ((await isFree(p, "0.0.0.0")) && (await isFree(p, "127.0.0.1"))) return p;
  return 0;
}

async function startServer(s) {
  const host = s.SHARE_ON_NETWORK === "1" ? "0.0.0.0" : "127.0.0.1";
  const chosen = await pickPort(Number(s.PORT) || 3310);
  // The settings file is the only source for these. Set them from it on every
  // start: "Save and restart" launches the new copy with this process's
  // environment, and the server's .env loader never overwrites a variable that
  // already exists, so the old key, password or class code would otherwise stick.
  for (const key of MANAGED) {
    if (s[key]) process.env[key] = s[key];
    else delete process.env[key];
  }
  // Runtime values (also environment variables, which win over the file).
  process.env.HDA_ENV_FILE = SETTINGS_FILE;
  process.env.DATA_DIR = DATA_DIR;
  process.env.PORT = String(chosen);
  process.env.HOST = host;
  process.env.HDA_LOCAL_ONLY = s.SHARE_ON_NETWORK === "1" ? "0" : "1";
  process.env.HDA_DESKTOP = "1";
  const mod = await import(pathToFileURL(path.join(ROOT, "server.js")).href);
  port = mod.server.address().port;
  ({ flush: flushDb } = await import(pathToFileURL(path.join(ROOT, "src", "db.js")).href));
  return port;
}

const lanUrls = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => `http://${i.address}:${port}`);

// -------------------------------------------------------------- windows ----
let mainWin = null;
let settingsWin = null;
const appUrl = (p = "/") => `http://127.0.0.1:${port}${p}`;

function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 680,
    title: "HelpDesk Academy",
    icon: ICON,
    show: false,
    backgroundColor: "#0b111c",
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, preload: path.join(HERE, "app-preload.cjs") },
  });
  mainWin.once("ready-to-show", () => mainWin.show());
  // Only the app's own pages load in the window; other links open in the browser.
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWin.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith(appUrl(""))) {
      e.preventDefault();
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
    }
  });
  mainWin.loadURL(appUrl("/"));
  mainWin.on("closed", () => (mainWin = null));
}

function openSettings() {
  if (settingsWin) return settingsWin.focus();
  settingsWin = new BrowserWindow({
    width: 680,
    height: 780,
    parent: mainWin || undefined,
    modal: !!mainWin,
    resizable: true,
    minimizable: false,
    title: "Settings",
    icon: ICON,
    autoHideMenuBar: true,
    backgroundColor: "#0b111c",
    webPreferences: { preload: path.join(HERE, "settings-preload.cjs"), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  settingsWin.removeMenu();
  settingsWin.loadFile(path.join(HERE, "settings.html"));
  settingsWin.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  settingsWin.webContents.on("will-navigate", (e) => e.preventDefault());
  settingsWin.on("closed", () => (settingsWin = null));
}

function showShareInfo() {
  const s = readSettings();
  if (s.SHARE_ON_NETWORK !== "1") {
    dialog.showMessageBox(mainWin, {
      type: "info",
      title: "Let students connect",
      message: "Sharing with other computers is off.",
      detail: "Turn on 'Let students on my network connect' in Settings. Students on the same Wi-Fi can then open this app's address in any web browser.",
      buttons: ["Open Settings", "Close"],
    }).then(({ response }) => response === 0 && openSettings());
    return;
  }
  const urls = lanUrls();
  dialog.showMessageBox(mainWin, {
    type: "info",
    title: "Let students connect",
    message: "Students on your network can open:",
    detail: `${urls.join("\n") || "(no network connection found)"}\n\nClass code: ${s.CLASS_CODE || "(none)"}\nInstructor dashboard: add /instructor to the address.\n\nThis computer must stay on with HelpDesk Academy open.`,
  });
}

function buildMenu() {
  const go = (p) => mainWin && mainWin.loadURL(appUrl(p));
  const template = [
    {
      label: "HelpDesk Academy",
      submenu: [
        { label: "Student practice", accelerator: "CmdOrCtrl+1", click: () => go("/") },
        { label: "Instructor dashboard", accelerator: "CmdOrCtrl+2", click: () => go("/instructor") },
        { type: "separator" },
        { label: "Settings…", accelerator: "CmdOrCtrl+,", click: openSettings },
        { label: "Let students connect…", click: showShareInfo },
        { label: "Open data folder", click: () => shell.openPath(USER_DIR) },
        { type: "separator" },
        { role: "quit", label: "Quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { type: "separator" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { role: "resetZoom" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(app.isPackaged ? [] : [{ role: "toggleDevTools" }]),
      ],
    },
    {
      label: "Help",
      submenu: [
        { label: "Get a free Groq AI key", click: () => shell.openExternal("https://console.groq.com/keys") },
        { label: "Get a Claude AI key", click: () => shell.openExternal("https://console.anthropic.com/") },
        { type: "separator" },
        ...(updatesSupported() ? [{ label: "Check for updates…", click: checkForUpdatesNow }] : []),
        {
          label: "About HelpDesk Academy",
          click: () =>
            dialog.showMessageBox(mainWin, {
              type: "info",
              title: "About",
              message: "HelpDesk Academy",
              detail: `${versionLabel()}\n\nHelp desk training with AI callers.\n\nSettings and data: ${USER_DIR}`,
            }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Which kind of copy this is, shown next to the version (About, Settings) so
// it's easy to tell apart when someone asks for help. Same version number on
// every platform.
function platformLabel() {
  if (process.windowsStore) return "Microsoft Store";
  if (process.platform === "win32") return "Windows";
  if (process.platform === "linux") return process.env.APPIMAGE ? "Linux (AppImage)" : "Linux";
  if (process.platform === "darwin") return "Mac";
  return process.platform;
}
const versionLabel = () => `Version ${app.getVersion()} · ${platformLabel()}${app.isPackaged ? "" : " (from source)"}`;

// ----------------------------------------------------- desktop shortcut ----
// The GitHub installer offers a desktop shortcut on its last page
// (build/installer.nsh). The Microsoft Store can't, so Settings has a
// checkbox for it in both versions.
const APP_ID = "com.helpdeskacademy.app"; // build.appId in package.json
const APPX_APP_ID = "HelpDeskAcademy"; // build.appx.applicationId in package.json
const desktopLink = () => path.join(app.getPath("desktop"), "HelpDesk Academy.lnk");

function shortcutDetails() {
  if (!app.isPackaged) return null; // running from source: nothing installed to point at
  if (process.platform !== "win32") return null; // Linux: the .deb adds a menu entry instead
  const description = "Help desk training with AI callers";
  if (process.windowsStore) {
    const parts = path.basename(path.dirname(path.dirname(process.execPath))).split("_");
    if (parts.length < 5) return null;
    const aumid = `${parts[0]}_${parts.at(-1)}!${APPX_APP_ID}`;
    // Store apps are started through the shell, not by running their .exe directly.
    const explorer = path.join(process.env.SystemRoot || "C:\\Windows", "explorer.exe");
    return { target: explorer, args: `shell:AppsFolder\\${aumid}`, icon: process.execPath, iconIndex: 0, appUserModelId: aumid, description };
  }
  return { target: process.execPath, icon: process.execPath, iconIndex: 0, appUserModelId: APP_ID, description };
}

// ------------------------------------------------------------------ IPC ----
const fromSettingsWindow = (e) => settingsWin && e.sender === settingsWin.webContents;
const hint = (key) => (key ? `${key.slice(0, 4)}…${key.slice(-4)}` : "");

ipcMain.handle("settings:get", async (e) => {
  if (!fromSettingsWindow(e)) return null;
  const s = readSettings();
  let status = null;
  try {
    status = await (await fetch(appUrl("/api/status"))).json();
  } catch {}
  return {
    provider: s.AI_PROVIDER || "",
    groqKeyHint: hint(s.GROQ_API_KEY),
    anthropicKeyHint: hint(s.ANTHROPIC_API_KEY),
    ollamaUrl: s.AI_PROVIDER === "openai" ? s.AI_BASE_URL || "" : "",
    ollamaModel: s.AI_PROVIDER === "openai" ? s.CALLER_MODEL || "" : "",
    classCode: s.CLASS_CODE || "",
    instructorPassword: s.INSTRUCTOR_PASSWORD || "",
    share: s.SHARE_ON_NETWORK === "1",
    lanUrls: s.SHARE_ON_NETWORK === "1" ? lanUrls() : [],
    aiStatus: status ? { mode: status.aiMode, reason: status.aiReason } : null,
    dataDir: USER_DIR,
    shortcut: { available: !!shortcutDetails(), exists: fs.existsSync(desktopLink()) },
    version: versionLabel(),
    platform: process.platform,
  };
});

// Adds or removes the desktop shortcut right away (no restart needed).
ipcMain.handle("settings:shortcut", async (e, on) => {
  if (!fromSettingsWindow(e)) return null;
  const link = desktopLink();
  try {
    if (on) {
      const details = shortcutDetails();
      if (!details) return { ok: false, exists: fs.existsSync(link), message: "Shortcuts can only be made from the installed app." };
      if (!shell.writeShortcutLink(link, fs.existsSync(link) ? "replace" : "create", details)) throw new Error("Windows didn't create it");
    } else {
      fs.rmSync(link, { force: true });
    }
    return { ok: true, exists: fs.existsSync(link) };
  } catch (err) {
    console.warn(`[shortcut] ${err.message}`);
    return { ok: false, exists: fs.existsSync(link), message: `Couldn't change the desktop shortcut (${err.message}).` };
  }
});

// Check a key or local server before saving, so mistakes show up right away.
ipcMain.handle("settings:test", async (e, v) => {
  if (!fromSettingsWindow(e)) return null;
  const saved = readSettings();
  try {
    if (v.provider === "groq") {
      const key = (v.groqKey || saved.GROQ_API_KEY || "").trim();
      if (!key) return { ok: false, message: "Paste your Groq key first." };
      const r = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) });
      return r.ok ? { ok: true, message: "The Groq key works." } : { ok: false, message: r.status === 401 ? "Groq rejected that key. Copy it again from console.groq.com." : `Groq answered with an error (${r.status}).` };
    }
    if (v.provider === "anthropic") {
      const key = (v.anthropicKey || saved.ANTHROPIC_API_KEY || "").trim();
      if (!key) return { ok: false, message: "Paste your Claude key first." };
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      try {
        await new Anthropic({ apiKey: key, maxRetries: 0, timeout: 15000 }).models.list({ limit: 1 });
        return { ok: true, message: "The Claude key works." };
      } catch (err) {
        if (err instanceof Anthropic.AuthenticationError) return { ok: false, message: "Anthropic rejected that key." };
        if (err instanceof Anthropic.APIConnectionError) return { ok: false, message: "Couldn't reach Anthropic. Check the internet connection." };
        return { ok: false, message: `Anthropic answered with an error (${err.status ?? err.message}).` };
      }
    }
    if (v.provider === "openai") {
      const base = (v.ollamaUrl || "http://localhost:11434/v1").replace(/\/+$/, "");
      const r = await fetch(`${base}/models`, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) return { ok: false, message: `The server at ${base} answered with an error (${r.status}).` };
      const ids = ((await r.json()).data || []).map((m) => m.id);
      const model = (v.ollamaModel || "gpt-oss:20b").trim();
      return ids.includes(model)
        ? { ok: true, message: `Connected. The model ${model} is ready.` }
        : { ok: false, message: `Connected, but ${model} isn't downloaded. Available: ${ids.join(", ") || "none"}. In a terminal: ollama pull ${model}` };
    }
    return { ok: false, message: "Choose an AI service first." };
  } catch (err) {
    if (v.provider === "openai") return { ok: false, message: "Couldn't reach Ollama. Is it installed and running? (ollama.com)" };
    return { ok: false, message: `Couldn't connect: ${err.message}` };
  }
});

ipcMain.handle("settings:save", async (e, v) => {
  if (!fromSettingsWindow(e)) return null;
  const s = readSettings();
  const clean = (x) => String(x ?? "").replace(/["\r\n]/g, "").trim();
  s.AI_PROVIDER = ["groq", "anthropic", "openai"].includes(v.provider) ? v.provider : "";
  if (clean(v.groqKey)) s.GROQ_API_KEY = clean(v.groqKey);
  if (clean(v.anthropicKey)) s.ANTHROPIC_API_KEY = clean(v.anthropicKey);
  if (s.AI_PROVIDER === "openai") {
    s.AI_BASE_URL = clean(v.ollamaUrl) || "http://localhost:11434/v1";
    s.CALLER_MODEL = clean(v.ollamaModel) || "gpt-oss:20b";
    s.GRADER_MODEL = s.CALLER_MODEL;
  } else {
    delete s.AI_BASE_URL;
    delete s.CALLER_MODEL;
    delete s.GRADER_MODEL;
  }
  s.CLASS_CODE = clean(v.classCode);
  if (clean(v.instructorPassword).length >= 8) s.INSTRUCTOR_PASSWORD = clean(v.instructorPassword);
  s.SHARE_ON_NETWORK = v.share ? "1" : "0";
  writeSettings(s);
  // The server reads settings at startup, so restart the app to apply them.
  flushDb();
  app.relaunch();
  app.exit(0);
  return { ok: true };
});

ipcMain.on("settings:close", (e) => fromSettingsWindow(e) && settingsWin.close());

// The Settings button in the app's top bar.
ipcMain.on("app:open-settings", (e) => {
  if (mainWin && e.sender === mainWin.webContents && e.sender.getURL().startsWith(appUrl(""))) openSettings();
});

// "Save as PDF" on a ticket's results page: ask where, then print the page to a PDF.
const LETTER_PAPER = new Set(["US", "CA", "MX", "PH", "CL", "CO", "VE"]);
ipcMain.handle("app:save-pdf", async (e, fileName) => {
  if (!mainWin || e.sender !== mainWin.webContents || !e.sender.getURL().startsWith(appUrl(""))) return null;
  const base = String(fileName).replace(/[\\/:*?"<>|\r\n\t]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 150) || "HelpDesk Academy report";
  const { canceled, filePath } = await dialog.showSaveDialog(mainWin, {
    title: "Save report as PDF",
    defaultPath: path.join(app.getPath("documents"), base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`),
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (canceled || !filePath) return { ok: false, canceled: true };
  try {
    const pdf = await e.sender.printToPDF({ printBackground: true, pageSize: LETTER_PAPER.has(app.getLocaleCountryCode()) ? "Letter" : "A4" });
    fs.writeFileSync(filePath, pdf);
    return { ok: true, path: filePath };
  } catch (err) {
    console.warn(`[pdf] ${err.message}`);
    return { ok: false, message: err.message };
  }
});
ipcMain.on("open-external", (e, url) => {
  const allowed = ["https://console.groq.com/", "https://console.anthropic.com/", "https://ollama.com/"];
  if (fromSettingsWindow(e) && allowed.some((a) => String(url).startsWith(a))) shell.openExternal(url);
});

// ---------------------------------------------------------------- start ----
app.on("second-instance", () => {
  if (mainWin) {
    if (mainWin.isMinimized()) mainWin.restore();
    mainWin.focus();
  }
});
app.on("window-all-closed", () => app.quit());
app.on("will-quit", () => flushDb());

app.whenReady().then(async () => {
  const s = ensureFirstRunSettings();
  try {
    await startServer(s);
  } catch (err) {
    dialog.showErrorBox("HelpDesk Academy couldn't start", `${err.message}\n\nDetails are in ${path.join(USER_DIR, "app.log")}`);
    app.exit(1);
    return;
  }
  buildMenu();
  createMainWindow();
  if (!aiConfigured(s)) mainWin.once("ready-to-show", () => setTimeout(openSettings, 400));
  setupAutoUpdates({ getWindow: () => mainWin, beforeInstall: () => flushDb() });
});
