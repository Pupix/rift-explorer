import { Agent } from "https";
import { platform } from "os";
import { app, BrowserWindow, ipcMain as ipc } from "electron";
import { modifySystemYaml, deleteUserSession } from "./util";
import * as path from "path";
import axios from "axios";
import RiotConnector from "./util/RiotConnector";
import help from "./util/createSpec";
app.commandLine.appendSwitch("ignore-certificate-errors", "true");
/**
 * Check if is windows other wise assume is macOS since that is the
 * only other supported OS.
 */
const IS_WIN = platform() === "win32";
/**
 * Check if in development build.
 */
const IS_DEV: boolean = require.main.filename.indexOf("app.asar") === -1;

/**
 * Root dir of app.
 */
const ROOT = `${__dirname}/app`;

/**
 * New instance of the riot connector.
 */
const riotconnector = new RiotConnector();

/**
 * Simple axios instance with disabled SSL to allow the self signed cert.
 */
const instance = axios.create({
  httpsAgent: new Agent({
    rejectUnauthorized: false,
  }),
});

let mainWindow: BrowserWindow | null = null;
let windowLoaded = false;

let LCUData: any = null;
let swaggerJson: any;
let swaggerEnabled = false;

let requestedHelp: boolean = false;
/**
 * Create electron window.
 */
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
      scrollBounce: true,
      devTools: IS_DEV,
    },
  });

  /**
   * If in dev then open devtools in a detached window.
   */
  if (IS_DEV) mainWindow.webContents.openDevTools({ mode: "detach" });

  /**
   * Remove default menu.
   */
  mainWindow.setMenu(null);

  /**
   * If in dev then since we use react it will spin up a dev server which runs on
   * localhost:3000 but if we're not in dev then just use the build location.
   */
  mainWindow
    .loadURL(IS_DEV ? "http://localhost:3000" : `file://${ROOT}/index.html`)
    .catch(console.error);

  /**
   * Only show the window when the page has fully loaded.
   */
  mainWindow.webContents.on("did-finish-load", () => {
    windowLoaded = true;
    mainWindow?.show();
    riotconnector.start();
  });

  /**
   * Just closing the window.
   */
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  /**
   * When the frontend fires the ready event send any data already at hand
   * or just send an empty string.
   */
  ipc.on("FEREADY", () => {
    if (LCUData) {
      mainWindow?.webContents.send("credentials_pass", LCUData);
    }
    mainWindow?.webContents.send("BEPRELOAD", swaggerJson ? swaggerJson : "");
  });

  /**
   * If the user accepts the restart prompt then delete the users session.
   */
  ipc.on("PROMPTRESTART", () => {
    deleteUserSession(LCUData).catch(console.error);
  });

  /**
   * If the user declines the prompt just fallback to /help which is less accurate but still gives
   * us some documentation just not the same amount.
   */
  ipc.on("PROMPTHELP", async () => {
    if (LCUData != "" || LCUData != null || LCUData != {}) {
      const { username, password, port, protocol, address } = LCUData;
      mainWindow?.webContents.send(
        "LCUCONNECT",
        await help({ username, password, port, protocol, address })
      );
    } else {
      console.error("NO CREDENTIALS FOUND");
    }

    requestedHelp = true;
  });

  /**
   * When connected to the Riot Client start modification of the League clients
   * system.yml to enable swagger and to end the users current session.
   */
  riotconnector.on("riotclient", (leaguePath: any) => {
    if (!leaguePath) return;

    console.log(`Riotclient is open; corresponding league path: ${leaguePath}`);
    const systemYamlPath = path.join(leaguePath, "system.yaml");

    modifySystemYaml(systemYamlPath).catch(console.error);
  });

  /**
   * When the league client connects check if swagger is already enabled if it is just send the
   * swagger json to the frontend to be generated, If not then prompt the user for permission
   * to end the users current league client session so that we can modify the system yaml.
   */
  riotconnector.on("leagueclient", async (data) => {
    console.log("initial lcu connect");
    LCUData = await data;
    if (platform() === "linux") {
      const { username, password, port, protocol, address } = LCUData;

      mainWindow?.webContents.send("credentials_pass", LCUData);

      help({ username, password, port, protocol, address }).then((res) => {
        mainWindow?.webContents.send("LCUCONNECT", res);
      });

      return;
    }
    if (requestedHelp) {
      help(data)
        .then((res) => {
          swaggerJson = res;
          mainWindow?.webContents.send("LCUCONNECT", res);
        })
        .catch(console.error);
      return;
    }

    const { username, password, address, port } = LCUData;

    /**
     * During the initial load of the client the backend server is not instantly ready
     * to serve requests so we check the connection first
     */
    let serverReady = false;
    let retries = 6; // reasonable amount of retries
    while (!serverReady && retries > 0) {
      await instance
        .get(`https://${username}:${password}@${address}:${port}/`)
        .catch((res) => {
          if (res.errno !== "ECONNREFUSED") {
            serverReady = true;
          } else {
            retries--;
          }
        });
    }

    await instance
      .get(
        `https://${username}:${password}@${address}:${port}/swagger/v2/swagger.json`
      )
      .then((res) => {
        swaggerJson = res.data;
        swaggerEnabled = true;
      })
      .catch(() => {
        console.log("Swagger request failed; assuming swagger is not enabled.");
      });

    /**
     * If swagger is enabled send the swagger json to the fe for generation
     * otherwise just prompt the user to allow us to end the users session.
     */
    if (swaggerEnabled) {
      console.log("lcuswaggeren");
      mainWindow?.webContents.send("LCUCONNECT", swaggerJson);
    } else {
      console.log("lcuswaggerdis");
      mainWindow?.webContents.send("BELCUREQUESTGETRESTARTLCU");
    }
  });

  /**
   * If the Riot connector disconnects just remove the old lcu data since it will most likely
   * be different the next time the lcu is brought back on.
   */
  riotconnector.on("disconnect", () => {
    LCUData = null;
    swaggerEnabled = false;

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
