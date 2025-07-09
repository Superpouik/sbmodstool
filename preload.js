console.log('PRELOAD FILE CHARGED');
const fs = require('fs');
const path = require('path');
const { contextBridge, ipcRenderer, shell } = require('electron');
const rimraf = require('rimraf');
const extract = require('extract-zip');
const { extractFull } = require('node-7z');
const https = require('https');
const http = require('http');

// 🔧 FONCTION CORRIGÉE POUR CORRIGER LA STRUCTURE DES DOSSIERS
function flattenModDirectory(modPath) {
  try {
    console.log('🔧 Vérification structure du mod:', modPath);
    
    if (!fs.existsSync(modPath)) {
      console.log('❌ Dossier mod inexistant:', modPath);
      return { success: false, error: 'Dossier inexistant' };
    }

    let hasChanges = false;
    const gameFileExtensions = ['.pak', '.ucas', '.utoc'];
    
    // 🆕 Scanner récursivement pour trouver tous les fichiers de jeu
    const gameFilesFound = [];
    
    function scanForGameFiles(dirPath, relativePath = '') {
      try {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const relativeItemPath = path.join(relativePath, item);
          
          try {
            const stat = fs.statSync(itemPath);
            
            if (stat.isFile()) {
              const ext = path.extname(item).toLowerCase();
              if (gameFileExtensions.includes(ext)) {
                gameFilesFound.push({
                  fullPath: itemPath,
                  relativePath: relativeItemPath,
                  fileName: item,
                  isAtRoot: relativePath === ''
                });
              }
            } else if (stat.isDirectory()) {
              // Scan récursif des sous-dossiers
              scanForGameFiles(itemPath, relativeItemPath);
            }
          } catch (error) {
            console.error(`❌ Erreur lecture item ${item}:`, error.message);
          }
        }
      } catch (error) {
        console.error(`❌ Erreur scan dossier ${dirPath}:`, error.message);
      }
    }

    // Scanner tous les fichiers de jeu
    scanForGameFiles(modPath);
    
    if (gameFilesFound.length === 0) {
      console.log('ℹ️ Aucun fichier de jeu trouvé dans ce mod');
      return { success: true, hasChanges: false, message: 'Aucun fichier de jeu trouvé' };
    }

    console.log(`📊 Trouvé ${gameFilesFound.length} fichier(s) de jeu`);
    
    // Vérifier si tous les fichiers de jeu sont déjà à la racine
    const filesAtRoot = gameFilesFound.filter(file => file.isAtRoot);
    const filesInSubdirs = gameFilesFound.filter(file => !file.isAtRoot);
    
    console.log(`📁 À la racine: ${filesAtRoot.length}, Dans sous-dossiers: ${filesInSubdirs.length}`);
    
    if (filesInSubdirs.length === 0) {
      console.log('ℹ️ Tous les fichiers de jeu sont déjà à la racine');
      return { success: true, hasChanges: false, message: 'Structure déjà correcte' };
    }

    // 🔧 CORRECTION : Déplacer tous les fichiers de jeu vers la racine
    console.log('🚀 Déplacement des fichiers de jeu vers la racine...');
    
    for (const file of filesInSubdirs) {
      const sourcePath = file.fullPath;
      const destPath = path.join(modPath, file.fileName);
      
      try {
        // Vérifier s'il y a un conflit de nom
        let finalDestPath = destPath;
        let counter = 1;
        
        while (fs.existsSync(finalDestPath)) {
          const nameWithoutExt = path.parse(file.fileName).name;
          const ext = path.parse(file.fileName).ext;
          finalDestPath = path.join(modPath, `${nameWithoutExt}_${counter}${ext}`);
          counter++;
        }
        
        // Déplacer le fichier
        fs.renameSync(sourcePath, finalDestPath);
        console.log(`✅ Déplacé: ${file.relativePath} → ${path.basename(finalDestPath)}`);
        hasChanges = true;
        
      } catch (error) {
        console.error(`❌ Erreur déplacement ${file.fileName}:`, error.message);
      }
    }

    // 🧹 NETTOYAGE : Supprimer les dossiers vides après déplacement
    function cleanupEmptyDirectories(dirPath) {
      try {
        const items = fs.readdirSync(dirPath);
        
        // Nettoie récursivement les sous-dossiers d'abord
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          try {
            const stat = fs.statSync(itemPath);
            if (stat.isDirectory()) {
              cleanupEmptyDirectories(itemPath);
            }
          } catch (error) {
            // Ignore les erreurs de lecture
          }
        }
        
        // Vérifie si le dossier est maintenant vide
        const remainingItems = fs.readdirSync(dirPath);
        if (remainingItems.length === 0 && dirPath !== modPath) {
          try {
            fs.rmdirSync(dirPath);
            console.log(`🗑️ Dossier vide supprimé: ${path.relative(modPath, dirPath)}`);
          } catch (error) {
            console.error(`⚠️ Impossible de supprimer ${dirPath}:`, error.message);
          }
        }
        
      } catch (error) {
        // Ignore les erreurs de nettoyage
      }
    }

    if (hasChanges) {
      console.log('🧹 Nettoyage des dossiers vides...');
      cleanupEmptyDirectories(modPath);
    }

    if (hasChanges) {
      console.log('✅ Structure du mod corrigée avec succès');
      return { success: true, hasChanges, message: `${filesInSubdirs.length} fichier(s) déplacé(s) vers la racine` };
    } else {
      console.log('ℹ️ Aucune correction nécessaire');
      return { success: true, hasChanges: false, message: 'Aucune correction nécessaire' };
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction de structure:', error);
    return { success: false, hasChanges: false, error: error.message };
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

// 🆕 FONCTION POUR INSTALLER PLUSIEURS VARIANTES (MODS MODULAIRES)
function installMultipleVariants(modPath, selectedVariants, allVariants) {
  try {
    console.log('⚙️ Installation de variants multiples:', selectedVariants.map(v => v.name));

    // Patterns pour détecter la priorité des composants
    const requiredPatterns = [
      /^(core|base|main|principal|required)$/i
    ];

    // Trie les variants par priorité (requis en premier, puis par taille)
    const sortedVariants = selectedVariants.sort((a, b) => {
      const aRequired = requiredPatterns.some(pattern => pattern.test(a.name));
      const bRequired = requiredPatterns.some(pattern => pattern.test(b.name));
      
      if (aRequired && !bRequired) return -1;
      if (!aRequired && bRequired) return 1;
      return b.sizeBytes - a.sizeBytes; // Plus gros en premier
    });

    // Collecte tous les fichiers à installer avec gestion des conflits
    const filesToInstall = new Map(); // chemin relatif -> { source, priority, variant }
    
    for (let i = 0; i < sortedVariants.length; i++) {
      const variant = sortedVariants[i];
      const priority = sortedVariants.length - i; // Plus prioritaire = plus haut

      console.log(`📦 Traitement variant "${variant.name}" (priorité: ${priority})`);
      
      collectVariantFiles(variant.path, '', filesToInstall, priority, variant.name);
    }

    // Installe les fichiers dans l'ordre de priorité
    let installedCount = 0;
    for (const [relativePath, fileInfo] of filesToInstall) {
      const sourcePath = fileInfo.source;
      const destPath = path.join(modPath, relativePath);
      
      try {
        // Crée le dossier de destination si nécessaire
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        // Copie le fichier
        fs.copyFileSync(sourcePath, destPath);
        installedCount++;
        console.log(`✅ Installé: ${relativePath} (de ${fileInfo.variant})`);
        
      } catch (error) {
        console.error(`❌ Erreur installation ${relativePath}:`, error.message);
      }
    }

    // Supprime tous les dossiers de variants originaux
    for (const variant of allVariants) {
      try {
        if (fs.existsSync(variant.path)) {
          rimraf.sync(variant.path);
          console.log(`🗑️ Dossier variant supprimé: ${variant.name}`);
        }
      } catch (error) {
        console.error(`❌ Erreur suppression ${variant.name}:`, error.message);
      }
    }

    console.log(`✅ Installation multiple terminée: ${installedCount} fichiers installés`);
    return { 
      success: true, 
      installedVariants: selectedVariants.map(v => v.name),
      fileCount: installedCount 
    };

  } catch (error) {
    console.error('❌ Erreur installation multiple:', error);
    return { success: false, error: error.message };
  }
}

// 🆕 FONCTION POUR COLLECTER RÉCURSIVEMENT TOUS LES FICHIERS D'UN VARIANT
function collectVariantFiles(variantPath, relativePath, filesToInstall, priority, variantName) {
  try {
    const items = fs.readdirSync(path.join(variantPath, relativePath));

    for (const item of items) {
      const itemPath = path.join(variantPath, relativePath, item);
      const relativeItemPath = path.join(relativePath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        // Récursion pour les sous-dossiers
        collectVariantFiles(variantPath, relativeItemPath, filesToInstall, priority, variantName);
      } else if (stat.isFile()) {
        // Ajoute le fichier s'il n'existe pas ou si la priorité est plus élevée
        const normalizedPath = relativeItemPath.replace(/\\/g, '/');
        
        if (!filesToInstall.has(normalizedPath) || filesToInstall.get(normalizedPath).priority < priority) {
          filesToInstall.set(normalizedPath, {
            source: itemPath,
            priority: priority,
            variant: variantName
          });
        } else {
          console.log(`⚠️ Conflit fichier: ${normalizedPath} - priorité ${filesToInstall.get(normalizedPath).variant} > ${variantName}`);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Erreur collecte fichiers ${variantName}:`, error.message);
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

// 🆕 FONCTION DE CORRECTION AGRESSIVE
function aggressiveFlattenModDirectory(modPath) {
  try {
    console.log('⚡ Correction agressive de la structure:', modPath);
    
    if (!fs.existsSync(modPath)) {
      return { success: false, error: 'Dossier inexistant' };
    }

    const gameFileExtensions = ['.pak', '.ucas', '.utoc'];
    let hasChanges = false;
    let filesMoved = 0;
    
    // Fonction pour remonter TOUS les fichiers de jeu à la racine
    function moveAllGameFilesToRoot(currentDir, targetDir = modPath) {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const itemPath = path.join(currentDir, item);
        
        try {
          const stat = fs.statSync(itemPath);
          
          if (stat.isFile()) {
            const ext = path.extname(item).toLowerCase();
            if (gameFileExtensions.includes(ext)) {
              // C'est un fichier de jeu, le déplacer vers la racine
              const destPath = path.join(targetDir, item);
              
              // Gestion des conflits de noms
              let finalDest = destPath;
              let counter = 1;
              while (fs.existsSync(finalDest)) {
                const nameBase = path.parse(item).name;
                const ext = path.parse(item).ext;
                finalDest = path.join(targetDir, `${nameBase}_${counter}${ext}`);
                counter++;
              }
              
              try {
                fs.renameSync(itemPath, finalDest);
                console.log(`✅ Remonté: ${path.relative(modPath, itemPath)} → ${path.basename(finalDest)}`);
                hasChanges = true;
                filesMoved++;
              } catch (error) {
                console.error(`❌ Erreur remontée ${item}:`, error.message);
              }
            }
          } else if (stat.isDirectory()) {
            // Traitement récursif des sous-dossiers
            moveAllGameFilesToRoot(itemPath, targetDir);
          }
        } catch (error) {
          console.error(`❌ Erreur traitement ${item}:`, error.message);
        }
      }
    }
    
    // Remonte tous les fichiers de jeu
    moveAllGameFilesToRoot(modPath);
    
    // Nettoyage des dossiers vides
    function cleanupEmptyDirs(dirPath) {
      if (dirPath === modPath) return;
      
      try {
        const items = fs.readdirSync(dirPath);
        
        // Nettoie les sous-dossiers d'abord
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          if (fs.statSync(itemPath).isDirectory()) {
            cleanupEmptyDirs(itemPath);
          }
        }
        
        // Vérifie si vide maintenant
        const remainingItems = fs.readdirSync(dirPath);
        if (remainingItems.length === 0) {
          fs.rmdirSync(dirPath);
          console.log(`🗑️ Dossier vide supprimé: ${path.relative(modPath, dirPath)}`);
        }
      } catch (error) {
        // Ignore les erreurs de nettoyage
      }
    }
    
    // Collecte et nettoie tous les dossiers
    const allDirs = [];
    function collectDirs(dirPath) {
      try {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          if (fs.statSync(itemPath).isDirectory()) {
            allDirs.push(itemPath);
            collectDirs(itemPath);
          }
        }
      } catch (error) {
        // Ignore les erreurs
      }
    }
    
    collectDirs(modPath);
    
    // Nettoie du plus profond au plus superficiel
    allDirs.reverse().forEach(cleanupEmptyDirs);
    
    return { 
      success: true, 
      hasChanges, 
      message: hasChanges ? `${filesMoved} fichier(s) remonté(s) vers la racine (mode agressif)` : 'Aucun fichier à déplacer'
    };
    
  } catch (error) {
    console.error('❌ Erreur correction agressive:', error);
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

  // 🔧 FONCTION POUR CORRIGER LA STRUCTURE DES DOSSIERS DE MODS
  flattenModDirectory: (modPath) => {
    console.log('🔧 Appel flattenModDirectory pour:', modPath);
    return flattenModDirectory(modPath);
  },

  // ⚡ FONCTION DE CORRECTION AGRESSIVE
  aggressiveFlattenModDirectory: (modPath) => {
    console.log('⚡ Appel aggressiveFlattenModDirectory pour:', modPath);
    return aggressiveFlattenModDirectory(modPath);
  },

  // 🆕 NOUVELLES FONCTIONS POUR LES VARIANTES
  detectModVariants: (modPath) => {
    return detectModVariants(modPath);
  },
  
  installModVariant: (modPath, chosenVariant, allVariants) => {
    return installModVariant(modPath, chosenVariant, allVariants);
  },

  // 🆕 FONCTION POUR INSTALLER PLUSIEURS VARIANTES
  installMultipleVariants: (modPath, selectedVariants, allVariants) => {
    return installMultipleVariants(modPath, selectedVariants, allVariants);
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
