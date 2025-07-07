const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      webviewTag: true,
      sandbox: false
    }
  });

  win.loadFile('src/index.html');
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // ——— AUTO-DOWNLOAD & PROGRESSION + EXTRACTION AUTO ———
  win.webContents.session.on('will-download', async (event, item, webContents) => {
    let downloadsPath = await win.webContents.executeJavaScript('localStorage.getItem("downloads_path")');
    if (!downloadsPath) {
      downloadsPath = app.getPath('downloads');
    }
    const filename = item.getFilename();
    const fullPath = path.join(downloadsPath, filename);
    item.setSavePath(fullPath);

    item.on('updated', (evt, state) => {
      if (state === 'progressing') {
        const received = item.getReceivedBytes();
        const total = item.getTotalBytes();
        const percent = total ? Math.floor(received * 100 / total) : 0;
        win.webContents.send('nexus-download-progress', { percent, state: 'progressing' });
      }
    });

    item.once('done', async (evt, state) => {
      win.webContents.send('nexus-download-progress', { percent: 100, state: 'done', success: state === 'completed' });

      if (state === 'completed') {
        const ext = path.extname(fullPath).toLowerCase();
        if (['.zip', '.rar', '.7z'].includes(ext)) {
          let modsFolder = await win.webContents.executeJavaScript('localStorage.getItem("mods_path")');
          if (!modsFolder) modsFolder = downloadsPath;

          // Crée un dossier du nom de l'archive (sans extension)
          const modName = filename.replace(/\.(zip|rar|7z)$/i, '');
          const modTargetPath = path.join(modsFolder, modName);
          if (!fs.existsSync(modTargetPath)) fs.mkdirSync(modTargetPath);

          // Extraction via preload
          await win.webContents.executeJavaScript(`
            window.electronAPI.extractArchive &&
            window.electronAPI.extractArchive(${JSON.stringify(fullPath)}, ${JSON.stringify(modTargetPath)})
          `);

          // Suppression de l’archive après extraction
          await win.webContents.executeJavaScript(`
            window.electronAPI.deleteFile &&
            window.electronAPI.deleteFile(${JSON.stringify(fullPath)})
          `);
        }
      }
    });
  });

  // Directory selector
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });

  // -------- Miniature : sélection fichier image --------
  ipcMain.handle('select-image-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }
      ]
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });

  // Optionnel: Ouvre devtools si besoin
  // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
