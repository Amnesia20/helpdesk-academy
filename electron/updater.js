// Automatic updates for the GitHub downloads. (The Microsoft Store updates its
// own copy, and running from source has nothing to update.)
//
// A little after start, and twice a day while open, the app looks for a newer
// release on GitHub (latest.yml for Windows, latest-linux.yml for the AppImage,
// both uploaded with each release) and downloads it in the
// background. Then it offers "Restart now" or "Later"; with Later, the update
// installs the next time the app closes, so a class in progress isn't cut off.
import { app, dialog } from "electron";
import updaterPkg from "electron-updater";

let autoUpdater = null; // created only in the GitHub build (see setupAutoUpdates)

// The Windows installer from GitHub, and the Linux AppImage (it can replace its
// own file). The .deb and the Store version update through their own channels.
export const updatesSupported = () =>
  app.isPackaged && ((process.platform === "win32" && !process.windowsStore) || (process.platform === "linux" && !!process.env.APPIMAGE));

let state = "idle"; // idle | checking | downloading | ready
let readyVersion = null;
let manual = false; // the user chose "Check for updates…", so report the result
let getWindow = () => null;
let beforeInstall = () => {};

function show(options) {
  const win = getWindow();
  const opts = { type: "info", buttons: ["OK"], noLink: true, ...options };
  return win ? dialog.showMessageBox(win, opts) : dialog.showMessageBox(opts);
}

async function offerRestart() {
  const { response } = await show({
    title: "Update ready",
    message: `HelpDesk Academy ${readyVersion} is ready to install.`,
    detail:
      "Restart now to update. Your settings and student progress are kept.\n\n" +
      "If students are connected, choose Later: the update installs the next time you close HelpDesk Academy.",
    buttons: ["Restart now", "Later"],
    defaultId: 0,
    cancelId: 1,
  });
  if (response === 0) {
    beforeInstall();
    autoUpdater.quitAndInstall(true, true); // silent install, then start the new version
  }
}

function check() {
  if (state !== "idle") return;
  state = "checking";
  // Problems (offline, GitHub busy) also arrive as an "error" event, handled below.
  autoUpdater.checkForUpdates().catch(() => {});
}

export function setupAutoUpdates(options) {
  if (!updatesSupported()) return;
  ({ getWindow, beforeInstall } = options);
  autoUpdater = updaterPkg.autoUpdater;
  autoUpdater.logger = {
    info: (m) => console.log(`[update] ${m}`),
    warn: (m) => console.warn(`[update] ${m}`),
    error: (m) => console.warn(`[update] ${m}`),
    debug: () => {},
  };
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.disableWebInstaller = true; // the app ships as one full installer

  autoUpdater.on("update-available", (info) => {
    state = "downloading";
    if (manual) show({ title: "Update found", message: `Downloading HelpDesk Academy ${info.version}.`, detail: "You'll be asked to restart when it's ready." });
    manual = false;
  });
  autoUpdater.on("update-not-available", () => {
    state = "idle";
    if (manual) show({ title: "No updates", message: "You have the newest version.", detail: `HelpDesk Academy ${app.getVersion()}` });
    manual = false;
  });
  autoUpdater.on("error", (err) => {
    console.warn(`[update] ${err?.message || err}`);
    state = "idle";
    if (manual) show({ type: "warning", title: "Couldn't check for updates", message: "Couldn't reach GitHub to check for updates.", detail: "Check the internet connection and try again later." });
    manual = false;
  });
  autoUpdater.on("update-downloaded", (info) => {
    state = "ready";
    readyVersion = info.version;
    manual = false;
    offerRestart();
  });

  setTimeout(check, 10_000);
  setInterval(check, 12 * 3600_000);
}

// Menu: Help > Check for updates…
export function checkForUpdatesNow() {
  if (!autoUpdater) return;
  if (state === "ready") return offerRestart();
  if (state === "downloading") return show({ title: "Update downloading", message: "A new version is downloading.", detail: "You'll be asked to restart when it's ready." });
  manual = true;
  check();
}
