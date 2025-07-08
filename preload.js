const { contextBridge, ipcRenderer } = require('electron');

// Expose les API Electron au renderer de manière sécurisée
contextBridge.exposeInMainWorld('electronAPI', {
  // ===== GESTION DES DOSSIERS =====
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectImageFile: () => ipcRenderer.invoke('select-image-file'),
  listFolders: (path) => ipcRenderer.invoke('list-folders', path),
  moveFolder: (src, dest) => ipcRenderer.invoke('move-folder', src, dest),
  deleteFolder: (path) => ipcRenderer.invoke('delete-folder', path),
  openFolder: (path) => ipcRenderer.invoke('open-folder', path),

  // ===== GESTION DES MODS =====
  extractArchive: (archivePath, targetPath) => ipcRenderer.invoke('extract-archive', archivePath, targetPath),
  installModVariant: (modPath, variant, allVariants) => ipcRenderer.invoke('install-mod-variant', modPath, variant, allVariants),
  installMultipleVariants: (modPath, selectedVariants, allVariants) => ipcRenderer.invoke('install-multiple-variants', modPath, selectedVariants, allVariants),
  flattenModDirectory: (modPath) => ipcRenderer.invoke('flatten-mod-directory', modPath),
  
  // ===== GESTION DES IMAGES =====
  copyImageToPreview: (srcPath, modPath) => ipcRenderer.invoke('copy-image-to-preview', srcPath, modPath),
  downloadImageToPreview: (url, modPath) => ipcRenderer.invoke('download-image-to-preview', url, modPath),
  downloadImageForMod: (imageUrl, modName) => ipcRenderer.invoke('download-image-for-mod', imageUrl, modName),

  // ===== LAUNCHER =====
  launchGame: (gamePath) => ipcRenderer.invoke('launch-game', gamePath),

  // ===== GESTION DES FICHIERS =====
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),

  // ===== UTILITAIRES =====
  getModsList: () => ipcRenderer.invoke('get-mods-list'),
  getLocalStorageItem: (key) => ipcRenderer.invoke('get-localStorage-item', key),

  // 🆕 ===== CHIFFREMENT SÉCURISÉ DE LA CLÉ API =====
  
  // Vérifie si le chiffrement sécurisé est disponible
  isSafeStorageAvailable: () => ipcRenderer.invoke('safe-storage-available'),
  
  // Chiffre et sauvegarde la clé API de manière sécurisée
  encryptAndSaveApiKey: (apiKey) => ipcRenderer.invoke('encrypt-and-save-api-key', apiKey),
  
  // Déchiffre et récupère la clé API
  decryptAndGetApiKey: () => ipcRenderer.invoke('decrypt-and-get-api-key'),
  
  // Supprime la clé API (versions chiffrée et non chiffrée)
  deleteApiKey: () => ipcRenderer.invoke('delete-api-key'),

  // ===== ÉVÉNEMENTS =====
  
  // Progression des téléchargements
  onDownloadProgress: (callback) => {
    ipcRenderer.on('nexus-download-progress', (event, data) => callback(data));
  },

  // Menu contextuel pour les images
  showImageContextMenu: (imageData) => {
    ipcRenderer.send('show-image-menu', imageData);
  },

  // Sélecteur de mod pour images
  onModSelectorRequest: (callback) => {
    ipcRenderer.on('open-mod-selector', (event, data) => callback(event, data));
  },

  // Sélecteur de variantes
  onVariantSelectorRequest: (callback) => {
    ipcRenderer.on('show-variant-selector', (event, data) => callback(event, data));
  },

  // Notifications
  onNotification: (callback) => {
    ipcRenderer.on('show-notification', (event, data) => callback(event, data));
  }
});

// ===== CODE D'INITIALISATION DU RENDERER =====

