import { app, BrowserWindow, ipcMain, session, screen, desktopCapturer, dialog } from "electron";
import path from "path";
import fs from "fs";
import { execFile } from "child_process";

let electronWindow = null;
let startTimestamp = null;
let timerInterval = null;
let proctorInterval = null;
let isExamActive = false;
let originalMacSwipeGesture = null;

const CAMERA_DIR = path.join(import.meta.dirname, "user-camera-snap");
const SCREEN_DIR = path.join(import.meta.dirname, "user-screen-snap");

function ensureDirs() {
    if (!fs.existsSync(CAMERA_DIR)) fs.mkdirSync(CAMERA_DIR, { recursive: true });
    if (!fs.existsSync(SCREEN_DIR)) fs.mkdirSync(SCREEN_DIR, { recursive: true });
}

// Backup and disable 3-finger horizontal swipe gesture on macOS during exam
function disableMacSwipeGesture() {
    if (process.platform === 'darwin') {
        execFile('defaults', ['read', 'com.apple.AppleMultitouchTrackpad', 'TrackpadThreeFingerHorizSwipeGesture'], (err, stdout) => {
            if (!err && stdout.trim()) {
                originalMacSwipeGesture = stdout.trim();
            }
            execFile('defaults', ['write', 'com.apple.AppleMultitouchTrackpad', 'TrackpadThreeFingerHorizSwipeGesture', '-int', '0'], () => {});
        });
    }
}

// Restore 3-finger swipe gesture on macOS
function restoreMacSwipeGesture() {
    if (process.platform === 'darwin') {
        const val = originalMacSwipeGesture || '2';
        execFile('defaults', ['write', 'com.apple.AppleMultitouchTrackpad', 'TrackpadThreeFingerHorizSwipeGesture', '-int', val], () => {});
    }
}

async function captureOsScreen() {
    try {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.size;
        const scaleFactor = primaryDisplay.scaleFactor || 1;

        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: {
                width: Math.round(width * scaleFactor),
                height: Math.round(height * scaleFactor)
            }
        });

        if (sources && sources.length > 0 && !sources[0].thumbnail.isEmpty()) {
            return sources[0].thumbnail.toJPEG(80);
        }
    } catch (_err) {
        // Fallback to window capture if desktop capture is restricted
    }

    if (electronWindow && !electronWindow.isDestroyed()) {
        try {
            const img = await electronWindow.capturePage();
            if (!img.isEmpty()) {
                return img.toJPEG(80);
            }
        } catch (err) {
            console.error("Window capturePage error:", err);
        }
    }
    return null;
}

function stopTimers() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (proctorInterval) {
        clearInterval(proctorInterval);
        proctorInterval = null;
    }
}

function applyKioskMode(enable) {
    if (!electronWindow || electronWindow.isDestroyed()) return;

    if (enable) {
        isExamActive = true;
        disableMacSwipeGesture();

        electronWindow.setFullScreenable(true);
        electronWindow.setKiosk(true);
        if (process.platform === 'darwin') {
            electronWindow.setSimpleFullScreen(true);
        } else {
            electronWindow.setFullScreen(true);
        }
        electronWindow.setAlwaysOnTop(true, 'screen-saver');
        electronWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        electronWindow.focus();
    } else {
        isExamActive = false;
        restoreMacSwipeGesture();

        electronWindow.setAlwaysOnTop(false);
        electronWindow.setVisibleOnAllWorkspaces(false);
        electronWindow.setKiosk(false);
        if (process.platform === 'darwin') {
            electronWindow.setSimpleFullScreen(false);
        } else {
            electronWindow.setFullScreen(false);
        }
    }
}

function createWindow() {
    ensureDirs();

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

    // Guard against window blur / swipe-away during exam
    electronWindow.on('blur', () => {
        if (isExamActive && electronWindow && !electronWindow.isDestroyed()) {
            electronWindow.focus();
            electronWindow.webContents.send('blur-warning');
        }
    });

    electronWindow.on('swipe', (event) => {
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
    });

    const loadURL = () => {
        electronWindow.loadURL('http://localhost:5173').catch(() => {
            console.log('Waiting for Vite server on http://localhost:5173...');
            setTimeout(loadURL, 1000);
        });
    };
    loadURL();
}

app.on('before-quit', () => {
    restoreMacSwipeGesture();
});

app.on('window-all-closed', () => {
    stopTimers();
    restoreMacSwipeGesture();
    app.quit();
});

ipcMain.handle('set-fullscreen', (_event, enable) => {
    applyKioskMode(Boolean(enable));
    electronWindow?.webContents.send('fullscreen-change', Boolean(enable));
    return Boolean(enable);
});

ipcMain.handle('is-fullscreen', () => {
    if (!electronWindow) return false;
    return electronWindow.isKiosk() || electronWindow.isFullScreen() || (process.platform === 'darwin' && electronWindow.isSimpleFullScreen());
});

ipcMain.handle('start-timer', () => {
    stopTimers();
    startTimestamp = Date.now();
    applyKioskMode(true);

    timerInterval = setInterval(() => {
        if (electronWindow && !electronWindow.isDestroyed()) {
            electronWindow.webContents.send('timer', Math.floor((Date.now() - startTimestamp) / 1000));
        }
    }, 1000);

    proctorInterval = setInterval(async () => {
        if (electronWindow && !electronWindow.isDestroyed()) {
            electronWindow.webContents.send('camera-shot');

            try {
                const screenBuffer = await captureOsScreen();
                if (screenBuffer) {
                    ensureDirs();
                    const filePath = path.join(SCREEN_DIR, `${Date.now()}.jpg`);
                    fs.writeFileSync(filePath, screenBuffer);
                }
            } catch (err) {
                console.error("OS Screen capture error:", err);
            }
        }
    }, 5000);
});

ipcMain.handle('stop-timer', () => {
    stopTimers();
    applyKioskMode(false);
    return true;
});

ipcMain.handle('store-camera-snap-image-on-disk', (_event, data) => {
    ensureDirs();
    const filePath = path.join(CAMERA_DIR, `${Date.now()}.jpg`);
    fs.writeFileSync(filePath, Buffer.from(data));
});

ipcMain.handle('store-screen-snap-image-on-disk', (_event, data) => {
    ensureDirs();
    const filePath = path.join(SCREEN_DIR, `${Date.now()}.jpg`);
    fs.writeFileSync(filePath, Buffer.from(data));
});

ipcMain.handle('capture-screen-now', async () => {
    const buffer = await captureOsScreen();
    if (buffer) {
        ensureDirs();
        const filePath = path.join(SCREEN_DIR, `${Date.now()}.jpg`);
        fs.writeFileSync(filePath, buffer);
        return { success: true, filePath };
    }
    return { success: false };
});

ipcMain.on("show-rules", () => {
    if (!electronWindow || electronWindow.isDestroyed()) return;
    dialog.showMessageBox(electronWindow, {
        type: "info",
        title: "Athena Exam Rules",
        message: "Exam Instructions",
        detail:
            "1. Stay on the exam screen.\n" +
            "2. Camera must remain enabled throughout the test.\n" +
            "3. Switching applications or desktops is monitored and recorded.\n" +
            "4. External assistance is strictly prohibited.\n" +
            "5. Click Submit Quiz once you are finished."
    });
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
