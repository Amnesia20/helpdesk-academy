// The only bridge between the Settings page and the app. It exposes these few
// calls, nothing else (no file or system access).
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hda", {
  get: () => ipcRenderer.invoke("settings:get"),
  test: (values) => ipcRenderer.invoke("settings:test", values),
  save: (values) => ipcRenderer.invoke("settings:save", values),
  shortcut: (on) => ipcRenderer.invoke("settings:shortcut", on),
  close: () => ipcRenderer.send("settings:close"),
  openExternal: (url) => ipcRenderer.send("open-external", url),
});
