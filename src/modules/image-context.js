// ===== GESTION MENU CONTEXTUEL IMAGES =====

console.log('🖼️ Module image-context.js chargé');

// Variables globales pour le menu contextuel
let currentImageMenu = null;
let currentImageData = null;

// 🆕 LISTENER PRINCIPAL - Écoute les messages du main process
window.addEventListener('DOMContentLoaded', () => {
  console.log('📨 Initialisation des listeners image-context');
  
  // Écoute l'événement pour ouvrir le sélecteur de mod
  if (window.electronAPI && window.electronAPI.onModSelectorRequest) {
    window.electronAPI.onModSelectorRequest((event, data) => {
      console.log('📂 Ouverture sélecteur mod demandée:', data);
      openModSelector(data.imageUrl, data.source);
    });
  } else {
    // Alternative : utiliser ipcRenderer directement si disponible
    if (typeof require !== 'undefined') {
      const { ipcRenderer } = require('electron');
      ipcRenderer.on('open-mod-selector', (event, data) => {
        console.log('📂 Ouverture sélecteur mod via ipcRenderer:', data);
        openModSelector(data.imageUrl, data.source);
      });
    }
  }
  
  // Écoute les notifications
  if (window.electronAPI && window.electronAPI.onNotification) {
    window.electronAPI.onNotification((event, data) => {
      showNotification(data.message, data.error);
    });
  }
});

// 🆕 FONCTION - Ouvre le popup de sélection de mod
async function openModSelector(imageUrl, source = 'unknown') {
  console.log('🎯 Ouverture sélecteur mod pour:', imageUrl);
  
  try {
    // Récupère la liste des mods
    const modsList = await window.electronAPI.getModsList();
    console.log('📋 Mods disponibles:', modsList);
    
    if (!modsList.all || modsList.all.length === 0) {
      showNotification('❌ Aucun mod trouvé dans vos dossiers configurés', true);
      return;
    }

    // Crée le popup de sélection
    const popup = createModSelectorPopup(imageUrl, modsList, source);
    document.body.appendChild(popup);
    
    // Focus sur la recherche
    const searchInput = popup.querySelector('#mod-selector-search');
    if (searchInput) {
      setTimeout(() => searchInput.focus(), 100);
    }
    
  } catch (error) {
    console.error('❌ Erreur ouverture sélecteur mod:', error);
    showNotification('❌ Erreur lors du chargement des mods', true);
  }
}

// 🆕 FONCTION - Crée le popup de sélection de mod
function createModSelectorPopup(imageUrl, modsList, source) {
  const popup = document.createElement('div');
  popup.className = 'custom-popup';
  popup.id = 'mod-selector-popup';
  
  popup.innerHTML = `
    <div class="popup-content" style="min-width: 450px; max-width: 600px;">
      <h3>📂 Sélectionner un mod</h3>
      <p style="color: #888; margin-bottom: 20px;">
        Choisissez le mod pour lequel télécharger cette image :
      </p>
      
      <!-- Barre de recherche -->
      <div style="margin-bottom: 20px;">
        <input type="text" id="mod-selector-search" placeholder="🔍 Rechercher un mod..." 
               style="width: 95%; padding: 10px; background: #191b25; border: 1px solid #444; 
                      border-radius: 8px; color: #fff; font-size: 1em; outline: none;">
      </div>
      
      <!-- Liste des mods -->
      <div id="mod-selector-list" style="max-height: 300px; overflow-y: auto; margin-bottom: 20px; 
                                         border: 1px solid #333; border-radius: 8px; background: #191b25;">
        <!-- Les mods seront insérés ici -->
      </div>
      
      <!-- Informations -->
      <div style="color: #666; font-size: 0.9em; margin-bottom: 20px; text-align: left;">
        <div>🔗 URL: <span style="color: #48ffd3; word-break: break-all;">${imageUrl}</span></div>
        <div style="margin-top: 5px;">📍 Source: <span style="color: #82eefd;">${source}</span></div>
      </div>
      
      <!-- Boutons -->
      <div class="popup-btns">
        <button onclick="closeModSelector()" style="background: #666;">❌ Annuler</button>
      </div>
    </div>
  `;
  
  // Fermeture par clic à l'extérieur
  popup.addEventListener('click', (e) => {
    if (e.target === popup) {
      closeModSelector();
    }
  });
  
  // Fermeture par Échap
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModSelector();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  // Remplir la liste des mods
  populateModsList(popup, modsList, imageUrl);
  
  return popup;
}

