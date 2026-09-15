import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";

let mainWindow = null;
let startTimestamp = null;
let timerInterval = null;

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

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

ipcMain.handle('start-timer', () => {
    stopTimer();
    startTimestamp = Date.now();
    timerInterval = setInterval(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('timer', Math.floor((Date.now() - startTimestamp) / 1000));
        }
    }, 1000);
});

ipcMain.handle('quit-app', () => {
    stopTimer();
    app.quit();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    stopTimer();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
