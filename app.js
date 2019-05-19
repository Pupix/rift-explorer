const electron = require('electron');
const LCUConnector = require('lcu-connector');
const {
    duplicateSystemYaml,
    restartLCUWithOverride,
 } = require('./util');

const connector = new LCUConnector();
const { app, dialog } = electron;
const { BrowserWindow } = electron;
const root = __dirname + '/app';
let LCURestarted = false;

app.commandLine.appendSwitch('--ignore-certificate-errors');

app.on('ready', () => {
    let mainWindow = null;
    let windowLoaded = false;
    let LCUData = null;

    mainWindow = new BrowserWindow({
        center: true,
        height: 720,
        show: false,
        width: 1280,
        title: 'Rift Explorer'
    });

    // Check if dev env FIXME
    // mainWindow.openDevTools();

    // Remove default menu
    mainWindow.setMenu(null);
    mainWindow.loadURL('file://' + root + '/index.html');

    // Avoid white page on load.
    mainWindow.webContents.on('did-finish-load', () => {
        windowLoaded = true;

        mainWindow.show();

        if (!LCUData) {
            return;
        }

        mainWindow.webContents.send('lcu-load', LCUData);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    connector.on('connect', async (data) => {
        // During multiple restarts of the client the backend server is not instantly
        // ready to serve requests so we delay a bit
        setTimeout(async () => {
            LCUData = data;

            try {
                if (LCURestarted) {
                    mainWindow.webContents.send('lcu-load', LCUData);
                    return;
                }

                await duplicateSystemYaml();
                const response = dialog.showMessageBox({
                    type: 'info',
                    buttons: [ 'Cancel', 'Ok' ],
                    title: 'Rift Explorer',
                    message: 'Rift Explorer needs to restart your League of Legends client to work properly',
                    cancelId: 0,
                });

                if (!response) {
                    mainWindow.close();
                    return;
                }

                await restartLCUWithOverride(LCUData);
                LCURestarted = true;
            } catch (error) {
                console.error(error);
                // No error handling for now
            }
        }, 5000);
    });

    connector.on('disconnect', () => {
        LCUData = null;

        if (windowLoaded) {
            mainWindow.webContents.send('lcu-unload');
        }
    });

    connector.start();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
