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
