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
function flattenModDirectory(modPath, aggressive = false) {
  try {
    console.log('🔧 Vérification structure du mod:', modPath, aggressive ? '(mode agressif)' : '(mode standard)');
    
    if (!fs.existsSync(modPath)) {
      console.log('❌ Dossier mod inexistant:', modPath);
      return { success: false, hasChanges: false, error: 'Dossier inexistant' };
    }

    let hasChanges = false;
    let iterations = 0;
    const maxIterations = aggressive ? 15 : 8;

    // Extensions de fichiers de jeu reconnues
    const gameFileExtensions = ['.pak', '.ucas', '.utoc'];
    
    // Fonction récursive pour aplatir la structure
    function flattenRecursive(currentPath) {
      if (iterations >= maxIterations) {
        console.log('⚠️ Limite d\'itérations atteinte');
        return true;
      }

      iterations++;
      console.log(`🔄 Itération ${iterations} sur:`, currentPath);

      let items;
      try {
        items = fs.readdirSync(currentPath);
      } catch (error) {
        console.error('❌ Erreur lecture dossier:', error.message);
        return false;
      }

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

      // Mode agressif : REMONTE TOUS LES FICHIERS DE JEU TROUVÉS
      if (aggressive && folders.length > 0) {
        console.log('🚀 Mode agressif : recherche de TOUS les fichiers de jeu...');
        
        for (const folder of folders) {
          const folderPath = path.join(currentPath, folder);
          
          try {
            // Fonction pour chercher et remonter TOUS les fichiers de jeu
            function moveAllGameFiles(dirPath, targetRoot) {
              const items = fs.readdirSync(dirPath);
              
              for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const stat = fs.statSync(itemPath);
                
                if (stat.isFile()) {
                  const ext = path.extname(item).toLowerCase();
                  if (gameFileExtensions.includes(ext)) {
                    const destPath = path.join(targetRoot, item);
                    
                    // Évite les conflits de noms
                    let finalDestPath = destPath;
                    let counter = 1;
                    while (fs.existsSync(finalDestPath)) {
                      const baseName = path.basename(item, ext);
                      finalDestPath = path.join(targetRoot, `${baseName}_${counter}${ext}`);
                      counter++;
                    }
                    
                    try {
                      fs.copyFileSync(itemPath, finalDestPath);
                      console.log(`✅ Fichier de jeu remonté: ${item} → ${path.basename(finalDestPath)}`);
                      hasChanges = true;
                      
                      // Supprime l'original
                      fs.unlinkSync(itemPath);
                    } catch (error) {
                      console.error(`❌ Erreur remontée ${item}:`, error.message);
                    }
                  }
                } else if (stat.isDirectory()) {
                  // Récursion dans les sous-dossiers
                  moveAllGameFiles(itemPath, targetRoot);
                }
              }
            }
            
            moveAllGameFiles(folderPath, currentPath);
            
          } catch (error) {
            console.error(`❌ Erreur scan agressif ${folder}:`, error.message);
          }
        }
        
        // Nettoie les dossiers vides
        if (hasChanges) {
          console.log('🧹 Nettoyage des dossiers vides...');
          for (const folder of folders) {
            const folderPath = path.join(currentPath, folder);
            try {
              function removeIfEmpty(dirPath) {
                const items = fs.readdirSync(dirPath);
                
                // Nettoie récursivement
                for (const item of items) {
                  const itemPath = path.join(dirPath, item);
                  if (fs.statSync(itemPath).isDirectory()) {
                    removeIfEmpty(itemPath);
                  }
                }
                
                // Supprime si vide
                const remainingItems = fs.readdirSync(dirPath);
                if (remainingItems.length === 0) {
                  fs.rmdirSync(dirPath);
                  console.log(`🗑️ Dossier vide supprimé: ${path.relative(currentPath, dirPath)}`);
                }
              }
              
              if (fs.existsSync(folderPath)) {
                removeIfEmpty(folderPath);
              }
            } catch (error) {
              // Ignore les erreurs de nettoyage
            }
          }
        }
      }
      
      // Mode standard OU après le mode agressif : traite les wrappers classiques
      else {
        // Cas 1: Aucun fichier à la racine, un seul sous-dossier
        if (files.length === 0 && folders.length === 1) {
          const subFolder = folders[0];
          const subFolderPath = path.join(currentPath, subFolder);
          
          console.log('📦 Déplacement du contenu de:', subFolder);
          
          try {
            const subItems = fs.readdirSync(subFolderPath);
            
            for (const item of subItems) {
              const srcPath = path.join(subFolderPath, item);
              const destPath = path.join(currentPath, item);
              
              if (!fs.existsSync(destPath)) {
                try {
                  fs.renameSync(srcPath, destPath);
                  console.log(`✅ Déplacé: ${item}`);
                  hasChanges = true;
                } catch (error) {
                  console.error(`❌ Erreur déplacement ${item}:`, error.message);
                }
              } else {
                console.log(`⚠️ Conflit évité pour: ${item}`);
              }
            }
            
            // Supprime le dossier vide
            try {
              const remainingItems = fs.readdirSync(subFolderPath);
              if (remainingItems.length === 0) {
                fs.rmdirSync(subFolderPath);
                console.log(`🗑️ Dossier vide supprimé: ${subFolder}`);
                hasChanges = true;
              }
            } catch (error) {
              console.error(`❌ Erreur suppression dossier ${subFolder}:`, error.message);
            }
            
            // Récursion
            return flattenRecursive(currentPath);
            
          } catch (error) {
            console.error('❌ Erreur lors du traitement du sous-dossier:', error);
            return false;
          }
        }
        
        // Cas 2: Cherche des wrappers suspects
        else if (folders.length > 0) {
          console.log('🔍 Vérification des wrappers suspects...');
          
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
              
              // Wrapper classique : un seul sous-dossier, aucun fichier
              if (subFiles.length === 0 && subFolders.length === 1) {
                console.log('🎯 Wrapper détecté:', folder);
                return flattenRecursive(folderPath);
              }
            } catch (error) {
              console.error(`❌ Erreur analyse dossier ${folder}:`, error.message);
            }
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

// 🆕 FONCTION POUR DÉTECTER LES VARIANTES DE MODS - VERSION CORRIGÉE ✅
function detectModVariants(modPath) {
  try {
    console.log('🔍 Détection des variantes pour:', modPath);
    
    if (!fs.existsSync(modPath)) {
      console.log('❌ Dossier mod inexistant:', modPath);
      return { hasVariants: false, variants: [] };
    }

    const items = fs.readdirSync(modPath);
    console.log('📁 Éléments dans le dossier:', items.length, items);
    
    // Sépare les fichiers des dossiers
    const files = items.filter(item => {
      try {
        return fs.statSync(path.join(modPath, item)).isFile();
      } catch {
        return false;
      }
    });
    
    const folders = items.filter(item => {
      try {
        return fs.statSync(path.join(modPath, item)).isDirectory();
      } catch {
        return false;
      }
    });
    
    console.log('📄 Fichiers trouvés:', files.length, files);
    console.log('📁 Dossiers trouvés:', folders.length, folders);

    // Extensions de fichiers de jeu reconnues
    const gameFileExtensions = ['.pak', '.ucas', '.utoc'];
    
    // Vérifie s'il y a des fichiers de jeu à la racine
    const rootGameFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return gameFileExtensions.includes(ext);
    });
    
    console.log('🎮 Fichiers de jeu à la racine:', rootGameFiles.length, rootGameFiles);
    
    // Si il y a des fichiers de jeu à la racine ET pas de dossiers,
    // c'est un mod simple sans variantes
    if (rootGameFiles.length > 0 && folders.length === 0) {
      console.log('✅ Mod simple détecté (fichiers à la racine, pas de sous-dossiers)');
      return { hasVariants: false, variants: [] };
    }
    
    // Si il y a des fichiers de jeu à la racine ET des dossiers,
    // c'est potentiellement un mod modulaire, mais on doit vérifier si les dossiers contiennent des fichiers de jeu
    if (rootGameFiles.length > 0 && folders.length > 0) {
      console.log('🤔 Fichiers à la racine + dossiers détectés, vérification des dossiers...');
      
      // Vérifie si les dossiers contiennent des fichiers de jeu
      let foldersWithGameFiles = 0;
      for (const folder of folders) {
        const folderPath = path.join(modPath, folder);
        try {
          const folderItems = fs.readdirSync(folderPath);
          const hasGameFiles = folderItems.some(item => {
            const itemPath = path.join(folderPath, item);
            try {
              if (fs.statSync(itemPath).isFile()) {
                const ext = path.extname(item).toLowerCase();
                return gameFileExtensions.includes(ext);
              }
            } catch {
              return false;
            }
          });
          
          if (hasGameFiles) {
            foldersWithGameFiles++;
          }
        } catch (error) {
          console.log(`⚠️ Erreur lecture dossier ${folder}:`, error.message);
        }
      }
      
      console.log(`📊 Dossiers avec fichiers de jeu: ${foldersWithGameFiles}/${folders.length}`);
      
      // Si moins de 2 dossiers contiennent des fichiers de jeu, pas de variantes
      if (foldersWithGameFiles < 2) {
        console.log('✅ Mod simple détecté (moins de 2 dossiers avec fichiers de jeu)');
        return { hasVariants: false, variants: [] };
      }
    }
    
    // Si il n'y a pas de fichiers de jeu à la racine, vérifie les sous-dossiers
    if (rootGameFiles.length === 0 && folders.length === 0) {
      console.log('✅ Aucun fichier de jeu ni dossier - mod vide ou problème d\'extraction');
      return { hasVariants: false, variants: [] };
    }
    
    if (rootGameFiles.length === 0 && folders.length === 1) {
      console.log('✅ Un seul dossier sans fichiers à la racine - probablement un wrapper');
      return { hasVariants: false, variants: [] };
    }
    
    // À partir d'ici, on vérifie vraiment les variantes potentielles
    console.log('🔍 Analyse détaillée des variantes potentielles...');
    
    const variants = [];
    
    for (const folder of folders) {
      const folderPath = path.join(modPath, folder);
      
      try {
        let hasGameFiles = false;
        let gameFilesCount = 0;
        const files = [];
        
        // Scan récursif pour trouver les fichiers de jeu
        function scanForGameFiles(dirPath, relativePath = '') {
          try {
            const items = fs.readdirSync(dirPath);
            
            for (const item of items) {
              const itemPath = path.join(dirPath, item);
              const stat = fs.statSync(itemPath);
              
              if (stat.isFile()) {
                const ext = path.extname(item).toLowerCase();
                if (gameFileExtensions.includes(ext)) {
                  hasGameFiles = true;
                  gameFilesCount++;
                  files.push(path.join(relativePath, item));
                }
              } else if (stat.isDirectory()) {
                // Scan récursif des sous-dossiers (limité à 3 niveaux)
                if (relativePath.split(path.sep).length < 3) {
                  try {
                    scanForGameFiles(itemPath, path.join(relativePath, item));
                  } catch (error) {
                    // Ignore les erreurs de sous-dossiers
                  }
                }
              }
            }
          } catch (error) {
            console.log(`⚠️ Erreur scan ${dirPath}:`, error.message);
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
            sizeFormatted: formatBytes(totalSize),
            files: files
          });
          
          console.log(`✅ Variante valide trouvée: ${folder} (${gameFilesCount} fichiers, ${formatBytes(totalSize)})`);
        } else {
          console.log(`❌ Dossier ignoré (pas de fichiers de jeu): ${folder}`);
        }
      } catch (error) {
        console.error(`❌ Erreur scan dossier ${folder}:`, error.message);
      }
    }

    const hasVariants = variants.length >= 2; // Au moins 2 variantes pour être considéré comme tel
    
    console.log(`🎯 Détection terminée: ${variants.length} variante(s) trouvée(s)`);
    console.log(`📊 Résultat final: ${hasVariants ? 'MOD AVEC VARIANTES' : 'MOD SIMPLE'}`);
    
    if (hasVariants) {
      console.log('📋 Variantes détectées:', variants.map(v => `${v.name} (${v.gameFilesCount} fichiers)`));
    }

    return { hasVariants, variants };
    
  } catch (error) {
    console.error('❌ Erreur détection variantes:', error);
    return { hasVariants: false, variants: [] };
  }
}

