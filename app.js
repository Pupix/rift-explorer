const electron = require('electron');
const LCUConnector = require('lcu-connector');
const request = require('request-promise');
const {
    duplicateSystemYaml,
    restartLCUWithOverride,
    getOverrideFilePath,
} = require('./util');

const connector = new LCUConnector();
const { app, dialog, Menu } = electron;
const { BrowserWindow } = electron;

const root = `${__dirname}/app`;

// Checking if the running executable is called electron
// seems to be the most straightforward to do this
// https://stackoverflow.com/a/39395885/4895858
const isDev = process.execPath.search('electron') !== -1;

let mainWindow = null;

app.commandLine.appendSwitch('--ignore-certificate-errors');

app.on('ready', () => {
    let windowLoaded = false;
    let LCUData = null;

    mainWindow = new BrowserWindow({
        center: true,
        height: 720,
        show: false,
        width: 1280,
        title: 'Rift Explorer',
        backgroundColor: '#303030',
        webPreferences: {
            nodeIntegration: true,
        },
    });

    if (isDev) mainWindow.openDevTools();

    // Remove default menu
    Menu.setApplicationMenu(null);
    mainWindow.loadURL(`file://${root}/index.html`);

    // Avoid white page on load.
    mainWindow.webContents.on('did-finish-load', () => {
        windowLoaded = true;
        mainWindow.show();

        if (!LCUData) return;

        mainWindow.webContents.send('lcu-load', LCUData);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    async function isSystemYamlPatched(data, auth) {
        const rawCmdLineArgs = await request.get({
            url: `https://127.0.0.1:${data.port}/riotclient/command-line-args`,
            strictSSL: false,
            headers: {
                Authorization: `Basic ${auth}`,
            },
        });
        const cmdLineArgs = JSON.parse(rawCmdLineArgs);

        return cmdLineArgs.includes(`--system-yaml-override=${await getOverrideFilePath()}`);
    }

    async function checkArgs(data, auth) {
        try {
            if (await isSystemYamlPatched(data, auth)) {
                mainWindow.webContents.send('lcu-load', data);
            } else {
                await duplicateSystemYaml();

                const response = dialog.showMessageBoxSync({
                    type: 'info',
                    buttons: ['Cancel', 'Ok'],
                    title: 'Rift Explorer',
                    message: 'Rift Explorer needs to restart your League of Legends client to work properly',
                    cancelId: 0,
                    noLink: true,
                });

                if (!response) {
                    mainWindow.close();
                    return;
                }

                mainWindow.webContents.send('restarting-league');
                await restartLCUWithOverride(data);
            }
        } catch (e) {
            setTimeout(() => {
                checkArgs(data, auth);
            }, 2500);
        }
    }

    connector.on('connect', (data) => {
        const auth = Buffer.from(`${data.username}:${data.password}`)
            .toString('base64');
        checkArgs(data, auth).catch(console.error);
    });

    connector.on('disconnect', () => {
        LCUData = null;
        if (windowLoaded) mainWindow.webContents.send('lcu-unload');
    });

    connector.start();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

module.exports = { mainWindow };
