import { Agent } from "https";
import { platform } from "os";
import { app, BrowserWindow, dialog, ipcMain as ipc } from "electron";

import axios from "axios";
import LCUConnector from "lcu-connector";
import * as electron from "electron";
import { removeAllListeners } from "cluster";

const IS_WIN = platform() === "win32";
const IS_DEV: boolean = require.main.filename.indexOf("app.asar") === -1;
const ROOT = `${__dirname}/app`;

const connector = new LCUConnector();

const agent: Agent = new Agent({
  rejectUnauthorized: false,
});

let mainWindow: BrowserWindow | null = null;
let windowLoaded = false;
let LCUData: Record<string, string | number> | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    center: true,
    height: 720,
    minHeight: 720,
    show: IS_DEV,
    width: 1280,
    minWidth: 1280,
    frame: false,
    title: "Rift Explorer",
    backgroundColor: "#303030",

    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  });

  if (IS_DEV) mainWindow.webContents.openDevTools({ mode: "detach" });

  // Remove default menu
  mainWindow.setMenu(null);

  mainWindow
    .loadURL(IS_DEV ? "http://localhost:3000" : `file://${ROOT}/index.html`)
    .catch(console.error);

  // Avoid white page on load.
  mainWindow.webContents.on("did-finish-load", () => {
    windowLoaded = true;
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  ipc.on("FEREADY", () => {
    mainWindow?.webContents.send("BEPRELOAD", LCUData ? LCUData : "");
    ipc.removeAllListeners("FEREADY");
  });

  connector.on("connect", async (data) => {
    let swaggerEnabled = false;

    mainWindow?.webContents.send("LCUCONNECT", swaggerEnabled ? LCUData : {});

    // During multiple restarts of the client the backend server is not instantly
    // ready to serve requests so we delay a bit
    setTimeout(async () => {
      LCUData = data;

      const { username, password, address, port } = LCUData;

      axios
        .get(
          `https://${username}:${password}@${address}:${port}/swagger/v2/swagger.json`,
          { httpsAgent: agent }
        )
        .then(() => {
          swaggerEnabled = true;
        })
        .catch(console.error);

      try {
        if (swaggerEnabled) {
          mainWindow?.webContents.send("LCUCONNECT", LCUData ? LCUData : {});
        }

        ipc.on("PROMPTRESTART", () => {
          // TODO: For morilli to fix util.ts
          // await duplicateSystemYaml();

          // TODO: For morilli to fix util.ts
          // await restartLCUWithOverride(LCUData);

          swaggerEnabled = true;
        });
      } catch (error) {
        console.error(error);
        // No error handling for now
      }
    }, 5000);
  });

  connector.on("disconnect", () => {
    LCUData = null;

    if (windowLoaded) {
      mainWindow?.webContents.send("LCUDISCONNECT");
    }
  });

  ipc.on("program_close", () => {
    mainWindow.close();
  });

  ipc.on("process_minmax", () => {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  });

  ipc.on("process_fullscreen", () => {
    mainWindow.isFullScreen()
      ? mainWindow.setFullScreen(false)
      : mainWindow.setFullScreen(true);
  });

  ipc.on("process_min", () => {
    mainWindow.minimize();
  });

  connector.start();
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (platform() !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (IS_WIN === null) {
    createWindow();
  }
});
