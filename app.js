const electron = require('electron');
const LCUConnector = require('lcu-connector');
const createSpec = require('./createSpec');

const connector = new LCUConnector('');
const { app } = electron;
const { BrowserWindow } = electron;
const root = __dirname + '/app';

let mainWindow = null;

app.commandLine.appendSwitch('--ignore-certificate-errors');

app.on('ready', () => {

    mainWindow = new BrowserWindow({
        center: true,
        height: 720,
        show: false,
        title: 'Rift Explorer',
        width: 1280
    });

    // Remove default menu
    mainWindow.setMenu(null);
    mainWindow.loadURL('file://' + root + '/index.html');

    // Check if dev env FIXME
    // mainWindow.openDevTools();

    // Avoid white page on load.
    mainWindow.webContents.on('did-finish-load', () => {
        connector.on('connect', async (data) => {
            const spec = await createSpec(data);
            mainWindow.webContents.send('lcu-load', Object.assign(data, { spec }));
        });

        connector.start();
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
