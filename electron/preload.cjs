const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openDocxDialog: () => ipcRenderer.invoke('dialog:openDocx'),
  saveDocxDialog: (bufferData, defaultName) => ipcRenderer.invoke('dialog:saveDocx', bufferData, defaultName),
  saveDocxDirect: (targetPath, bufferData) => ipcRenderer.invoke('fs:saveDirect', targetPath, bufferData),
  readDocxFile: (targetPath) => ipcRenderer.invoke('fs:readFile', targetPath),
  getSecureKey: (key) => ipcRenderer.invoke('storage:getSecureKey', key),
  setSecureKey: (key, value) => ipcRenderer.invoke('storage:setSecureKey', key, value),
  createWorkingCopy: (originalFileName, bufferData) => ipcRenderer.invoke('drafts:createWorkingCopy', originalFileName, bufferData),
  openDraftsFolder: () => ipcRenderer.invoke('drafts:openFolder'),
  openExternalUrl: (url) => ipcRenderer.invoke('app:openExternalUrl', url),
  installUpdateAndRestart: (downloadUrl, sessionSnapshot) => ipcRenderer.invoke('app:installUpdateAndRestart', downloadUrl, sessionSnapshot),
  saveSessionSnapshot: (snapshot) => ipcRenderer.invoke('session:saveSnapshot', snapshot),
  loadSessionSnapshot: () => ipcRenderer.invoke('session:loadSnapshot'),
  onUpdateProgress: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('update:downloadProgress', listener);
    return () => ipcRenderer.removeListener('update:downloadProgress', listener);
  },
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
});
