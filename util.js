const cp = require('child_process');
const path = require('path');
const IS_WIN = process.platform === 'win32';

module.exports.getLCUPathFromProcess = () => {
    return new Promise(resolve => {
        const command = IS_WIN ?
            `WMIC PROCESS WHERE name='LeagueClientUx.exe' GET ExecutablePath` :
            `ps x -o comm= | grep 'LeagueClientUx$'`;

        cp.exec(command, (err, stdout, stderr) => {
            if (err || !stdout || stderr) {
                resolve();
                return;
            }

            let normalizedPath = path.normalize(stdout);

            // On MAC we need to go up a few levels to reach `deploy`
            // This script also assumes that only Riot Games managed regions are provided
            // Hasn't been tested on Garena
            normalizedPath = IS_WIN ? normalizedPath.split(/\n|\n\r/)[1] : path.join(normalizedPath, '../../../');
            normalizedPath = path.dirname(normalizedPath);

            resolve(normalizedPath);
        });
    });
};