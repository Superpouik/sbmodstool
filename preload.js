console.log('PRELOAD FILE CHARGED');
const fs = require('fs');
const path = require('path');
const { contextBridge, ipcRenderer, shell } = require('electron');
const rimraf = require('rimraf');
const extract = require('extract-zip');
const { extractFull } = require('node-7z');
const https = require('https');
const http = require('http');

// 🔧 FONCTION AMÉLIORÉE POUR CORRIGER LA STRUCTURE DES DOSSIERS
function flattenModDirectory(modPath) {
  try {
    console.log('🔧 Correction de structure pour:', modPath);
    
    if (!fs.existsSync(modPath)) {
      console.log('❌ Dossier mod inexistant:', modPath);
      return { success: false, error: 'Dossier inexistant' };
    }

    const gameFileExtensions = ['.pak', '.ucas', '.utoc'];
    let hasChanges = false;
    let movedFiles = [];

    // 📁 ÉTAPE 1: Trouve tous les fichiers de jeu dans tout l'arbre
    function findGameFilesRecursively(dirPath, relativePath = '') {
      const gameFiles = [];
      
      try {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
          const fullPath = path.join(dirPath, item);
          const relativeFromRoot = path.join(relativePath, item);
          
          try {
            const stat = fs.statSync(fullPath);
            
            if (stat.isFile()) {
              const ext = path.extname(item).toLowerCase();
              if (gameFileExtensions.includes(ext)) {
                gameFiles.push({
                  name: item,
                  fullPath: fullPath,
                  relativePath: relativeFromRoot,
                  isInRoot: relativePath === ''
                });
              }
            } else if (stat.isDirectory()) {
              // Récursion dans les sous-dossiers
              const subFiles = findGameFilesRecursively(fullPath, relativeFromRoot);
              gameFiles.push(...subFiles);
            }
          } catch (error) {
            console.error(`❌ Erreur accès ${item}:`, error.message);
          }
        }
      } catch (error) {
        console.error(`❌ Erreur lecture dossier ${dirPath}:`, error.message);
      }
      
      return gameFiles;
    }

    // 🔍 Trouve tous les fichiers de jeu
    const allGameFiles = findGameFilesRecursively(modPath);
    console.log(`📦 Fichiers de jeu trouvés: ${allGameFiles.length}`);
    
    if (allGameFiles.length === 0) {
      console.log('ℹ️ Aucun fichier de jeu trouvé');
      return { success: true, hasChanges: false, message: 'Aucun fichier de jeu trouvé' };
    }

    // 📊 Affiche les fichiers trouvés
    allGameFiles.forEach(file => {
      console.log(`  📄 ${file.name} -> ${file.relativePath} ${file.isInRoot ? '(déjà à la racine)' : ''}`);
    });

    // 🚀 ÉTAPE 2: Déplace tous les fichiers de jeu vers la racine
    for (const gameFile of allGameFiles) {
      if (!gameFile.isInRoot) {
        const targetPath = path.join(modPath, gameFile.name);
        
        // Vérifie les conflits de noms
        if (fs.existsSync(targetPath)) {
          console.log(`⚠️ Conflit détecté pour ${gameFile.name}, renommage...`);
          
          // Trouve un nom unique
          let counter = 1;
          let uniqueName = gameFile.name;
          const nameWithoutExt = path.parse(gameFile.name).name;
          const ext = path.parse(gameFile.name).ext;
          
          while (fs.existsSync(path.join(modPath, uniqueName))) {
            uniqueName = `${nameWithoutExt}_${counter}${ext}`;
            counter++;
          }
          
          console.log(`🔄 Renommage: ${gameFile.name} -> ${uniqueName}`);
          gameFile.name = uniqueName;
        }
        
        try {
          const finalTargetPath = path.join(modPath, gameFile.name);
          fs.renameSync(gameFile.fullPath, finalTargetPath);
          console.log(`✅ Déplacé: ${gameFile.relativePath} -> ${gameFile.name}`);
          movedFiles.push(gameFile.name);
          hasChanges = true;
        } catch (error) {
          console.error(`❌ Erreur déplacement ${gameFile.name}:`, error.message);
        }
      }
    }

    // 🧹 ÉTAPE 3: Nettoie les dossiers vides (mais pas la racine)
    function cleanEmptyDirectories(dirPath, isRoot = false) {
      if (isRoot) return; // Ne supprime jamais la racine
      
      try {
        const items = fs.readdirSync(dirPath);
        
        // Nettoie d'abord les sous-dossiers
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          try {
            const stat = fs.statSync(itemPath);
            if (stat.isDirectory()) {
              cleanEmptyDirectories(itemPath, false);
            }
          } catch (error) {
            // Ignore les erreurs
          }
        }
        
        // Vérifie si le dossier est maintenant vide
        const remainingItems = fs.readdirSync(dirPath);
        if (remainingItems.length === 0) {
          fs.rmdirSync(dirPath);
          console.log(`🗑️ Dossier vide supprimé: ${path.relative(modPath, dirPath)}`);
        }
      } catch (error) {
        // Ignore les erreurs de nettoyage
      }
    }

    // Nettoie les dossiers vides, en partant des sous-dossiers
    try {
      const rootItems = fs.readdirSync(modPath);
      for (const item of rootItems) {
        const itemPath = path.join(modPath, item);
        try {
          const stat = fs.statSync(itemPath);
          if (stat.isDirectory()) {
            cleanEmptyDirectories(itemPath, false);
          }
        } catch (error) {
          // Ignore les erreurs
        }
      }
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error.message);
    }

    // 📊 RÉSULTAT
    if (hasChanges) {
      console.log(`✅ Structure corrigée: ${movedFiles.length} fichier(s) déplacé(s)`);
      return { 
        success: true, 
        hasChanges: true, 
        movedFiles: movedFiles,
        message: `${movedFiles.length} fichier(s) de jeu déplacé(s) vers la racine`
      };
    } else {
      console.log('ℹ️ Tous les fichiers de jeu sont déjà à la racine');
      return { 
        success: true, 
        hasChanges: false, 
        message: 'Tous les fichiers de jeu sont déjà correctement placés'
      };
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction de structure:', error);
    return { 
      success: false, 
      hasChanges: false, 
      error: error.message 
    };
  }
}

