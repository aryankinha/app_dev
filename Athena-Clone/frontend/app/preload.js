const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld("athena", {
    registerListenerForTimerTickFromMain: (callback) => {
        const fn = (_event, message) => callback(message);
        ipcRenderer.on('timer', fn);
        return () => ipcRenderer.removeListener('timer', fn);
    },
    startTimerOnMain: () => ipcRenderer.invoke('start-timer'),
    stopTimerOnMain: () => ipcRenderer.invoke('stop-timer'),
    registerListenerForCameraSnapFromMain: (callback) => {
        ipcRenderer.on('camera-shot', callback);
        return () => ipcRenderer.removeListener('camera-shot', callback);
    },
    storeCameraSnapImageOnDisk: (data) => {
        ipcRenderer.invoke('store-camera-snap-image-on-disk', data);
    },
    setFullScreen: (enable = true) => {
        return ipcRenderer.invoke("set-fullscreen", enable);
    },
    isFullScreen: () => {
        return ipcRenderer.invoke("is-fullscreen");
    },
    registerListenerForFullScreenChange: (callback) => {
        const fn = (_event, isFs) => callback(isFs);
        ipcRenderer.on('fullscreen-change', fn);
        return () => ipcRenderer.removeListener('fullscreen-change', fn);
    },
    quitApp: () => ipcRenderer.invoke('quit-app')
});