document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 Preload.js chargé - Initialisation...');

  // Sélection du bouton Nexus dans la sidebar
  const nexusBtn = document.querySelector('#menu li[data-tab="nexus"]');

  if (nexusBtn) {
    // Crée la barre de progression horizontale à l'intérieur du bouton
    const progressBar = document.createElement('div');
    progressBar.style.position = 'absolute';
    progressBar.style.bottom = '4px';
    progressBar.style.left = '0';
    progressBar.style.height = '3px';
    progressBar.style.width = '0%';
    progressBar.style.backgroundColor = '#48ffd3';
    progressBar.style.transition = 'width 0.3s ease';
    progressBar.style.borderRadius = '0 0 4px 4px';
    progressBar.style.pointerEvents = 'none';
    progressBar.style.zIndex = '100';

    // Crée l'icône ✅ pour la fin
    const checkIcon = document.createElement('span');
    checkIcon.textContent = '✅';
    checkIcon.style.position = 'absolute';
    checkIcon.style.right = '8px';
    checkIcon.style.top = '50%';
    checkIcon.style.transform = 'translateY(-50%)';
    checkIcon.style.fontSize = '1.2em';
    checkIcon.style.opacity = '0';
    checkIcon.style.transition = 'opacity 0.5s ease';

    // Styles du bouton (relatif pour positionnement)
    nexusBtn.style.position = 'relative';
    nexusBtn.appendChild(progressBar);
    nexusBtn.appendChild(checkIcon);

    // Gestion de la progression des téléchargements
    window.electronAPI.onDownloadProgress(({ percent, state }) => {
      if (state === 'progressing') {
        checkIcon.style.opacity = '0';
        progressBar.style.width = percent + '%';
      } else if (state === 'done') {
        progressBar.style.width = '100%';
        checkIcon.style.opacity = '1';
        setTimeout(() => {
          progressBar.style.width = '0%';
          checkIcon.style.opacity = '0';
        }, 2000);
      }
    });
  }

  // ===== GESTION DES NOTIFICATIONS =====
  function showNotification(msg, error = false) {
    const notif = document.getElementById('notification');
    if (notif) {
      notif.textContent = msg;
      notif.className = error ? 'show error' : 'show';
      setTimeout(() => { notif.className = 'hidden'; }, 3000);
    }
  }

  // Expose la fonction showNotification globalement
  window.showNotification = showNotification;

  // ===== GESTION DES VARIANTES DE MODS =====
  function handleVariantSelection(data) {
    console.log('🎯 Gestionnaire de variantes appelé:', data);
    
    // Vérification des données
    if (!data || !data.variants || !data.modPath) {
      console.error('❌ Données de variantes invalides:', data);
      showNotification('❌ Erreur: Données de variantes invalides', true);
      return;
    }

    // Assure-toi que showModVariantSelector existe
    if (typeof window.showModVariantSelector !== 'function') {
      console.warn('⚠️ showModVariantSelector non disponible, attente...');
      
      // Réessaie après un délai
      setTimeout(() => handleVariantSelection(data), 500);
      return;
    }

    // Utilise le nouveau système intelligent
    try {
      window.showModVariantSelector(data.modPath, data.variants, (result) => {
        console.log('📊 Résultat sélection variante:', result);
        
        if (result.success) {
          if (result.installedVariants && result.installedVariants.length > 1) {
            // Cas multi-variants
            console.log('✅ Variants multiples installés:', result.installedVariants);
            showNotification(`✅ ${result.installedVariants.length} composants installés avec succès !`);
          } else {
            // Cas variant unique
            console.log('✅ Variant unique installé avec succès');
            showNotification('✅ Variant installé avec succès !');
          }
          
          // Rafraîchit l'onglet mods si ouvert
          if (window.loadModsPage && document.querySelector('#tab-mods.active')) {
            setTimeout(() => window.loadModsPage(), 1000);
          }
        } else if (result.cancelled) {
          console.log('❌ Sélection de variante annulée');
          showNotification('⚠️ Installation annulée', true);
        } else {
          console.error('❌ Erreur installation variante:', result.error);
          showNotification(`❌ Erreur: ${result.error || 'Installation échouée'}`, true);
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors de l\'appel du sélecteur:', error);
      
      // Fallback vers l'ancien système
      console.log('🔄 Tentative avec l\'ancien système...');
      if (window.Popup && window.Popup.askModVariant) {
        window.Popup.askModVariant(data.modPath, data.variants, (result) => {
          console.log('📊 Résultat sélection variante (fallback):', result);
          
          if (result.success) {
            console.log('✅ Variante installée avec succès');
            showNotification('✅ Variante installée avec succès !');
            
            // Rafraîchit l'onglet mods si ouvert
            if (window.loadModsPage && document.querySelector('#tab-mods.active')) {
              setTimeout(() => window.loadModsPage(), 1000);
            }
          } else if (result.cancelled) {
            console.log('❌ Sélection de variante annulée');
            showNotification('⚠️ Installation annulée', true);
          } else {
            console.error('❌ Erreur installation variante:', result.error);
            showNotification(`❌ Erreur: ${result.error || 'Installation échouée'}`, true);
          }
        });
      } else {
        console.error('❌ Aucun système de variantes disponible');
        showNotification('❌ Erreur: Interface de sélection non disponible', true);
      }
    }
  }

  // ===== LISTENERS D'ÉVÉNEMENTS =====
  
  // Écoute les demandes de sélection de variantes
  window.electronAPI.onVariantSelectorRequest((event, data) => {
    console.log('🎯 Sélecteur de variantes demandé via API:', data);
    
    // Délai pour s'assurer que l'UI est prête
    setTimeout(() => {
      handleVariantSelection(data);
    }, 100);
  });

  // Écoute les notifications
  window.electronAPI.onNotification((event, data) => {
    showNotification(data.message, data.error);
  });

  // Expose handleVariantSelection globalement pour debug
  window.handleVariantSelection = handleVariantSelection;

  console.log('✅ Preload.js initialisé avec succès');
});

