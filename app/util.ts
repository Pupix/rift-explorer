import { exec } from "child_process";
import * as path from "path";
import { normalize } from "path";
import { outputFile, pathExists, readFile } from "fs-extra";
import axios from "axios";
import { Agent } from "https";
import yaml, { Document } from "yaml";
import { platform } from "os";
const EventEmitter = require('events');

const IS_WIN: boolean = platform() === "win32";
const LEAGUE_PROCESS: string = IS_WIN ? "LeagueClient.exe" : "LeagueClient";
const RIOTCLIENT_PROCESS: string = IS_WIN ? "RiotClientServices.exe" : "RiotClientServices";

const instance = axios.create({
  httpsAgent: new Agent({
    rejectUnauthorized: false
  })
});

export class RiotConnector extends EventEmitter {
  constructor() {
    super();

    console.log("inited ritocon");
  }

  _checkRitoClient() {
    const command = IS_WIN
      ? `WMIC PROCESS WHERE name='${RIOTCLIENT_PROCESS}' GET CommandLine`
      : `ps x -o comm= | grep '${RIOTCLIENT_PROCESS}$'`;

    exec(command, (error, stdout, stderr) => {
      if (error || !stdout || stderr) {
        return;
      }

      let normalizedPath = normalize(stdout);
      if (IS_WIN)
        normalizedPath = normalizedPath.split(/\n|\n\r/)[1];
      const match = normalizedPath.match("\"--priority-launch-path=(.*?)\"") || [];

      this.emit("ritoclient", match[1]);
    });
  };

  start() {
    this._ritoClientWatch = setInterval(this._checkRitoClient.bind(this), 1000);
  }

  stop() {
    clearInterval(this._ritoClientWatch);
  }
}

function getLCUExecutableFromProcess(): Promise<void | string> {
  return new Promise((resolve, reject): void => {
    const command = IS_WIN
      ? `WMIC PROCESS WHERE name='${LEAGUE_PROCESS}' GET ExecutablePath`
      : `ps x -o comm= | grep '${LEAGUE_PROCESS}$'`;

    exec(command, (error, stdout, stderr) => {
      if (error || !stdout || stderr) {
        reject(error || stderr);
        return;
      }

      const normalizedPath = normalize(stdout);
      resolve(IS_WIN ? normalizedPath.split(/\n|\n\r/)[1] : normalizedPath);
    });
  });
}

export async function modifySystemYaml(path: string): Promise<void> {
  // File doesn't exist, do nothing
  if (!(await pathExists(path))) {
    throw new Error("system.yaml not found");
  }

  const file: string = await readFile(path, "utf8");
  const fileParsed: Document.Parsed = yaml.parseDocument(file);

  fileParsed.set("enable_swagger", true);

  const stringifiedFile: string = yaml.stringify(fileParsed);
  // Rito's file is prefixed with --- newline
  await outputFile(path, `---\n${stringifiedFile}`);
}

export function restartLCU(LCUData: Record<string, string | number> | null): Promise<void> {
  return new Promise(
    async (): Promise<void> => {
      const LCUExePath: string | void = await getLCUExecutableFromProcess();
      let LCUDir: string;

      if (typeof LCUExePath === "string") {
        LCUDir = IS_WIN
          ? path.dirname(LCUExePath)
          : `${path.dirname(LCUExePath)}/../../..`;
      } else {
        throw new Error("LCU dir not found");
      }

      const { username, password, address, port } = LCUData;

      await instance.delete(`https://${username}:${password}@${address}:${port}/lol-rso-auth/v1/session`);;;;;;;;;;;;;;;;;;;;;;;;
    }
  );
}
