console.log('PRELOAD FILE CHARGED');
const fs = require('fs');
const path = require('path');
const { contextBridge, ipcRenderer, shell } = require('electron');
const rimraf = require('rimraf');
const extract = require('extract-zip');
const { extractFull } = require('node-7z');
const https = require('https');
const http = require('http');

// 🔧 FONCTION UTILITAIRE POUR CORRIGER LA STRUCTURE DES DOSSIERS
function flattenModDirectory(modPath) {
  try {
    console.log('🔧 Vérification structure du mod:', modPath);
    
    if (!fs.existsSync(modPath)) {
      console.log('❌ Dossier mod inexistant:', modPath);
      return false;
    }

    let hasChanges = false;
    let iterations = 0;
    const maxIterations = 5; // Évite les boucles infinies

    // Fonction récursive pour aplatir la structure
    function flattenRecursive(currentPath) {
      if (iterations >= maxIterations) {
        console.log('⚠️ Limite d\'itérations atteinte');
        return false;
      }

      iterations++;
      console.log(`🔄 Itération ${iterations} sur:`, currentPath);

      const items = fs.readdirSync(currentPath);
      const files = items.filter(item => {
        try {
          return fs.statSync(path.join(currentPath, item)).isFile();
        } catch {
          return false;
        }
      });
      const folders = items.filter(item => {
        try {
          return fs.statSync(path.join(currentPath, item)).isDirectory();
        } catch {
          return false;
        }
      });

      console.log(`📁 Trouvé: ${files.length} fichiers, ${folders.length} dossiers`);

      // Cas 1: Aucun fichier à la racine, un seul sous-dossier
      if (files.length === 0 && folders.length === 1) {
        const subFolder = folders[0];
        const subFolderPath = path.join(currentPath, subFolder);
        
        console.log('📦 Déplacement du contenu de:', subFolder);
        
        try {
          // Liste tout le contenu du sous-dossier
          const subItems = fs.readdirSync(subFolderPath);
          
          // Déplace chaque élément vers la racine
          for (const item of subItems) {
            const srcPath = path.join(subFolderPath, item);
            const destPath = path.join(currentPath, item);
            
            // Évite les conflits de noms
            if (fs.existsSync(destPath)) {
              console.log(`⚠️ Conflit détecté pour: ${item}, ignoré`);
              continue;
            }
            
            try {
              fs.renameSync(srcPath, destPath);
              console.log(`✅ Déplacé: ${item}`);
              hasChanges = true;
            } catch (error) {
              console.error(`❌ Erreur déplacement ${item}:`, error.message);
            }
          }
          
          // Vérifie si le dossier est maintenant vide
          const remainingItems = fs.readdirSync(subFolderPath);
          if (remainingItems.length === 0) {
            try {
              fs.rmdirSync(subFolderPath);
              console.log(`🗑️ Dossier vide supprimé: ${subFolder}`);
            } catch (error) {
              console.error(`❌ Erreur suppression dossier ${subFolder}:`, error.message);
            }
          }
          
          // Vérifie à nouveau récursivement
          return flattenRecursive(currentPath);
          
        } catch (error) {
          console.error('❌ Erreur lors du traitement du sous-dossier:', error);
          return false;
        }
      }
      
      // Cas 2: Plusieurs dossiers mais certains peuvent être des wrappers inutiles
      else if (folders.length > 0) {
        console.log('🔍 Vérification des sous-dossiers suspects...');
        
        // Cherche des dossiers avec des noms suspects (wrappers)
        for (const folder of folders) {
          const folderPath = path.join(currentPath, folder);
          
          try {
            const subItems = fs.readdirSync(folderPath);
            const subFiles = subItems.filter(item => {
              try {
                return fs.statSync(path.join(folderPath, item)).isFile();
              } catch {
                return false;
              }
            });
            const subFolders = subItems.filter(item => {
              try {
                return fs.statSync(path.join(folderPath, item)).isDirectory();
              } catch {
                return false;
              }
            });
            
            // Si le dossier ne contient qu'un seul sous-dossier et aucun fichier
            if (subFiles.length === 0 && subFolders.length === 1) {
              console.log('🎯 Dossier wrapper détecté:', folder);
              return flattenRecursive(folderPath);
            }
          } catch (error) {
            console.error(`❌ Erreur analyse dossier ${folder}:`, error.message);
          }
        }
      }
      
      return true;
    }

    const success = flattenRecursive(modPath);
    
    if (hasChanges) {
      console.log('✅ Structure du mod corrigée avec succès');
    } else {
      console.log('ℹ️ Aucune correction nécessaire');
    }
    
    return { success, hasChanges };
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction de structure:', error);
    return { success: false, hasChanges: false, error: error.message };
  }
}

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

  // 🆕 FONCTION POUR CORRIGER LA STRUCTURE DES DOSSIERS DE MODS
  flattenModDirectory: (modPath) => {
    console.log('🔧 Appel flattenModDirectory pour:', modPath);
    return flattenModDirectory(modPath);
  },

  extractArchive: async (archivePath, destPath) => {
    const ext = path.extname(archivePath).toLowerCase();
    try {
      console.log('📦 Extraction de:', archivePath, 'vers:', destPath);
      
      let extractSuccess = false;
      
      if (ext === '.zip') {
        await extract(archivePath, { dir: destPath });
        extractSuccess = true;
      } else if (ext === '.rar' || ext === '.7z') {
        extractSuccess = await new Promise((resolve, reject) => {
          extractFull(archivePath, destPath, {})
            .on('end', () => resolve(true))
            .on('error', err => reject(err));
        });
      }

      if (extractSuccess) {
        console.log('✅ Extraction terminée, vérification de la structure...');
        
        // 🆕 CORRECTION AUTOMATIQUE DE LA STRUCTURE
        const flattened = flattenModDirectory(destPath);
        if (flattened.success && flattened.hasChanges) {
          console.log('🎯 Structure du mod normalisée automatiquement');
        } else if (flattened.success && !flattened.hasChanges) {
          console.log('ℹ️ Structure du mod déjà correcte');
        } else {
          console.log('⚠️ Impossible de normaliser la structure:', flattened.error);
        }
      }
      
      return extractSuccess;
    } catch (e) {
      console.error('❌ Erreur extraction:', e);
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