// 🆕 FONCTION - Remplit la liste des mods dans le popup
function populateModsList(popup, modsList, imageUrl) {
  const listContainer = popup.querySelector('#mod-selector-list');
  const searchInput = popup.querySelector('#mod-selector-search');
  
  // Combine actifs et désactivés avec indicateur
  const allMods = [
    ...modsList.active.map(mod => ({ name: mod, status: 'active' })),
    ...modsList.disabled.map(mod => ({ name: mod, status: 'disabled' }))
  ];
  
  // Fonction pour afficher les mods filtrés
  function displayMods(mods) {
    listContainer.innerHTML = '';
    
    if (mods.length === 0) {
      listContainer.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #888;">
          🔍 Aucun mod trouvé
        </div>
      `;
      return;
    }
    
    mods.forEach(mod => {
      const modItem = document.createElement('div');
      modItem.className = 'mod-selector-item';
      modItem.style.cssText = `
        padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #333;
        transition: background 0.2s; display: flex; align-items: center; gap: 10px;
      `;
      
      const statusIcon = mod.status === 'active' ? '✅' : '⚠️';
      const statusText = mod.status === 'active' ? 'Actif' : 'Désactivé';
      const statusColor = mod.status === 'active' ? '#28d47b' : '#ff9800';
      
      modItem.innerHTML = `
        <div style="flex: 1;">
          <div style="color: #fff; font-weight: 500;">${mod.name}</div>
          <div style="color: ${statusColor}; font-size: 0.8em; margin-top: 2px;">
            ${statusIcon} ${statusText}
          </div>
        </div>
        <div style="color: #48ffd3; font-size: 1.2em;">📥</div>
      `;
      
      modItem.addEventListener('click', () => {
        downloadImageForMod(imageUrl, mod.name);
      });
      
      modItem.addEventListener('mouseenter', () => {
        modItem.style.background = '#2a3139';
      });
      
      modItem.addEventListener('mouseleave', () => {
        modItem.style.background = 'transparent';
      });
      
      listContainer.appendChild(modItem);
    });
  }
  
  // Affichage initial
  displayMods(allMods);
  
  // Recherche en temps réel
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (searchTerm === '') {
      displayMods(allMods);
    } else {
      const filteredMods = allMods.filter(mod => 
        mod.name.toLowerCase().includes(searchTerm)
      );
      displayMods(filteredMods);
    }
  });
}

// 🆕 FONCTION - Télécharge l'image pour le mod sélectionné
async function downloadImageForMod(imageUrl, modName) {
  console.log('⬇️ Téléchargement image pour mod:', modName);
  
  try {
    closeModSelector();
    
    // Affiche notification de début
    showNotification(`📥 Téléchargement en cours pour "${modName}"...`, false);
    
    // Appelle l'API Electron pour télécharger
    const result = await window.electronAPI.downloadImageForMod(imageUrl, modName);
    
    if (result.success) {
      showNotification(`✅ Image téléchargée avec succès pour "${modName}"`, false);
      
      // Rafraîchit l'onglet mods si ouvert
      if (window.loadModsPage && document.querySelector('#tab-mods.active')) {
        setTimeout(() => window.loadModsPage(), 500);
      }
      
    } else {
      showNotification(`❌ Erreur: ${result.error || 'Téléchargement échoué'}`, true);
    }
    
  } catch (error) {
    console.error('❌ Erreur téléchargement:', error);
    showNotification('❌ Erreur lors du téléchargement de l\'image', true);
    closeModSelector();
  }
}

// 🆕 FONCTION - Ferme le popup de sélection
function closeModSelector() {
  const popup = document.querySelector('#mod-selector-popup');
  if (popup) {
    popup.remove();
  }
}

// 🆕 FONCTION - Affiche une notification
function showNotification(message, isError = false) {
  const notification = document.querySelector('#notification');
  if (!notification) return;
  
  notification.textContent = message;
  notification.className = `show${isError ? ' error' : ''}`;
  
  setTimeout(() => {
    notification.className = 'hidden';
  }, 3000);
}

// 🆕 FONCTION - Ferme le menu contextuel existant
function closeImageMenu() {
  if (currentImageMenu) {
    currentImageMenu.remove();
    currentImageMenu = null;
    currentImageData = null;
  }
}

// Nettoyage global
window.addEventListener('click', () => {
  closeImageMenu();
});

window.addEventListener('scroll', () => {
  closeImageMenu();
});

// Export pour utilisation globale
window.closeModSelector = closeModSelector;

console.log('✅ Module image-context.js initialisé');