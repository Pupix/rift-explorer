import { Agent } from "https";
import { platform } from "os";
import { app, BrowserWindow, ipcMain as ipc } from "electron";

import axios from "axios";
import * as path from "path";

const instance = axios.create({
  httpsAgent: new Agent({
    rejectUnauthorized: false
  })
});

import { RiotConnector, modifySystemYaml, restartLCU } from "./util";

const IS_WIN = platform() === "win32";
const IS_DEV: boolean = require.main.filename.indexOf("app.asar") === -1;
const ROOT = `${__dirname}/app`;

const riotconnector = new RiotConnector();
let swaggerJson: any;

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
    mainWindow?.webContents.send("BEPRELOAD", swaggerJson ? swaggerJson : "");
    ipc.removeAllListeners("FEREADY");
  });

  riotconnector.on("ritoclient", (leaguePath: string | undefined) => {
    if (!leaguePath)
      return;

    console.log("Got here!");
    console.log(leaguePath);
    const systemYamlPath = path.join(leaguePath, "system.yaml");

    modifySystemYaml(systemYamlPath);
  });

  riotconnector.on("leagueclient", async (data) => {
    console.log("initial lcu connect");
    let swaggerEnabled = false;

    // During multiple restarts of the client the backend server is not instantly
    // ready to serve requests so we delay a bit
    setTimeout(async () => {
      LCUData = data;

      const { username, password, address, port } = LCUData;

      await instance
        .get(
          `https://${username}:${password}@${address}:${port}/swagger/v2/swagger.json`,
          { httpsAgent: agent }
        )
        .then((res) => {
          swaggerJson = res.data;
          swaggerEnabled = true;
        })
        .catch(() => {console.log("Swagger request failed; assuming swagger is not enabled.")});

      // console.log(swaggerEnabled);
      if (swaggerEnabled) {
        mainWindow?.webContents.send("LCUCONNECT", swaggerJson);
      } else {
        mainWindow?.webContents.send("BELCUREQUESTGETRESTARTLCU");
      }

    }, 5000);
  });

  ipc.on("PROMPTRESTART", () => {
    restartLCU(LCUData)
    .catch(console.error);
  });

  riotconnector.on("disconnect", () => {
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

  riotconnector.start();
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
