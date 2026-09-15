import { app, BrowserWindow } from "electron";
import path from "path";

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1050,
        height: 820,
        center: true,
        webPreferences: {
            devTools: true,
            preload: path.join(import.meta.dirname, 'preload.js')
        }
    });

    const loadURL = () => {
        mainWindow.loadURL('http://localhost:5173').catch(() => {
            console.log('Waiting for Vite server on http://localhost:5173...');
            setTimeout(loadURL, 1000);
        });
    };
    loadURL();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
