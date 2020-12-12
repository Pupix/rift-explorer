import { readFile } from "fs-extra";

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
 * Reads from the path provided and parses it.
 * @param path {string}
 * @since 7.0.0
 */
export async function parse(path: string): Promise<LockFile> {
  const data = await readFile(path, "utf8");
  const parts = data.split(":");

  return {
    username: "riot",
    processName: parts[0],
    PID: Number(parts[1]),
    port: Number(parts[2]),
    password: parts[3],
    protocol: parts[4],
    address: "127.0.0.1",
  };
}