// 🆕 FONCTION POUR INSTALLER UNE VARIANTE CHOISIE (mods simples)
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
    return flattenModDirectory(modPath, false);
  },

  // 🆕 FONCTION POUR CORRECTION AGRESSIVE
  aggressiveFlattenModDirectory: (modPath) => {
    console.log('🚀 Appel correction agressive pour:', modPath);
    return flattenModDirectory(modPath, true);
  },

  // 🆕 NOUVELLES FONCTIONS POUR LES VARIANTES
  detectModVariants: (modPath) => {
    return detectModVariants(modPath);
  },
  
  installModVariant: (modPath, chosenVariant, allVariants) => {
    return installModVariant(modPath, chosenVariant, allVariants);
  },

  // 🆕 FONCTION POUR INSTALLER PLUSIEURS VARIANTES (utilisée par multi-variant.js)
  installMultipleVariants: (modPath, selectedVariants, allVariants) => {
    return installMultipleVariants(modPath, selectedVariants, allVariants);
  },

  // 🔧 FONCTION EXTRACTARCHIVE CORRIGÉE ✅
  extractArchive: async (archivePath, destPath) => {
    const ext = path.extname(archivePath).toLowerCase();
    try {
      console.log('📦 Extraction de:', archivePath, 'vers:', destPath);
      
      let extractSuccess = false;
      
      // ÉTAPE 1: Extraction de l'archive
      if (ext === '.zip') {
        await extract(archivePath, { dir: destPath });
        extractSuccess = true;
        console.log('✅ Archive ZIP extraite avec succès');
      } else if (ext === '.rar' || ext === '.7z') {
        extractSuccess = await new Promise((resolve, reject) => {
          extractFull(archivePath, destPath, {})
            .on('end', () => {
              console.log('✅ Archive 7z/RAR extraite avec succès');
              resolve(true);
            })
            .on('error', err => {
              console.error('❌ Erreur extraction 7z/RAR:', err);
              reject(err);
            });
        });
      }

      if (!extractSuccess) {
        console.error('❌ Échec de l\'extraction');
        return { success: false, hasVariants: false, error: 'Extraction failed' };
      }

      console.log('✅ Extraction terminée, vérification de la structure...');
      
      // ÉTAPE 2: Vérification que des fichiers ont été extraits
      try {
        const extractedItems = fs.readdirSync(destPath);
        console.log('📁 Éléments extraits:', extractedItems.length, extractedItems);
        
        if (extractedItems.length === 0) {
          console.error('❌ Aucun fichier extrait dans le dossier de destination');
          return { success: false, hasVariants: false, error: 'No files extracted' };
        }
      } catch (error) {
        console.error('❌ Erreur lors de la vérification du contenu extrait:', error);
        return { success: false, hasVariants: false, error: 'Cannot read extracted content' };
      }
      
      // ÉTAPE 3: Correction automatique de la structure
      console.log('🔧 Correction de la structure du mod...');
      try {
        const flattened = flattenModDirectory(destPath);
        if (flattened.success && flattened.hasChanges) {
          console.log('🎯 Structure du mod normalisée automatiquement');
        } else if (flattened.success && !flattened.hasChanges) {
          console.log('ℹ️ Structure du mod déjà correcte');
        } else {
          console.log('⚠️ Impossible de normaliser la structure:', flattened.error);
          // On continue quand même, ce n'est pas bloquant
        }
      } catch (error) {
        console.error('⚠️ Erreur correction structure (non bloquant):', error);
        // On continue quand même
      }
      
      // ÉTAPE 4: Détection des variantes
      console.log('🔍 Détection des variantes...');
      let variantDetection;
      try {
        variantDetection = detectModVariants(destPath);
        console.log('📊 Résultat détection variantes:', {
          hasVariants: variantDetection.hasVariants,
          variantsCount: variantDetection.variants?.length || 0
        });
      } catch (error) {
        console.error('⚠️ Erreur détection variantes (non bloquant):', error);
        variantDetection = { hasVariants: false, variants: [] };
      }
      
      // ÉTAPE 5: Gestion des variantes
      if (variantDetection.hasVariants && variantDetection.variants.length > 1) {
        console.log('🎭 Variantes détectées, délégation au module multi-variant...');
        console.log('📋 Variantes trouvées:', variantDetection.variants.map(v => v.name));
        
        // Signale qu'il faut afficher le sélecteur de variantes
        // Le module multi-variant.js va décider du type d'interface
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
      } else {
        // ÉTAPE 6: Pas de variantes - Installation directe
        console.log('✅ Pas de variantes détectées - Installation directe terminée');
        console.log('📁 Mod prêt à l\'utilisation dans:', destPath);
        
        // Vérification finale que les fichiers sont bien présents
        try {
          const finalItems = fs.readdirSync(destPath);
          const gameFiles = finalItems.filter(item => {
            const itemPath = path.join(destPath, item);
            if (fs.statSync(itemPath).isFile()) {
              const ext = path.extname(item).toLowerCase();
              return ['.pak', '.ucas', '.utoc'].includes(ext);
            }
            return false;
          });
          
          console.log('🎮 Fichiers de jeu trouvés:', gameFiles.length, gameFiles);
          
          if (gameFiles.length === 0) {
            console.warn('⚠️ Aucun fichier de jeu trouvé, mais extraction marquée comme réussie');
          }
        } catch (error) {
          console.error('⚠️ Erreur vérification finale:', error);
        }
        
        return { 
          success: true, 
          hasVariants: false,
          extractedFiles: true,
          ready: true
        };
      }
      
    } catch (error) {
      console.error('❌ Erreur générale extraction:', error);
      return { 
        success: false, 
        hasVariants: false, 
        error: error.message || 'Extraction failed'
      };
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