// ===== NAVIGATION DES ONGLETS =====
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#menu li').forEach(li => {
    li.addEventListener('click', () => {
      document.querySelectorAll('#menu li').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
      li.classList.add('active');
      document.querySelector(`#tab-${li.dataset.tab}`).classList.add('active');
      
      // Charge le contenu de l'onglet
      if (li.dataset.tab === 'home' && window.loadHomeWebview) {
        window.loadHomeWebview();
      }
      if (li.dataset.tab === 'nexus' && window.loadNexusWebview) {
        window.loadNexusWebview(window.lastNexusModId || undefined);
        window.lastNexusModId = undefined; // reset après ouverture
      }
      if (li.dataset.tab === 'ayaka' && window.loadAyakaWebview) {
        window.loadAyakaWebview();
      }
      if (li.dataset.tab === 'settings' && window.loadSettingsPage) {
        window.loadSettingsPage();
      }
      if (li.dataset.tab === 'mods' && window.loadModsPage) {
        window.loadModsPage();
      }
    });
  });
});

// ===== FONCTION DE DEBUG =====
window.testVariantSystem = function() {
  console.log('🧪 Test du système de variantes...');
  console.log('📦 MultiVariantManager:', typeof window.MultiVariantManager);
  console.log('🎭 showModVariantSelector:', typeof window.showModVariantSelector);
  console.log('📝 Popup:', typeof window.Popup);
  console.log('📋 Popup.askModVariant:', typeof window.Popup?.askModVariant);
  
  if (window.MultiVariantManager) {
    console.log('✅ MultiVariantManager disponible');
  } else {
    console.error('❌ MultiVariantManager non disponible');
  }
  
  if (window.showModVariantSelector) {
    console.log('✅ showModVariantSelector disponible');
  } else {
    console.error('❌ showModVariantSelector non disponible');
  }
};
