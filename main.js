const { app, Menu, Tray, BrowserWindow, Notification, ipcMain } = require("electron");
const { exec } = require("child_process");
const path = require("path");
const Store = require("electron-store").default;
const notifier = require("node-notifier");

const store = new Store({
  defaults: {
    lowThreshold: 22,
    highThreshold: 78
  }
});

let tray = null;
let settingsWindow = null;
let interval;

app.whenReady().then(() => {
  createTray();
  startBatteryCheck();

  app.on("window-all-closed", (e) => e.preventDefault()); // keep running in background
});

function createTray() {
  tray = new Tray(path.join(__dirname, "iconTemplate.png"));
  const contextMenu = Menu.buildFromTemplate([
    { label: "Settings", click: openSettings },
    { label: "Quit", click: () => app.quit() }
  ]);
  tray.setToolTip("Battery Alert App");
  tray.setContextMenu(contextMenu);
}

function openSettings() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    },
    resizable: false
  });

  settingsWindow.loadFile("settings.html");

  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
}

function startBatteryCheck() {
  interval = setInterval(checkBattery, 15000);
}

function checkBattery() {
  exec("pmset -g batt", (err, stdout) => {
    if (err) {
      console.error("Error getting battery info:", err);
      return;
    }

    const match = stdout.match(/(\d+)%/);
    const level = match ? parseInt(match[1], 10) : null;
    const charging = stdout.includes("AC Power");

    if (level !== null) {
      const lowThreshold = store.get("lowThreshold");
      const highThreshold = store.get("highThreshold");

      if (level < lowThreshold && !charging) {
        triggerAlert("⚠️ Battery Low", `Battery below ${lowThreshold}%. Connect charger!`);
      } else if (level > highThreshold && charging) {
        triggerAlert("⚠️ Battery High", `Battery above ${highThreshold}%. Unplug charger!`);
      }
    }
  });
}

function triggerAlert(title, message) {
  new Notification({ title, body: message }).show();

  notifier.notify({
    title,
    message,
    sound: true,
    wait: false
  });
}

// ---------------- IPC Handlers ----------------

ipcMain.handle("get-settings", () => {
  return {
    lowThreshold: store.get("lowThreshold"),
    highThreshold: store.get("highThreshold")
  };
});

ipcMain.handle("save-settings", (event, { low, high }) => {
  store.set("lowThreshold", low);
  store.set("highThreshold", high);
});

ipcMain.handle("get-login-item", () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle("set-login-item", (event, enable) => {
  app.setLoginItemSettings({
    openAtLogin: enable
  });
});
