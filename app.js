const electron = require('electron');
const LCUConnector = require('lcu-connector');
const fs = require('fs-extra');
const path = require('path');
const yaml = require('yaml');
const { getLCUPathFromProcess } = require('./util');

const connector = new LCUConnector();
const { app } = electron;
const { BrowserWindow } = electron;
const root = __dirname + '/app';

app.commandLine.appendSwitch('--ignore-certificate-errors');

app.on('ready', () => {
    let mainWindow = null;
    let windowLoaded = false;
    let LCUData = null;
    let swaggerDisabled = true;

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

        mainWindow.webContents.send(swaggerDisabled ? 'swagger-disabled' : 'swagger-enabled');
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
                const LCUPath = await getLCUPathFromProcess();
                const systemFile = path.join(LCUPath, 'system.yaml');

                // File doesn't exist, do nothing
                if (!(await fs.pathExists(systemFile))) {
                    throw new Error('system.yaml not found');
                }

                const file = await fs.readFile(systemFile, 'utf8');
                const fileParsed = yaml.parse(file);

                swaggerDisabled = !fileParsed.enable_swagger;
                mainWindow.webContents.send(swaggerDisabled ? 'swagger-disabled' : 'swagger-enabled');

                if (!fileParsed.enable_swagger) {
                    fileParsed.enable_swagger = true;
                    const stringifiedFile = yaml.stringify(fileParsed);

                    // Rito's file is prefixed with --- newline
                    await fs.outputFile(systemFile, `---\n${stringifiedFile}`);
                }

            } catch (error) {
                console.error(error);
                // No error handling for now
            }

            mainWindow.webContents.send('lcu-load', LCUData);
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
