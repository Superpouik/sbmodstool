const { app, BrowserWindow, dialog, ipcMain, shell, Menu, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');

let win; // Variable globale pour la fenêtre

// 🔒 SYSTÈME DE VERROU POUR ÉVITER LES EXTRACTIONS SIMULTANÉES ✅
let extractionInProgress = new Set(); // Set des chemins en cours d'extraction

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

  // ——— AUTO-DOWNLOAD & PROGRESSION + EXTRACTION AUTO + CORRECTION STRUCTURE ——— ✅ AVEC VERROU
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

    // 🔧 SECTION CORRIGÉE - Gestion téléchargement avec verrou anti-concurrence ✅
    item.once('done', async (evt, state) => {
      win.webContents.send('nexus-download-progress', { percent: 100, state: 'done', success: state === 'completed' });

      if (state === 'completed') {
        console.log('✅ Téléchargement terminé avec succès:', filename);
        
        const ext = path.extname(fullPath).toLowerCase();
        if (['.zip', '.rar', '.7z'].includes(ext)) {
          let modsFolder = await win.webContents.executeJavaScript('localStorage.getItem("mods_path")');
          if (!modsFolder) {
            console.log('⚠️ Dossier mods non configuré, utilisation du dossier de téléchargements');
            modsFolder = downloadsPath;
          }

          const modName = filename.replace(/\.(zip|rar|7z)$/i, '');
          const modTargetPath = path.join(modsFolder, modName);
          
          // 🔒 VÉRIFICATION VERROU - Évite les extractions simultanées ✅
          const lockKey = modTargetPath.toLowerCase(); // Clé de verrou basée sur le chemin de destination
          
          if (extractionInProgress.has(lockKey)) {
            console.log('⚠️ EXTRACTION DÉJÀ EN COURS pour:', modName);
            console.log('🔒 Extraction ignorée pour éviter la concurrence');
            return; // Sort de la fonction, pas d'extraction multiple
          }
          
          // 🔒 ACQUISITION DU VERROU
          extractionInProgress.add(lockKey);
          console.log('🔒 Verrou acquis pour:', modName);
          
          console.log('📦 Préparation extraction:');
          console.log('  - Archive:', fullPath);
          console.log('  - Destination:', modTargetPath);
          console.log('  - Mod name:', modName);
          console.log('  - Lock key:', lockKey);
          
          // Fonction de nettoyage du verrou
          const releaseLock = () => {
            extractionInProgress.delete(lockKey);
            console.log('🔓 Verrou libéré pour:', modName);
          };
          
          // Crée le dossier de destination s'il n'existe pas
          if (!fs.existsSync(modTargetPath)) {
            try {
              fs.mkdirSync(modTargetPath, { recursive: true });
              console.log('📁 Dossier de destination créé:', modTargetPath);
            } catch (error) {
              console.error('❌ Erreur création dossier destination:', error);
              releaseLock(); // Libère le verrou en cas d'erreur
              return;
            }
          } else {
            console.log('📁 Dossier de destination existe déjà:', modTargetPath);
          }

          console.log('🚀 Démarrage extraction automatique pour:', modName);

          let extractionResult = null;
          let shouldDeleteArchive = false;

          try {
            // 📦 EXTRACTION avec échappement sécurisé des chemins ✅
            console.log('🔧 Appel de la fonction d\'extraction...');
            
            // 🛡️ Échappement sécurisé des chaînes pour éviter les erreurs JS
            const safeFullPath = JSON.stringify(fullPath);
            const safeModTargetPath = JSON.stringify(modTargetPath);
            const safeModName = JSON.stringify(modName);
            
            // 🛡️ Code d'injection plus robuste avec gestion d'erreur
            const scriptCode = `
              (async () => {
                try {
                  console.log('🔧 Début extraction JS pour:', ${safeModName});
                  console.log('📦 Archive:', ${safeFullPath});
                  console.log('📁 Destination:', ${safeModTargetPath});
                  
                  // Vérifie que electronAPI est disponible
                  if (!window.electronAPI) {
                    throw new Error('electronAPI non disponible');
                  }
                  
                  if (!window.electronAPI.extractArchive) {
                    throw new Error('extractArchive function non disponible');
                  }
                  
                  const result = await window.electronAPI.extractArchive(${safeFullPath}, ${safeModTargetPath});
                  console.log('📊 Résultat extraction JS:', result);
                  return result;
                } catch (error) {
                  console.error('❌ Erreur extraction JS:', error);
                  return { 
                    success: false, 
                    error: error.message,
                    stack: error.stack 
                  };
                }
              })()
            `;
            
            extractionResult = await win.webContents.executeJavaScript(scriptCode);

            console.log('📊 Résultat extraction reçu:', extractionResult);

            if (extractionResult && extractionResult.success) {
              if (extractionResult.hasVariants && extractionResult.pendingVariantSelection) {
                console.log('🎭 Variantes détectées, attente sélection utilisateur...');
                console.log('📋 Variantes:', extractionResult.variants?.length || 0);
                // Ne supprime pas l'archive tout de suite, attendre la sélection de variantes
                shouldDeleteArchive = false;
              } else if (extractionResult.ready) {
                console.log('✅ Extraction et installation terminées pour:', modName);
                shouldDeleteArchive = true;
                
                // Vérification finale
                try {
                  const finalCheck = fs.readdirSync(modTargetPath);
                  console.log('🔍 Vérification finale - contenu dossier:', finalCheck.length, 'éléments');
                  
                  if (finalCheck.length === 0) {
                    console.error('❌ PROBLÈME: Dossier de mod vide après extraction !');
                    shouldDeleteArchive = false;
                  }
                } catch (error) {
                  console.error('❌ Erreur vérification finale:', error);
                  shouldDeleteArchive = false;
                }
              } else {
                console.log('✅ Extraction terminée, état en attente');
                shouldDeleteArchive = true;
              }
            } else {
              console.error('❌ Échec de l\'extraction pour:', modName);
              console.error('📊 Détails erreur:', extractionResult?.error || 'Erreur inconnue');
              
              // Log plus détaillé des erreurs
              if (extractionResult?.stack) {
                console.error('📊 Stack trace:', extractionResult.stack);
              }
              
              shouldDeleteArchive = false;
              
              // Supprime le dossier de mod vide en cas d'échec
              try {
                if (fs.existsSync(modTargetPath)) {
                  const contents = fs.readdirSync(modTargetPath);
                  if (contents.length === 0) {
                    fs.rmdirSync(modTargetPath);
                    console.log('🗑️ Dossier de mod vide supprimé après échec');
                  }
                }
              } catch (cleanupError) {
                console.error('⚠️ Erreur nettoyage dossier vide:', cleanupError);
              }
            }

          } catch (error) {
            console.error('❌ Erreur lors du traitement automatique:', error);
            console.error('📊 Type d\'erreur:', error.name);
            console.error('📊 Message d\'erreur:', error.message);
            console.error('📊 Stack trace:', error.stack);
            shouldDeleteArchive = false;
          }

          // 🗑️ SUPPRESSION DU FICHIER ARCHIVE (seulement si extraction réussie)
          if (shouldDeleteArchive) {
            try {
              // Utilise aussi l'échappement pour la suppression
              const deleteScriptCode = `
                (async () => {
                  try {
                    if (window.electronAPI && window.electronAPI.deleteFile) {
                      return await window.electronAPI.deleteFile(${JSON.stringify(fullPath)});
                    } else {
                      throw new Error('deleteFile function non disponible');
                    }
                  } catch (error) {
                    console.error('❌ Erreur suppression via JS:', error);
                    return false;
                  }
                })()
              `;
              
              const deleteResult = await win.webContents.executeJavaScript(deleteScriptCode);
              
              if (deleteResult) {
                console.log('🗑️ Archive supprimée avec succès:', fullPath);
              } else {
                console.log('⚠️ Erreur suppression archive (non bloquant)');
              }
            } catch (error) {
              console.error('❌ Erreur suppression archive (non bloquant):', error);
            }
          } else {
            console.log('⚠️ Archive conservée (extraction incomplète ou en attente de sélection)');
          }

          // 🔓 LIBÉRATION DU VERROU (TOUJOURS, même en cas d'erreur)
          releaseLock();

          console.log('🏁 Traitement automatique terminé pour:', modName);
          console.log('📊 Résultat final:', {
            success: extractionResult?.success || false,
            hasVariants: extractionResult?.hasVariants || false,
            archiveDeleted: shouldDeleteArchive
          });
        } else {
          console.log('ℹ️ Fichier téléchargé n\'est pas une archive reconnue:', filename);
        }
      } else {
        console.error('❌ Échec du téléchargement:', state);
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

// 🔒 FONCTION UTILITAIRE POUR VÉRIFIER L'ÉTAT DES VERROUS (DEBUG)
function getExtractionStatus() {
  console.log('🔒 Extractions en cours:', extractionInProgress.size);
  for (const lockKey of extractionInProgress) {
    console.log('  🔐', lockKey);
  }
}

// Export pour debug si nécessaire
module.exports = { getExtractionStatus };