import { app, BrowserWindow, globalShortcut, ipcMain } from "electron";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./handlers";


createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
	? path.join(process.env.APP_ROOT, "public")
	: RENDERER_DIST;


let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      allowRunningInsecureContent: true,
      preload: path.join(__dirname, "preload.mjs"),
      sandbox: false
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
  
  ipcMain.on("toggle-fullscreen", () => {
    const isFullScreen = win?.isFullScreen();
    win?.setFullScreen(!isFullScreen);
    win?.setMenuBarVisibility(!win?.isFullScreen());
  });

  globalShortcut.register("F11", () => {
    const isFullScreen = win?.isFullScreen();
    win?.setFullScreen(!isFullScreen);
    win?.setMenuBarVisibility(!win?.isFullScreen());
  });

  globalShortcut.register("ESC", () => {
    const isFullScreen = win?.isFullScreen();
    win?.setFullScreen(!isFullScreen);
    win?.setMenuBarVisibility(!win?.isFullScreen());
  });
  globalShortcut.register("CTRL+ALT+F12", () => {
    win?.webContents.toggleDevTools();
  });
  
}


app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("ready", createWindow);

