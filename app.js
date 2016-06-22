
    const electron = require('electron');
    const {app} = electron;
    const {BrowserWindow} = electron;
    const root = __dirname + '/app/swagger';

    const UX = require('./lib/ux');

    let mainWindow = null;

    app.commandLine.appendSwitch('--ignore-certificate-errors');

    app.on('ready', () => {

        mainWindow = new BrowserWindow({
            center: true,
            height: 720,
            show: false,
            title: 'League API',
            width: 1280
        });

        // Remove default menu
        mainWindow.setMenu(null);

        mainWindow.loadURL('file://' + root + '/index.html');

        // Check if dev env FIXME
        mainWindow.openDevTools();

        // Avoid white page on load.
        mainWindow.webContents.on('did-finish-load', () => {
            UX.getArguments()
                .then((result) => mainWindow.webContents.send('arguments-load', result))
                .catch((error) => mainWindow.webContents.send('arguments-error', error.message));

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
