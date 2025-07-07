console.log('PRELOAD FILE CHARGED');
const fs = require('fs');
const path = require('path');
const { contextBridge, ipcRenderer, shell } = require('electron');
const rimraf = require('rimraf');
const extract = require('extract-zip');
const { extractFull } = require('node-7z');
const https = require('https');
const http = require('http');

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: async () => ipcRenderer.invoke('select-directory'),
  onDownloadProgress: (callback) => {
    ipcRenderer.on('nexus-download-progress', (event, progress) => callback(progress));
  },
  sendWebviewIdToMain: (id) => {
    ipcRenderer.send('register-webview-download-handler', id);
  },
  listFolders: (dir) => {
    try {
      return fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory());
    } catch {
      return [];
    }
  },
  moveFolder: (src, dest) => {
    try {
      fs.renameSync(src, dest);
      return true;
    } catch (e) {
      console.error('Erreur moveFolder', e);
      return false;
    }
  },
  openFolder: (dir) => {
    shell.openPath(dir);
  },
  deleteFolder: (dir) => {
    if (fs.existsSync(dir)) rimraf.sync(dir);
    return true;
  },
  extractArchive: async (archivePath, destPath) => {
    const ext = path.extname(archivePath).toLowerCase();
    try {
      if (ext === '.zip') {
        await extract(archivePath, { dir: destPath });
        return true;
      } else if (ext === '.rar' || ext === '.7z') {
        return await new Promise((resolve, reject) => {
          extractFull(archivePath, destPath, {})
            .on('end', () => resolve(true))
            .on('error', err => reject(err));
        });
      }
      return false;
    } catch (e) {
      console.error('Erreur extraction', e);
      return false;
    }
  },
  deleteFile: (filePath) => {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return true;
  },
  selectImageFile: async () => {
    return await ipcRenderer.invoke('select-image-file');
  },
  copyImageToPreview: async (filePath, destFolder) => {
    try {
      const dest = path.join(destFolder, 'preview.jpg');
      fs.copyFileSync(filePath, dest);
      return true;
    } catch (e) {
      console.error("Erreur copie image :", e);
      return false;
    }
  },
  downloadImageToPreview: async (url, destFolder) => {
    return await new Promise((resolve, reject) => {
      const dest = path.join(destFolder, 'preview.jpg');
      const proto = url.startsWith('https') ? https : http;
      const req = proto.get(url, (res) => {
        if (res.statusCode !== 200) return resolve(false);
        const stream = fs.createWriteStream(dest);
        res.pipe(stream);
        stream.on('finish', () => {
          stream.close();
          resolve(true);
        });
        stream.on('error', (err) => {
          fs.unlink(dest, () => {});
          resolve(false);
        });
      }).on('error', () => resolve(false));
    });
  },
  
  // 🆕 FONCTION MENU CONTEXTUEL IMAGES
  showImageContextMenu: (imageData) => {
    console.log('🖼️ Demande menu contextuel via preload:', imageData.imageUrl);
    ipcRenderer.send('show-image-menu', imageData);
  },
  
  // 🆕 Fonction pour récupérer la liste des mods
  getModsList: async () => {
    try {
      const modsPath = await ipcRenderer.invoke('get-localStorage-item', 'mods_path') || '';
      const disabledModsPath = await ipcRenderer.invoke('get-localStorage-item', 'disabled_mods_path') || '';
      
      if (!modsPath || !disabledModsPath) {
        return { all: [], active: [], disabled: [] };
      }

      const activeMods = fs.readdirSync(modsPath).filter(f => 
        fs.statSync(path.join(modsPath, f)).isDirectory()
      );
      
      const disabledMods = fs.readdirSync(disabledModsPath).filter(f => 
        fs.statSync(path.join(disabledModsPath, f)).isDirectory()
      );
      
      return {
        all: [...activeMods, ...disabledMods],
        active: activeMods,
        disabled: disabledMods
      };
    } catch (error) {
      console.error('❌ Erreur getModsList:', error);
      return { all: [], active: [], disabled: [] };
    }
  },
  
  // 🆕 Fonction pour télécharger une image pour un mod spécifique
  downloadImageForMod: async (imageUrl, modName) => {
    return await ipcRenderer.invoke('download-image-for-mod', imageUrl, modName);
  },

  onImageUrlCopied: (callback) => {
    ipcRenderer.on('image-url-copied', (...args) => callback(...args));
  },
  openExternal: (url) => shell.openExternal(url),
  
  // 🆕 NOUVEAUX LISTENERS POUR MENU CONTEXTUEL
  onModSelectorRequest: (callback) => {
    ipcRenderer.on('open-mod-selector', (event, data) => callback(event, data));
  },
  
  onNotification: (callback) => {
    ipcRenderer.on('show-notification', (event, data) => callback(event, data));
  },
  
  // 🎮 Fonction pour lancer Stellar Blade
  launchGame: async (exePath) => {
    try {
      const { spawn } = require('child_process');
      const path = require('path');
      const fs = require('fs');
      
      // Vérifie que le fichier existe
      if (!fs.existsSync(exePath)) {
        console.error('Fichier exe non trouvé:', exePath);
        return false;
      }
      
      // Extrait le répertoire du jeu pour définir le cwd
      const gameDir = path.dirname(exePath);
      
      // Lance le jeu en arrière-plan
      const gameProcess = spawn(exePath, [], {
        cwd: gameDir,
        detached: true,
        stdio: 'ignore'
      });
      
      // Détache le processus pour qu'il continue même si l'app se ferme
      gameProcess.unref();
      
      console.log('Stellar Blade lancé depuis:', exePath);
      return true;
    } catch (error) {
      console.error('Erreur lors du lancement du jeu:', error);
      return false;
    }
  }
});