// 🆕 FONCTION POUR DÉTECTER LES VARIANTES DE MODS
function detectModVariants(modPath) {
  try {
    console.log('🔍 Détection des variantes pour:', modPath);
    
    if (!fs.existsSync(modPath)) {
      return { hasVariants: false, variants: [] };
    }

    const items = fs.readdirSync(modPath);
    const folders = items.filter(item => {
      try {
        return fs.statSync(path.join(modPath, item)).isDirectory();
      } catch {
        return false;
      }
    });

    // Vérifie quels dossiers contiennent des fichiers de jeu
    const variants = [];
    const gameFileExtensions = ['.pak', '.ucas', '.utoc'];

    for (const folder of folders) {
      const folderPath = path.join(modPath, folder);
      
      try {
        const folderContents = fs.readdirSync(folderPath);
        let hasGameFiles = false;
        let gameFilesCount = 0;
        
        // Scan récursif pour trouver les fichiers de jeu
        function scanForGameFiles(dirPath) {
          const items = fs.readdirSync(dirPath);
          
          for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isFile()) {
              const ext = path.extname(item).toLowerCase();
              if (gameFileExtensions.includes(ext)) {
                hasGameFiles = true;
                gameFilesCount++;
              }
            } else if (stat.isDirectory()) {
              // Scan récursif des sous-dossiers
              try {
                scanForGameFiles(itemPath);
              } catch (error) {
                // Ignore les erreurs de sous-dossiers
              }
            }
          }
        }
        
        scanForGameFiles(folderPath);
        
        if (hasGameFiles) {
          // Calcule la taille du dossier
          let totalSize = 0;
          function calculateSize(dirPath) {
            try {
              const items = fs.readdirSync(dirPath);
              for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const stat = fs.statSync(itemPath);
                if (stat.isFile()) {
                  totalSize += stat.size;
                } else if (stat.isDirectory()) {
                  calculateSize(itemPath);
                }
              }
            } catch (error) {
              // Ignore les erreurs
            }
          }
          calculateSize(folderPath);
          
          variants.push({
            name: folder,
            path: folderPath,
            gameFilesCount,
            sizeBytes: totalSize,
            sizeFormatted: formatBytes(totalSize)
          });
        }
      } catch (error) {
        console.error(`❌ Erreur scan dossier ${folder}:`, error.message);
      }
    }

    const hasVariants = variants.length > 1;
    
    console.log(`🎯 Détection terminée: ${variants.length} variante(s) trouvée(s)`);
    if (hasVariants) {
      console.log('📋 Variantes détectées:', variants.map(v => v.name));
    }

    return { hasVariants, variants };
    
  } catch (error) {
    console.error('❌ Erreur détection variantes:', error);
    return { hasVariants: false, variants: [] };
  }
}

