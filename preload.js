const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),
  getLoginItem: () => ipcRenderer.invoke("get-login-item"),
  setLoginItem: (enable) => ipcRenderer.invoke("set-login-item", enable)
});
