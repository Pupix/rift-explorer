import path from "path";
import { EventEmitter } from "events";
import { exec } from "child_process";
import { normalize } from "path";
import { readFileSync } from "fs-extra";
import { FSWatcher, watch } from "chokidar";
import { parseDocument } from "yaml";
import { platform } from "os";
import { parse } from "./LockFileParser";

interface LockFile {
  username: string;
  password: string;
  port: number;
  protocol: string;
  PID: number;
  processName: string;
  address: string;
}

/**
 * Check if is windows other wise assume is macOS since that is the
 * only other supported OS.
 */
const IS_WIN: boolean = platform() === "win32";

/**
 * Name of running executable depending on if system is Windows or macOS.
 */
const RIOTCLIENT_PROCESS: string = IS_WIN
  ? "RiotClientServices.exe"
  : "RiotClientServices";

/**
 * Connector which allows us to check for the league and riot client.
 * @since 7.0.0
 */
export default class RiotConnector extends EventEmitter {
  leaguePath: string = "";
  _riotClientWatch: NodeJS.Timeout;
  _leagueClientWatch: NodeJS.Timeout;
  _lockfileWatch: FSWatcher;

  /**
   * Connector which allows us to check for the league and riot client.
   * @since 7.0.0
   */
  constructor() {
    super();
  }

  _checkRiotClient() {
    /**
     * Get command based on platform.
     */
    const command: string = IS_WIN
      ? `WMIC PROCESS WHERE name='${RIOTCLIENT_PROCESS}' GET CommandLine`
      : `ps x -o comm= | grep '${RIOTCLIENT_PROCESS}$'`;

    /**
     * Execute the command
     */
    exec(command, (error, stdout, stderr) => {
      if (error || !stdout || stderr) {
        return;
      }

      /**
       * Get string return and normalize it for processing.
       */
      let normalizedPath: string = normalize(stdout);

      /**
       * If Windows we need to slightly adjust.
       */
      if (IS_WIN) normalizedPath = normalizedPath.split(/\n|\n\r/)[1];

      const match: RegExpMatchArray = normalizedPath.match(
        '"--priority-launch-path=(.*?)"'
      );

      /**
       * Check if there are any matches
       */
      if (!match) {
        let product: string = normalizedPath.match(
          '--launch-product=(.*?)[ $"]'
        )[1];

        let patchline: string = normalizedPath.match(
          '--launch-patchline=(.*?)[ $"]'
        )[1];

        this.leaguePath = parseDocument(
          readFileSync(
            path.join(
              process.env.ProgramData,
              "Riot Games",
              "MetaData",
              `${product}.${patchline}`,
              `${product}.${patchline}.product_settings.yaml`
            )
          ).toString()
        ).get("product_install_full_path");
      } else {
        this.leaguePath = path.dirname(match[1]);
      }
      this.emit("riotclient", this.leaguePath);
    });
  }

  _checkLeagueClient() {
    /**
     * Riot client isn't open, therefore we don't have the leaguePath.
     */
    if (!this.leaguePath) return;
    clearInterval(this._leagueClientWatch);

    /**
     * Return if we are already watching the lockfile (= path hasn't changed).
     */
    if (
      this._lockfileWatch &&
      this._lockfileWatch.getWatched()[this.leaguePath]
    )
      return;

    this._lockfileWatch?.close();
    console.log(`Current detected leaguePath: ${this.leaguePath}`);
    console.log(
      `will start watching ${path.join(this.leaguePath, "lockfile")}`
    );

    this._lockfileWatch = watch(path.join(this.leaguePath, "lockfile"));
    this._lockfileWatch.on("add", this._lockfileCreated.bind(this));
    this._lockfileWatch.on("change", this._lockfileCreated.bind(this));
    this._lockfileWatch.on("unlink", this._lockfileRemoved.bind(this));
  }

  /**
   * If the lockfile has been created then parse it and stop watching for it.
   * @param path
   */
  _lockfileCreated(path: string) {
    parse(path).then((data) => {
      this.emit("leagueclient", data);
      clearInterval(this._riotClientWatch);
      console.log("clearing rito interval");
    });
  }

  /**
   * If the lockfile has been removed then close the watcher.
   */
  _lockfileRemoved() {
    this.emit("disconnect");
    this._lockfileWatch.close();
    this.start();
  }

  /**
   * Start the watchers.
   */
  start() {
    this._riotClientWatch = setInterval(this._checkRiotClient.bind(this), 1000);
    this._leagueClientWatch = setInterval(
      this._checkLeagueClient.bind(this),
      1000
    );
  }

  /**
   * Stop and close the watchers.
   */
  stop() {
    clearInterval(this._riotClientWatch);
    clearInterval(this._leagueClientWatch);
    this._lockfileWatch?.close();
  }
}
