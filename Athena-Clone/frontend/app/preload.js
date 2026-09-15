const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld("athena", {
    appVersion: "0.1.0",
    startTimer: () => ipcRenderer.invoke('start-timer'),
    quitApp: () => ipcRenderer.invoke('quit-app'),
    onTimerTick: (callback) => {
        const handler = (_event, val) => callback(val);
        ipcRenderer.on('timer', handler);
        return () => ipcRenderer.removeListener('timer', handler);
    }
});
