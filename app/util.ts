import { exec } from "child_process";
import * as path from "path";
import { normalize } from "path";
import { outputFile, pathExists, readFile, readFileSync } from "fs-extra";
import axios from "axios";
import { Agent } from "https";
import yaml, { Document } from "yaml";
import { platform } from "os";
import { EventEmitter } from "events";
import LockfileParser from "lol-lockfile-parser";
import chokidar from "chokidar";

const lockfileParser = new LockfileParser();

const IS_WIN: boolean = platform() === "win32";
const RIOTCLIENT_PROCESS: string = IS_WIN ? "RiotClientServices.exe" : "RiotClientServices";

const instance = axios.create({
  httpsAgent: new Agent({
    rejectUnauthorized: false
  })
});

export class RiotConnector extends EventEmitter {
  leaguePath: string = "";
  _ritoClientWatch: NodeJS.Timeout;
  _leagueClientWatch: NodeJS.Timeout;
  _lockfileWatch: chokidar.FSWatcher;

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
      let match = normalizedPath.match("\"--priority-launch-path=(.*?)\"");
      // console.log(match);
      // console.log(!!match);
      if (!match) {
        let product = normalizedPath.match("--launch-product=(.*?)[ $\"]")[1];
        let patchline = normalizedPath.match("--launch-patchline=(.*?)[ $\"]")[1];
        this.leaguePath = yaml.parseDocument(readFileSync(path.join(process.env.ProgramData, "Riot Games", "MetaData", `${product}.${patchline}`, `${product}.${patchline}.product_settings.yaml`)).toString()).get("product_install_full_path")
      } else {
        this.leaguePath = path.dirname(match[1]);
      }
      this.emit("ritoclient", this.leaguePath);
    });
  };

  _checkLeagueClient() {
    // riot client isn't open, therefor we don't have the leaguePath
    if (!this.leaguePath) return;
    clearInterval(this._leagueClientWatch);

    // return if we are already watching the lockfile (= path hasn't changed)
    if (this._lockfileWatch && this._lockfileWatch.getWatched()[this.leaguePath]) return;

    this._lockfileWatch?.close();
    console.log(`Current detected leaguePath: ${this.leaguePath}`);
    console.log(`will start watching ${path.join(this.leaguePath, "lockfile")}`);

    this._lockfileWatch = chokidar.watch(path.join(this.leaguePath, "lockfile"));
    this._lockfileWatch.on("add", this._lockfileCreated.bind(this));
    this._lockfileWatch.on("change", this._lockfileCreated.bind(this));
    this._lockfileWatch.on("unlink", this._lockfileRemoved.bind(this));
  }

  _lockfileCreated(path) {
    lockfileParser.read(path)
    .then(data => {
      const result = {
          protocol: data.protocol,
          address: '127.0.0.1',
          port: data.port,
          username: 'riot',
          password: data.password
      };

      this.emit("leagueclient", result);
      clearInterval(this._ritoClientWatch);
      console.log("clearing rito interval");
    });
  }

  _lockfileRemoved() {
    this.emit("disconnect");
    this._lockfileWatch.close();
    this.start();
  }

  start() {
    this._ritoClientWatch = setInterval(this._checkRitoClient.bind(this), 1000);
    this._leagueClientWatch = setInterval(this._checkLeagueClient.bind(this), 1000);
  }

  stop() {
    clearInterval(this._ritoClientWatch);
    clearInterval(this._leagueClientWatch);
    this._lockfileWatch?.close();
  }
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

export async function restartLCU(LCUData: Record<string, string | number> | null) {
  const { username, password, address, port } = LCUData;

  await instance.delete(`https://${username}:${password}@${address}:${port}/lol-rso-auth/v1/session`);
}
