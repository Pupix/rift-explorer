import { Agent } from "https";
import { platform } from "os";

import { app, BrowserWindow, dialog } from "electron";

import axios from "axios";
import LCUConnector from "lcu-connector";

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
    frame: IS_DEV,
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

    if (!LCUData) {
      return;
    }

    mainWindow?.webContents.send("READY", LCUData ? LCUData : {});
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
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

        // TODO: For morilli to fix util.ts
        // await duplicateSystemYaml();

        // TODO: replace with react dialog
        const response: number = dialog.showMessageBoxSync({
          type: "info",
          buttons: ["Cancel", "Ok"],
          title: "Rift Explorer",
          message:
            "In order for Rift Explorer to work it needs to log you out. \nOnce it logs you out please press ok on the League of Legends client.",
          cancelId: 0,
          noLink: true,
        });

        if (!response) {
          mainWindow?.close();
          return;
        }
        // TODO: For morilli to fix util.ts
        // await restartLCUWithOverride(LCUData);

        swaggerEnabled = true;
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
