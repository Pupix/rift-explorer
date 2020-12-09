import { ChildProcess, exec, spawn } from "child_process";
import * as path from "path";
import { dirname, join, normalize } from "path";
import { outputFile, pathExists, readFile } from "fs-extra";
import axios from "axios";
import { Agent } from "https";
import yaml, { Document } from "yaml";
import { platform } from "os";

const IS_WIN: boolean = platform() === "win32";
const LEAGUE_PROCESS: string = IS_WIN ? "LeagueClient.exe" : "LeagueClient";

const agent: Agent = new Agent({
  rejectUnauthorized: false,
});

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

async function modifySystemYaml(): Promise<void> {
  const LCUExePath: void | string = await getLCUExecutableFromProcess();
  let LCUDir: string;

  if (typeof LCUExePath === "string") {
    LCUDir = IS_WIN ? dirname(LCUExePath) : `${dirname(LCUExePath)}/../../..`;
  } else {
    throw new Error("LCU exe path not found.");
  }

  const originalSystemFile: string = join(LCUDir, "system.yaml");

  // File doesn't exist, do nothing
  if (!(await pathExists(originalSystemFile))) {
    throw new Error("system.yaml not found");
  }

  const file: string = await readFile(originalSystemFile, "utf8");
  const fileParsed: Document.Parsed = yaml.parseDocument(file);

  fileParsed.set("enable_swagger", true);

  const stringifiedFile: string = yaml.stringify(fileParsed);
  // Rito's file is prefixed with --- newline
  await outputFile(originalSystemFile, `---\n${stringifiedFile}`);
}

function restartLCUWithOverride(LCUData: {
  username: string;
  password: string;
  address: string;
  port: number;
}): Promise<void> {
  return new Promise(
    async (resolve): Promise<void> => {
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

      await axios.post(
        `https://${username}:${password}@${address}:${port}/process-control/v1/process/quit`,
        { httpsAgent: agent }
      );

      // Give it some time to do cleanup
      setTimeout((): void => {
        const leagueProcess: ChildProcess = spawn(LCUExePath.trim(), [``], {
          cwd: LCUDir,
          detached: true,
          stdio: "ignore",
        });

        leagueProcess.unref();
        resolve();
      }, 5000);
    }
  );
}

export {
  getLCUExecutableFromProcess,
  modifySystemYaml,
  restartLCUWithOverride,
};
