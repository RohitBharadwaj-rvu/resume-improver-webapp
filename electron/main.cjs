const { app, BrowserWindow, ipcMain, dialog, safeStorage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const http = require('http');
const { spawn, execSync } = require('child_process');

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

// Session Snapshot Persistence for Updates
const SESSION_RESTORE_PATH = path.join(app.getPath('userData'), 'session_restore.json');

ipcMain.handle('session:saveSnapshot', async (event, snapshot) => {
  try {
    fs.writeFileSync(SESSION_RESTORE_PATH, JSON.stringify(snapshot, null, 2), 'utf8');
    return { success: true };
  } catch (err) {
    console.error('Error saving session snapshot:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('session:loadSnapshot', async () => {
  try {
    if (!fs.existsSync(SESSION_RESTORE_PATH)) return null;
    const raw = fs.readFileSync(SESSION_RESTORE_PATH, 'utf8');
    const data = JSON.parse(raw);
    try { fs.unlinkSync(SESSION_RESTORE_PATH); } catch (e) {}
    return data;
  } catch (err) {
    console.error('Error loading session snapshot:', err);
    return null;
  }
});

// Helper: Download file following HTTP/HTTPS redirects with live progress
function downloadFileWithRedirects(fileUrl, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    function get(currentUrl, redirectCount = 0) {
      if (redirectCount > 5) {
        return reject(new Error('Too many redirects while downloading update'));
      }

      const client = currentUrl.startsWith('https') ? https : http;
      const req = client.get(currentUrl, {
        headers: {
          'User-Agent': 'Resume-ATS-Improver-Updater',
          'Accept': 'application/octet-stream',
        },
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location, redirectCount + 1);
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed with HTTP status ${res.statusCode}`));
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let receivedBytes = 0;
        const fileStream = fs.createWriteStream(destPath);

        res.on('data', (chunk) => {
          receivedBytes += chunk.length;
          if (onProgress && totalBytes > 0) {
            const percent = Math.round((receivedBytes / totalBytes) * 100);
            onProgress(percent, receivedBytes, totalBytes);
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => resolve(destPath));
        });

        fileStream.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      });

      req.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }

    get(fileUrl);
  });
}

// In-App One-Click Update & Restart
ipcMain.handle('app:installUpdateAndRestart', async (event, downloadUrl, sessionSnapshot) => {
  try {
    if (sessionSnapshot) {
      try {
        fs.writeFileSync(SESSION_RESTORE_PATH, JSON.stringify(sessionSnapshot), 'utf8');
      } catch (e) {
        console.error('Failed to save session for restart:', e);
      }
    }

    const targetUrl = downloadUrl || 'https://github.com/RohitBharadwaj-rvu/resume-improver-webapp/releases/latest/download/Resume-ATS-Improver-Windows-x64.zip';
    const tempZip = path.join(os.tmpdir(), `ResumeUpdate_${Date.now()}.zip`);
    const tempExtract = path.join(os.tmpdir(), `ResumeExtract_${Date.now()}`);

    // Download update with progress reports
    await downloadFileWithRedirects(targetUrl, tempZip, (percent, received, total) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update:downloadProgress', {
          percent,
          receivedMB: (received / 1024 / 1024).toFixed(1),
          totalMB: (total / 1024 / 1024).toFixed(1),
          status: 'downloading',
        });
      }
    });

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:downloadProgress', {
        percent: 100,
        status: 'extracting',
      });
    }

    // Extract zip
    fs.mkdirSync(tempExtract, { recursive: true });
    const extractCmd = `Expand-Archive -LiteralPath "${tempZip}" -DestinationPath "${tempExtract}" -Force`;
    execSync(`powershell.exe -NoProfile -NonInteractive -Command "${extractCmd}"`, { windowsHide: true });

    // Prepare updater script
    const currentPid = process.pid;
    const exePath = process.execPath;
    const appDir = path.dirname(exePath);
    const batPath = path.join(os.tmpdir(), `resume_apply_update_${Date.now()}.bat`);

    const batContent = `@echo off\r\n` +
      `chcp 65001 >nul\r\n` +
      `timeout /t 2 /nobreak >nul\r\n` +
      `taskkill /F /PID ${currentPid} 2>nul\r\n` +
      `timeout /t 1 /nobreak >nul\r\n` +
      `robocopy "${tempExtract}" "${appDir}" /E /IS /IT /NFL /NDL /NJH /NJS /nc /ns /np\r\n` +
      `if %ERRORLEVEL% GEQ 8 ( xcopy /s /e /y /q "${tempExtract}\\*" "${appDir}\\" )\r\n` +
      `rmdir /s /q "${tempExtract}" 2>nul\r\n` +
      `del /f /q "${tempZip}" 2>nul\r\n` +
      `start "" "${exePath}"\r\n` +
      `del "%~f0" 2>nul\r\n` +
      `exit\r\n`;

    fs.writeFileSync(batPath, batContent, 'utf8');

    // Spawn detached updater batch and quit application
    const child = spawn('cmd.exe', ['/c', batPath], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    setTimeout(() => {
      app.quit();
    }, 500);

    return { success: true };
  } catch (err) {
    console.error('Update and restart error:', err);
    return { success: false, error: err.message };
  }
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
