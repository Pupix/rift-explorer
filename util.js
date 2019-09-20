const cp = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const yaml = require('yaml');
const { spawn } = require('child_process');
const requestPromise = require('request-promise');

const IS_WIN = process.platform === 'win32';
const LEAGUE_PROCESS = IS_WIN ? 'LeagueClient.exe' : 'LeagueClient';

function getLCUExecutableFromProcess() {
    return new Promise((resolve, reject) => {
        const command = IS_WIN ?
            `WMIC PROCESS WHERE name='${LEAGUE_PROCESS}' GET ExecutablePath` :
            `ps x -o comm= | grep '${LEAGUE_PROCESS}$'`;

        cp.exec(command, (error, stdout, stderr) => {
            if (error || !stdout || stderr) {
                reject(error || stderr);
                return;
            }

            const normalizedPath = path.normalize(stdout);
            resolve(IS_WIN ? normalizedPath.split(/\n|\n\r/)[1] : normalizedPath);
        });
    });
}

async function duplicateSystemYaml() {
    const LCUExePath = await getLCUExecutableFromProcess();
    const LCUDir = IS_WIN ? path.dirname(LCUExePath) : `${path.dirname(LCUExePath)}/../../..`;

    const originalSystemFile = path.join(LCUDir, 'system.yaml');
    const overrideSystemFile = path.join(LCUDir, 'Config', 'rift-explorer', 'system.yaml');

    // File doesn't exist, do nothing
    if (!(await fs.exists(originalSystemFile))) {
        throw new Error('system.yaml not found');
    }

    const file = await fs.readFile(originalSystemFile, 'utf8');
    const fileParsed = yaml.parseDocument(file);

    fileParsed.delete('riotclient');
    fileParsed.set('enable_swagger', true);

    const stringifiedFile = yaml.stringify(fileParsed);
    // Rito's file is prefixed with --- newline
    await fs.outputFile(overrideSystemFile, `---\n${stringifiedFile}`);
}

function restartLCUWithOverride(LCUData) {
    return new Promise(async (resolve) => {
        const LCUExePath = await getLCUExecutableFromProcess();
        const LCUDir = IS_WIN ? path.dirname(LCUExePath) : `${path.dirname(LCUExePath)}/../../..`;
        const overrideSystemFile = path.join(LCUDir, 'Config', 'rift-explorer', 'system.yaml');

        const {
            username,
            password,
            address,
            port,
        } = LCUData;

        await requestPromise({
            strictSSL: false,
            method: 'POST',
            uri: `https://${username}:${password}@${address}:${port}/process-control/v1/process/quit`,
        });

        // Give it some time to do cleanup
        setTimeout(() => {
            const leagueProcess = spawn(LCUExePath.trim(), [`--system-yaml-override=${overrideSystemFile}`], {
                cwd: LCUDir,
                detached: true,
                stdio: 'ignore',
            });

            leagueProcess.unref();
            resolve();
        }, 5000);
    });
}

module.exports = {
    getLCUExecutableFromProcess,
    duplicateSystemYaml,
    restartLCUWithOverride,
};
