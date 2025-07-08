const { app, BrowserWindow, dialog, ipcMain, shell, Menu, clipboard, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');

let win; // Variable globale pour la fenêtre

function createWindow() {
  win = new BrowserWindow({
    width: 1700,
    height: 900,
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

  // ——— AUTO-DOWNLOAD & PROGRESSION + EXTRACTION AUTO + CORRECTION STRUCTURE ———
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

          const modName = filename.replace(/\.(zip|rar|7z)$/i, '');
          const modTargetPath = path.join(modsFolder, modName);
          if (!fs.existsSync(modTargetPath)) fs.mkdirSync(modTargetPath);

          console.log('🚀 Démarrage extraction automatique pour:', modName);

          try {
            // 📦 EXTRACTION avec correction automatique intégrée + détection variantes
            const extractSuccess = await win.webContents.executeJavaScript(`
              (async () => {
                try {
                  console.log('🔧 Début extraction pour: ${JSON.stringify(modName)}');
                  const result = await window.electronAPI.extractArchive(${JSON.stringify(fullPath)}, ${JSON.stringify(modTargetPath)});
                  console.log('📊 Résultat extraction:', result);
                  return result;
                } catch (error) {
                  console.error('❌ Erreur extraction:', error);
                  return false;
                }
              })()
            `);

            if (extractSuccess && extractSuccess.success) {
              if (extractSuccess.hasVariants) {
                console.log('🎭 Variantes détectées, attente sélection utilisateur...');
                // Le preload.js va envoyer l'événement show-variant-selector
                // Le processus d'installation sera mis en pause
              } else {
                console.log('✅ Extraction et correction terminées pour:', modName);
              }
            } else {
              console.error('❌ Échec de l\'extraction pour:', modName);
            }

          } catch (error) {
            console.error('❌ Erreur lors du traitement automatique:', error);
          }

          // 🗑️ SUPPRESSION DU FICHIER ARCHIVE (seulement si pas de variantes en attente)
          try {
            await win.webContents.executeJavaScript(`
              window.electronAPI.deleteFile(${JSON.stringify(fullPath)})
            `);
            console.log('🗑️ Archive supprimée:', fullPath);
          } catch (error) {
            console.error('❌ Erreur suppression archive:', error);
          }

          console.log('🏁 Traitement automatique terminé pour:', modName);
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

  // Image file selector
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

  // Handler pour récupérer des éléments du localStorage
  ipcMain.handle('get-localStorage-item', async (event, key) => {
    try {
      const value = await win.webContents.executeJavaScript(`localStorage.getItem("${key}")`);
      return value;
    } catch (error) {
      console.error('Erreur récupération localStorage:', error);
      return null;
    }
  });

  // 🔒 NOUVEAUX HANDLERS SÉCURISÉS POUR LA CLÉ API
  
  // Vérifier si safeStorage est disponible
  ipcMain.handle('safe-storage-available', async () => {
    try {
      return safeStorage.isEncryptionAvailable();
    } catch (error) {
      console.error('❌ Erreur vérification safeStorage:', error);
      return false;
    }
  });

  // Chiffrer et sauvegarder la clé API
  ipcMain.handle('encrypt-and-save-api-key', async (event, apiKey) => {
    try {
      console.log('🔐 Chiffrement de la clé API...');
      
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('⚠️ safeStorage non disponible, stockage en texte brut');
        // Fallback : stockage en localStorage normal
        await win.webContents.executeJavaScript(`localStorage.setItem("nexus_api_key", ${JSON.stringify(apiKey)})`);
        return { success: true, encrypted: false, fallback: true };
      }

      // Chiffrement sécurisé
      const encryptedData = safeStorage.encryptString(apiKey);
      const encryptedBase64 = encryptedData.toString('base64');
      
      // Stockage de la version chiffrée dans localStorage
      await win.webContents.executeJavaScript(`localStorage.setItem("nexus_api_key_encrypted", ${JSON.stringify(encryptedBase64)})`);
      
      // Supprime l'ancienne clé en texte brut si elle existe
      await win.webContents.executeJavaScript(`localStorage.removeItem("nexus_api_key")`);
      
      console.log('✅ Clé API chiffrée et sauvegardée');
      return { success: true, encrypted: true, fallback: false };
      
    } catch (error) {
      console.error('❌ Erreur lors du chiffrement:', error);
      return { success: false, error: error.message };
    }
  });

  // Déchiffrer et récupérer la clé API
  ipcMain.handle('decrypt-and-get-api-key', async () => {
    try {
      console.log('🔓 Déchiffrement de la clé API...');
      
      // Essaie d'abord de récupérer la version chiffrée
      const encryptedBase64 = await win.webContents.executeJavaScript(`localStorage.getItem("nexus_api_key_encrypted")`);
      
      if (encryptedBase64) {
        if (!safeStorage.isEncryptionAvailable()) {
          console.error('❌ safeStorage non disponible pour le déchiffrement');
          return { success: false, error: 'Chiffrement non disponible' };
        }
        
        try {
          const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');
          const decryptedKey = safeStorage.decryptString(encryptedBuffer);
          console.log('✅ Clé API déchiffrée avec succès');
          return { success: true, apiKey: decryptedKey, encrypted: true };
        } catch (decryptError) {
          console.error('❌ Erreur de déchiffrement:', decryptError);
          return { success: false, error: 'Impossible de déchiffrer la clé' };
        }
      }
      
      // Fallback : essaie de récupérer l'ancienne version en texte brut
      const plaintextKey = await win.webContents.executeJavaScript(`localStorage.getItem("nexus_api_key")`);
      
      if (plaintextKey) {
        console.log('⚠️ Clé API trouvée en texte brut (migration nécessaire)');
        return { success: true, apiKey: plaintextKey, encrypted: false, needsMigration: true };
      }
      
      // Aucune clé trouvée
      console.log('ℹ️ Aucune clé API trouvée');
      return { success: true, apiKey: null, encrypted: false };
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération:', error);
      return { success: false, error: error.message };
    }
  });

  // Supprimer la clé API (versions chiffrée et non chiffrée)
  ipcMain.handle('delete-api-key', async () => {
    try {
      console.log('🗑️ Suppression de la clé API...');
      
      // Supprime les deux versions
      await win.webContents.executeJavaScript(`
        localStorage.removeItem("nexus_api_key_encrypted");
        localStorage.removeItem("nexus_api_key");
      `);
      
      console.log('✅ Clé API supprimée');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      return { success: false, error: error.message };
    }
  });

  // 🆕 MENU CONTEXTUEL IMAGES - VERSION CORRIGÉE
  
  // Handler principal pour le menu contextuel d'images
  ipcMain.on('show-image-menu', (event, imageData) => {
    console.log('🖼️ Menu contextuel demandé pour:', imageData.imageUrl);
    
    const template = [
      {
        label: '📋 Copier l\'URL de l\'image',
        click: () => {
          clipboard.writeText(imageData.imageUrl);
          console.log('📋 URL copiée:', imageData.imageUrl);
          
          // Envoie une notification au renderer
          win.webContents.send('show-notification', {
            message: '📋 URL copiée dans le presse-papier !',
            error: false
          });
        }
      },
      {
        label: '⬬ Télécharger pour un mod',
        click: () => {
          console.log('🔽 Ouverture sélecteur mod pour:', imageData.imageUrl);
          
          // Envoie les données au renderer pour ouvrir le sélecteur
          win.webContents.send('open-mod-selector', {
            imageUrl: imageData.imageUrl,
            source: imageData.source || 'unknown'
          });
        }
      },
      { type: 'separator' },
      {
        label: '🔗 Ouvrir l\'image dans le navigateur',
        click: () => {
          shell.openExternal(imageData.imageUrl);
          console.log('🌐 Image ouverte dans le navigateur:', imageData.imageUrl);
        }
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: win });
  });

  // 🆕 HANDLER POUR SÉLECTEUR DE VARIANTES
  ipcMain.on('show-variant-selector', (event, data) => {
    console.log('🎭 Sélecteur de variantes demandé pour:', data.modPath);
    console.log('📋 Variantes disponibles:', data.variants.length);
    
    // Envoie les données au renderer pour afficher le popup
    win.webContents.send('show-variant-selector', {
      modPath: data.modPath,
      variants: data.variants
    });
  });

  // Handler pour télécharger une image pour un mod
  ipcMain.handle('download-image-for-mod', async (event, imageUrl, modName) => {
    try {
      console.log('⬇️ Téléchargement image pour mod:', modName, imageUrl);
      
      // Récupère les chemins des mods
      const modsPath = await win.webContents.executeJavaScript('localStorage.getItem("mods_path")') || '';
      const disabledModsPath = await win.webContents.executeJavaScript('localStorage.getItem("disabled_mods_path")') || '';
      
      // Cherche le mod dans les deux dossiers
      let targetPath = null;
      if (fs.existsSync(path.join(modsPath, modName))) {
        targetPath = path.join(modsPath, modName);
      } else if (fs.existsSync(path.join(disabledModsPath, modName))) {
        targetPath = path.join(disabledModsPath, modName);
      }
      
      if (!targetPath) {
        return { success: false, error: 'Mod non trouvé dans les dossiers configurés' };
      }

      // Télécharge l'image
      const https = require('https');
      const http = require('http');
      
      const success = await new Promise((resolve) => {
        const dest = path.join(targetPath, 'preview.jpg');
        const proto = imageUrl.startsWith('https') ? https : http;
        
        const req = proto.get(imageUrl, (res) => {
          if (res.statusCode !== 200) {
            console.error('❌ Erreur HTTP:', res.statusCode);
            return resolve(false);
          }
          
          const stream = fs.createWriteStream(dest);
          res.pipe(stream);
          
          stream.on('finish', () => {
            stream.close();
            console.log('✅ Image téléchargée:', dest);
            resolve(true);
          });
          
          stream.on('error', (err) => {
            console.error('❌ Erreur écriture:', err);
            fs.unlink(dest, () => {});
            resolve(false);
          });
        }).on('error', (err) => {
          console.error('❌ Erreur téléchargement:', err);
          resolve(false);
        });
      });

      return { success, modPath: targetPath };
      
    } catch (error) {
      console.error('❌ Erreur téléchargement image:', error);
      return { success: false, error: error.message };
    }
  });

  // Optionnel: Ouvre devtools si besoin
  // win.webContents.openDevTools();
  
  return win;
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
