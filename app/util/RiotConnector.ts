import path from "path";
import { EventEmitter } from "events";
import { exec } from "child_process";
import { normalize, join } from "path";
import { readFileSync } from "fs-extra";
import { FSWatcher, watch } from "chokidar";
import { parseDocument } from "yaml";
import { platform } from "os";
import { parse } from "./LockFileParser";
import { homedir } from "os";

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
    if (platform() === "linux") {
      this._lockfileCreated(
        join(
          homedir(),
          "./Games/league-of-legends/drive_c/Riot Games/League of Legends/lockfile"
        )
      );
      return;
    }
    /**
     * Get command based on platform.
     */
    const command: string = IS_WIN
      ? `WMIC PROCESS WHERE name='${RIOTCLIENT_PROCESS}' GET CommandLine`
      : `ps x -o command= | grep '${RIOTCLIENT_PROCESS}'`;

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
          platform() !== "darwin"
            ? '--launch-product=(.*?)[ $"]'
            : '--upgrade-product=(.*?)[ $"\n]'
        )[1];
        let patchline: string = normalizedPath.match(
          platform() !== "darwin"
            ? '--launch-patchline=(.*?)[ $"]'
            : '--upgrade-patchline=(.*?)[ $"\n]'
        )[1];

        /**
         * There is no ProgramData folder on MacOS
         */
        let programData = process.env.ProgramData;
        if (platform() === "darwin") programData = "/Users/Shared";

        this.leaguePath = parseDocument(
          readFileSync(
            path.join(
              programData,
              "Riot Games",
              "MetaData",
              `${product}.${patchline}`,
              `${product}.${patchline}.product_settings.yaml`
            )
          ).toString()
        ).get("product_install_full_path");

        if (platform() === "darwin")
          this.leaguePath = path.join(this.leaguePath, "Contents", "LoL");
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

    /**
     * Return if we are already watching the lockfile (= path hasn't changed).
     */
    if (
      this._lockfileWatch &&
      this._lockfileWatch.getWatched()[this.leaguePath]
    )
      return;

    this._lockfileWatch?.close();
    console.log(
      `Will start watching ${path.join(this.leaguePath, "lockfile")}`
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
      console.log(
        "Lockfile information sent; clearing riotclient check interval"
      );
    });
  }

  /**
   * If the lockfile has been removed then close the watcher.
   */
  _lockfileRemoved() {
    this.emit("disconnect");
    this._lockfileWatch.close();
    console.log("Lost connection to leagueclient; restarting riotclient watch");
    this._riotClientWatch = setInterval(this._checkRiotClient.bind(this), 1000);
  }

  /**
   * Start the watchers.
   */
  start() {
    this._riotClientWatch ??= setInterval(
      this._checkRiotClient.bind(this),
      1000
    );
    if (platform() === "linux") {
      return;
    }
    this._leagueClientWatch ??= setInterval(
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