// 🆕 FONCTION POUR INSTALLER UNE VARIANTE CHOISIE
function installModVariant(modPath, chosenVariant, allVariants) {
  try {
    console.log('⚙️ Installation de la variante:', chosenVariant.name);
    
    const variantPath = chosenVariant.path;
    
    // 1. Déplace tous les fichiers de la variante choisie vers la racine
    const variantContents = fs.readdirSync(variantPath);
    
    for (const item of variantContents) {
      const srcPath = path.join(variantPath, item);
      const destPath = path.join(modPath, item);
      
      try {
        // Évite les conflits en supprimant le fichier de destination s'il existe
        if (fs.existsSync(destPath)) {
          const stat = fs.statSync(destPath);
          if (stat.isDirectory()) {
            rimraf.sync(destPath);
          } else {
            fs.unlinkSync(destPath);
          }
        }
        
        fs.renameSync(srcPath, destPath);
        console.log(`✅ Déplacé: ${item}`);
      } catch (error) {
        console.error(`❌ Erreur déplacement ${item}:`, error.message);
      }
    }
    
    // 2. Supprime tous les dossiers de variantes (y compris celui choisi, maintenant vide)
    for (const variant of allVariants) {
      try {
        if (fs.existsSync(variant.path)) {
          rimraf.sync(variant.path);
          console.log(`🗑️ Dossier variante supprimé: ${variant.name}`);
        }
      } catch (error) {
        console.error(`❌ Erreur suppression ${variant.name}:`, error.message);
      }
    }
    
    console.log('✅ Installation de variante terminée');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Erreur installation variante:', error);
    return { success: false, error: error.message };
  }
}

// Fonction utilitaire pour formater les tailles
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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

  // 🆕 NOUVELLES FONCTIONS POUR LES VARIANTES
  detectModVariants: (modPath) => {
    return detectModVariants(modPath);
  },
  
  installModVariant: (modPath, chosenVariant, allVariants) => {
    return installModVariant(modPath, chosenVariant, allVariants);
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
        
        // 🆕 ÉTAPE 1: Correction automatique de la structure
        const flattened = flattenModDirectory(destPath);
        if (flattened.success && flattened.hasChanges) {
          console.log('🎯 Structure du mod normalisée automatiquement');
        } else if (flattened.success && !flattened.hasChanges) {
          console.log('ℹ️ Structure du mod déjà correcte');
        } else {
          console.log('⚠️ Impossible de normaliser la structure:', flattened.error);
        }
        
        // 🆕 ÉTAPE 2: Détection des variantes
        const variantDetection = detectModVariants(destPath);
        
        if (variantDetection.hasVariants) {
          console.log('🎭 Variantes détectées, ouverture du sélecteur...');
          
          // Signale qu'il faut afficher le sélecteur de variantes
          // Le renderer va recevoir cette info et afficher le popup
          setTimeout(() => {
            ipcRenderer.send('show-variant-selector', {
              modPath: destPath,
              variants: variantDetection.variants
            });
          }, 500);
          
          // Retourne un statut spécial indiquant qu'il faut attendre la sélection
          return { 
            success: true, 
            hasVariants: true, 
            variants: variantDetection.variants,
            pendingVariantSelection: true 
          };
        }
      }
      
      return { success: extractSuccess, hasVariants: false };
    } catch (e) {
      console.error('❌ Erreur extraction:', e);
      return { success: false, hasVariants: false, error: e.message };
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
  
  // 🆕 LISTENER POUR SÉLECTEUR DE VARIANTES
  onVariantSelectorRequest: (callback) => {
    ipcRenderer.on('show-variant-selector', (event, data) => callback(event, data));
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
