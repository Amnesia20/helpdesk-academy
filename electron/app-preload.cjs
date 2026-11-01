// The main window's only bridge to the app: save a ticket report as a PDF, and
// open Settings from the top bar. Nothing else (no file or system access).
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hdaDesktop", {
  savePdf: (fileName) => ipcRenderer.invoke("app:save-pdf", String(fileName || "")),
  openSettings: () => ipcRenderer.send("app:open-settings"),
});
