const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openDocxDialog: () => ipcRenderer.invoke('dialog:openDocx'),
  saveDocxDialog: (bufferData, defaultName) => ipcRenderer.invoke('dialog:saveDocx', bufferData, defaultName),
  saveDocxDirect: (targetPath, bufferData) => ipcRenderer.invoke('fs:saveDirect', targetPath, bufferData),
  readDocxFile: (targetPath) => ipcRenderer.invoke('fs:readFile', targetPath),
  getSecureKey: (key) => ipcRenderer.invoke('storage:getSecureKey', key),
  setSecureKey: (key, value) => ipcRenderer.invoke('storage:setSecureKey', key, value),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
});
