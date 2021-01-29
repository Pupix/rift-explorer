import { outputFile, pathExists, readFile } from "fs-extra";
import axios from "axios";
import { Agent } from "https";
import yaml, { Document } from "yaml";
import { platform, homedir } from "os";
import { join } from "path";

/**
 * Simple axios instance with disabled SSL to allow the self signed cert
 */
const instance = axios.create({
  httpsAgent: new Agent({
    rejectUnauthorized: false,
  }),
});

/**
 * Modifies the system.yml to enable swagger.
 * @param path {string}
 */
export async function modifySystemYaml(path: string): Promise<void> {
  if (platform() === "linux") {
    path = join(homedir(), path.slice(2, path.length));
  }
  /**
   * If File doesn't exist, do nothing.
   */
  if (!(await pathExists(path))) {
    throw new Error("system.yaml not found");
  }

  /**
   * Read and parse the yaml provided.
   */
  const file: string = await readFile(path, "utf8");
  const fileParsed: Document.Parsed = yaml.parseDocument(file);

  /**
   * Set the swagger flag to true here.
   */
  fileParsed.set("enable_swagger", true);

  const stringifiedFile: string = yaml.stringify(fileParsed);

  /**
   * Riot's file is prefixed with --- newline.
   */
  await outputFile(path, `---\n${stringifiedFile}`);
}

/**
 * Deletes the users session.
 * @param LCUData
 */
export async function deleteUserSession(
  LCUData: Record<string, string | number> | null
) {
  const { username, password, address, port } = LCUData;

  try {
    /**
     * Delete the users session so they have to log back in.
     */
    await instance.delete(
      `https://${username}:${password}@${address}:${port}/lol-rso-auth/v1/session`
    );
  } catch (e) {
    throw new Error("Unable to delete session: " + e.message);
  }
}
