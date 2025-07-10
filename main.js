const { app, BrowserWindow, dialog, ipcMain, shell, Menu, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');

let win; // Variable globale pour la fenêtre

function createWindow() {
  win = new BrowserWindow({
    width: 1700,
    height: 1080,
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
