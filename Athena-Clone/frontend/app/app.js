import { app, BrowserWindow, ipcMain, session } from "electron";
import path from "path";
import fs from "fs";

let electronWindow = null;
let startTimestamp = null;
let timerInterval = null;
let cameraInterval = null;

function stopTimers() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (cameraInterval) {
        clearInterval(cameraInterval);
        cameraInterval = null;
    }
}

function createWindow() {
    electronWindow = new BrowserWindow({
        height: 850,
        width: 1100,
        fullscreen: false,
        kiosk: false,
        center: true,
        simpleFullscreen: true,
        webPreferences: {
            devTools: true,
            preload: path.join(import.meta.dirname, 'preload.js')
        }
    });

    electronWindow.on('enter-full-screen', () => {
        electronWindow.webContents.send('fullscreen-change', true);
    });

    electronWindow.on('leave-full-screen', () => {
        electronWindow.webContents.send('fullscreen-change', false);
    });

    const loadURL = () => {
        electronWindow.loadURL('http://localhost:5173').catch(() => {
            console.log('Waiting for Vite server on http://localhost:5173...');
            setTimeout(loadURL, 1000);
        });
    };
    loadURL();
}

app.on('window-all-closed', () => {
    stopTimers();
    app.quit();
});

ipcMain.handle('set-fullscreen', (_event, enable) => {
    if (!electronWindow) return false;
    const flag = Boolean(enable);
    if (flag) {
        if (process.platform === 'darwin') {
            electronWindow.setSimpleFullScreen(true);
        } else {
            electronWindow.setFullScreen(true);
        }
    } else {
        if (process.platform === 'darwin') {
            electronWindow.setSimpleFullScreen(false);
        } else {
            electronWindow.setFullScreen(false);
        }
    }
    electronWindow.webContents.send('fullscreen-change', flag);
    return flag;
});

ipcMain.handle('is-fullscreen', () => {
    if (!electronWindow) return false;
    return electronWindow.isFullScreen() || (process.platform === 'darwin' && electronWindow.isSimpleFullScreen());
});

ipcMain.handle('start-timer', () => {
    stopTimers();
    startTimestamp = Date.now();

    timerInterval = setInterval(() => {
        if (electronWindow && !electronWindow.isDestroyed()) {
            electronWindow.webContents.send('timer', Math.floor((Date.now() - startTimestamp) / 1000));
        }
    }, 1000);

    cameraInterval = setInterval(() => {
        if (electronWindow && !electronWindow.isDestroyed()) {
            electronWindow.webContents.send('camera-shot');
        }
    }, 5000);
});

ipcMain.handle('stop-timer', () => {
    stopTimers();
    return true;
});

ipcMain.handle('store-camera-snap-image-on-disk', (_event, data) => {
    const snapDir = path.join(import.meta.dirname, "user-camera-snap");
    if (!fs.existsSync(snapDir)) {
        fs.mkdirSync(snapDir, { recursive: true });
    }
    const filePath = path.join(snapDir, `${Date.now()}.jpg`);
    fs.writeFileSync(filePath, Buffer.from(data));
});

ipcMain.handle('quit-app', () => {
    stopTimers();
    app.quit();
});

app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
        callback(true);
    });
    session.defaultSession.setPermissionCheckHandler((_webContents, _permission) => {
        return true;
    });
    createWindow();
});
