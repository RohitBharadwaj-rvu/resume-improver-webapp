const { app, BrowserWindow, ipcMain, dialog, safeStorage, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

// Path to persist secure settings in user application data
const SECURE_STORE_PATH = path.join(app.getPath('userData'), 'secure_config.enc');

function getSecureConfig() {
  try {
    if (!fs.existsSync(SECURE_STORE_PATH)) return {};
    const raw = fs.readFileSync(SECURE_STORE_PATH);
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const decrypted = safeStorage.decryptString(raw);
      return JSON.parse(decrypted);
    }
    return JSON.parse(raw.toString('utf8'));
  } catch (err) {
    console.error('Error reading secure config:', err);
    return {};
  }
}

function saveSecureConfig(config) {
  try {
    const jsonStr = JSON.stringify(config);
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(jsonStr);
      fs.writeFileSync(SECURE_STORE_PATH, encrypted);
    } else {
      fs.writeFileSync(SECURE_STORE_PATH, jsonStr, 'utf8');
    }
  } catch (err) {
    console.error('Error saving secure config:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'Resume ATS Improver - AI Powered',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false, // Allows seamless local AI endpoint access (Ollama, LM Studio)
    },
  });

  const isDev = !app.isPackaged && (process.env.ELECTRON_DEV === '1' || process.argv.includes('--dev'));

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production or when packaged, load the built dist index.html
    const distPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(distPath)) {
      mainWindow.loadFile(distPath);
    } else {
      mainWindow.loadURL('http://localhost:5173');
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers: Native Desktop Capabilities
ipcMain.handle('dialog:openDocx', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Resume Document (.docx)',
    filters: [{ name: 'Word Documents', extensions: ['docx'] }],
    properties: ['openFile'],
  });

  if (result.canceled || !result.filePaths.length) return null;

  const selectedPath = result.filePaths[0];
  const fileBuffer = await fs.promises.readFile(selectedPath);
  const fileName = path.basename(selectedPath);

  return {
    filePath: selectedPath,
    fileName,
    data: Array.from(fileBuffer),
  };
});

ipcMain.handle('dialog:saveDocx', async (event, bufferData, defaultName) => {
  if (!mainWindow) return { success: false };
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Improved Resume (.docx)',
    defaultPath: defaultName || 'My_Improved_Resume.docx',
    filters: [{ name: 'Word Documents', extensions: ['docx'] }],
  });

  if (result.canceled || !result.filePath) return { success: false, canceled: true };

  const buffer = Buffer.from(bufferData);
  await fs.promises.writeFile(result.filePath, buffer);

  return {
    success: true,
    filePath: result.filePath,
    fileName: path.basename(result.filePath),
  };
});

ipcMain.handle('fs:saveDirect', async (event, targetPath, bufferData) => {
  try {
    if (!targetPath) return { success: false, error: 'No target file path provided' };
    const buffer = Buffer.from(bufferData);
    await fs.promises.writeFile(targetPath, buffer);
    return { success: true, filePath: targetPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:readFile', async (event, targetPath) => {
  try {
    const fileBuffer = await fs.promises.readFile(targetPath);
    return {
      success: true,
      filePath: targetPath,
      fileName: path.basename(targetPath),
      data: Array.from(fileBuffer),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Drafts Working Directory in User Documents (e.g. C:\Users\<name>\Documents\Resume ATS Improver\Drafts)
function getDraftsDirectory() {
  const docs = app.getPath('documents');
  const draftsDir = path.join(docs, 'Resume ATS Improver', 'Drafts');
  if (!fs.existsSync(draftsDir)) {
    fs.mkdirSync(draftsDir, { recursive: true });
  }
  return draftsDir;
}

ipcMain.handle('drafts:createWorkingCopy', async (event, originalFileName, bufferData) => {
  try {
    const draftsDir = getDraftsDirectory();
    const cleanBase = (originalFileName || 'Resume').replace(/\.docx$/i, '').replace(/_WorkingCopy.*$/i, '');
    const draftFileName = `${cleanBase}_WorkingCopy.docx`;
    const draftPath = path.join(draftsDir, draftFileName);

    const buffer = Buffer.from(bufferData);
    await fs.promises.writeFile(draftPath, buffer);

    return {
      success: true,
      filePath: draftPath,
      fileName: draftFileName,
      draftsFolder: draftsDir,
    };
  } catch (err) {
    console.error('Error creating working copy:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('drafts:openFolder', async () => {
  try {
    const draftsDir = getDraftsDirectory();
    await shell.openPath(draftsDir);
    return { success: true, path: draftsDir };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('app:openExternalUrl', async (event, url) => {
  try {
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
      await shell.openExternal(url);
      return { success: true };
    }
    return { success: false, error: 'Invalid URL' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('storage:getSecureKey', async (event, key) => {
  const config = getSecureConfig();
  return config[key] || null;
});

ipcMain.handle('storage:setSecureKey', async (event, key, value) => {
  const config = getSecureConfig();
  config[key] = value;
  saveSecureConfig(config);
  return true;
});

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
