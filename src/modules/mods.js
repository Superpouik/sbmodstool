function showNotification(msg, error = false) {
  const notif = document.getElementById('notification');
  notif.textContent = msg;
  notif.className = error ? 'show error' : 'show';
  setTimeout(() => { notif.className = 'hidden'; }, 3000);
}

// Variable globale pour stocker les données des mods pour le filtrage
let allModsData = { active: [], disabled: [] };

// 🆕 SYSTÈME DE GESTION DES LIENS NEXUS
const ModNexusLinksManager = {
  STORAGE_KEY: 'mod_nexus_links',
  
  // Récupère tous les liens Nexus
  getAllNexusLinks() {
    try {
      const links = localStorage.getItem(this.STORAGE_KEY);
      return links ? JSON.parse(links) : {};
    } catch (error) {
      console.error('Error reading Nexus links:', error);
      return {};
    }
  },
  
  // Récupère le lien Nexus d'un mod
  getNexusLink(modName) {
    const links = this.getAllNexusLinks();
    return links[modName] || null;
  },
  
  // Sauvegarde le lien Nexus d'un mod
  setNexusLink(modName, url) {
    try {
      // Valide l'URL
      if (!url || !url.trim()) {
        return this.deleteNexusLink(modName);
      }
      
      const cleanUrl = url.trim();
      if (!cleanUrl.includes('nexusmods.com')) {
        return { success: false, error: 'URL must be from nexusmods.com' };
      }
      
      const links = this.getAllNexusLinks();
      links[modName] = {
        url: cleanUrl,
        added: new Date().toISOString()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(links));
      return { success: true };
    } catch (error) {
      console.error('Error setting Nexus link:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Supprime le lien Nexus d'un mod
  deleteNexusLink(modName) {
    try {
      const links = this.getAllNexusLinks();
      delete links[modName];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(links));
      return { success: true };
    } catch (error) {
      console.error('Error deleting Nexus link:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Renomme un lien Nexus
  renameNexusLink(oldModName, newModName) {
    try {
      const links = this.getAllNexusLinks();
      if (links[oldModName]) {
        links[newModName] = { ...links[oldModName] };
        delete links[oldModName];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(links));
      }
      return true;
    } catch (error) {
      console.error('Error renaming Nexus link:', error);
      return false;
    }
  },
  
  // Affiche le popup pour ajouter/modifier un lien Nexus
  showNexusLinkDialog(modName, callback) {
    console.log('🌐 Opening Nexus link dialog for:', modName);
    
    const existingLink = this.getNexusLink(modName);
    const currentUrl = existingLink ? existingLink.url : '';
    
    const popup = document.createElement('div');
    popup.className = 'custom-popup nexus-link-popup';
    
    popup.innerHTML = `
      <div class="popup-content nexus-link-content">
        <h2>🌐 Nexus link for<br><span>${modName}</span></h2>
        <p style="color: #888; margin-bottom: 20px; text-align: center;">
          Add the Nexus Mods page URL for this mod
        </p>
        
        <div class="nexus-link-input-container">
          <input type="url" id="nexus-url-input" value="${currentUrl}" 
                 placeholder="https://www.nexusmods.com/stellarblade/mods/123"
                 style="width: 100%; padding: 12px; background: #191b25; border: 2px solid #444; 
                        border-radius: 8px; color: #fff; font-size: 1em; outline: none;">
        </div>
        
        <div class="nexus-link-tips">
          💡 <strong>Tips:</strong> 
          <ul>
            <li>Copy the URL directly from the Nexus Mods page</li>
            <li>The URL should start with "https://www.nexusmods.com/"</li>
            <li>This will add a clickable globe badge to the mod</li>
          </ul>
        </div>
        
        <div class="popup-btns">
          <button id="nexus-cancel" style="background: #666;">❌ Cancel</button>
          ${currentUrl ? '<button id="nexus-clear" style="background: #ff6b35;">🗑️ Remove Link</button>' : ''}
          <button id="nexus-save" class="primary">🌐 Save Link</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    // Styles CSS
    const style = document.createElement('style');
    style.setAttribute('data-popup-temp', 'true');
    style.textContent = `
      .nexus-link-popup .popup-content {
        min-width: 500px;
        max-width: 600px;
      }
      
      .nexus-link-input-container {
        margin: 20px 0;
      }
      
      #nexus-url-input:focus {
        border-color: #48ffd3;
        box-shadow: 0 0 0 3px rgba(72, 255, 211, 0.1);
      }
      
      .nexus-link-tips {
        background: rgba(72, 255, 211, 0.05);
        border: 1px solid rgba(72, 255, 211, 0.2);
        border-radius: 8px;
        padding: 15px;
        margin: 20px 0;
        text-align: left;
        font-size: 0.9em;
        color: #ccc;
      }
      
      .nexus-link-tips strong {
        color: #48ffd3;
      }
      
      .nexus-link-tips ul {
        margin: 8px 0 0 0;
        padding-left: 20px;
      }
      
      .nexus-link-tips li {
        margin: 4px 0;
        color: #aaa;
      }
    `;
    document.head.appendChild(style);
    
    const input = popup.querySelector('#nexus-url-input');
    
    // Event listeners
    popup.querySelector('#nexus-save').onclick = () => {
      const url = input.value.trim();
      const result = this.setNexusLink(modName, url);
      
      this.closeNexusLinkDialog();
      
      if (result.success) {
        if (url) {
          showNotification(`🌐 Nexus link saved for "${modName}"`);
        } else {
          showNotification(`🗑️ Nexus link removed for "${modName}"`);
        }
        callback({ success: true, url });
      } else {
        showNotification(`❌ Error: ${result.error}`, true);
        callback({ success: false, error: result.error });
      }
    };
    
    if (popup.querySelector('#nexus-clear')) {
      popup.querySelector('#nexus-clear').onclick = () => {
        input.value = '';
        popup.querySelector('#nexus-save').click();
      };
    }
    
    popup.querySelector('#nexus-cancel').onclick = () => {
      this.closeNexusLinkDialog();
      callback({ success: false, cancelled: true });
    };
    
    // Validation en temps réel
    input.addEventListener('input', () => {
      const url = input.value.trim();
      const saveBtn = popup.querySelector('#nexus-save');
      
      if (!url) {
        saveBtn.textContent = currentUrl ? '🗑️ Remove Link' : '❌ Cancel';
        input.style.borderColor = '#444';
      } else if (url.includes('nexusmods.com')) {
        saveBtn.textContent = '🌐 Save Link';
        input.style.borderColor = '#48ffd3';
      } else {
        saveBtn.textContent = '❌ Invalid URL';
        input.style.borderColor = '#ff4343';
      }
    });
    
    // Fermeture par Échap
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.closeNexusLinkDialog();
        callback({ success: false, cancelled: true });
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Focus sur l'input
    setTimeout(() => {
      input.focus();
      if (currentUrl) {
        input.select();
      }
    }, 100);
  },
  
  // Ferme le dialog Nexus
  closeNexusLinkDialog() {
    const popup = document.querySelector('.nexus-link-popup');
    if (popup) {
      popup.remove();
    }
    document.querySelectorAll('style[data-popup-temp]').forEach(s => s.remove());
  }
};

// 🆕 SYSTÈME DE GESTION DES DATES D'INSTALLATION
const ModInstallDateManager = {
  STORAGE_KEY: 'mod_install_dates',
  
  // Récupère toutes les dates d'installation
  getAllInstallDates() {
    try {
      const dates = localStorage.getItem(this.STORAGE_KEY);
      return dates ? JSON.parse(dates) : {};
    } catch (error) {
      console.error('Error reading install dates:', error);
      return {};
    }
  },
  
  // Récupère la date d'installation d'un mod
  getInstallDate(modName) {
    const dates = this.getAllInstallDates();
    return dates[modName] ? new Date(dates[modName]) : null;
  },
  
  // Enregistre la date d'installation d'un mod
  setInstallDate(modName, date = new Date()) {
    try {
      const dates = this.getAllInstallDates();
      dates[modName] = date.toISOString();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dates));
      return true;
    } catch (error) {
      console.error('Error setting install date:', error);
      return false;
    }
  },
  
  // Renomme un mod dans les dates d'installation
  renameInstallDate(oldModName, newModName) {
    try {
      const dates = this.getAllInstallDates();
      if (dates[oldModName]) {
        dates[newModName] = dates[oldModName];
        delete dates[oldModName];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dates));
      }
      return true;
    } catch (error) {
      console.error('Error renaming install date:', error);
      return false;
    }
  },
  
  // Supprime la date d'installation d'un mod
  deleteInstallDate(modName) {
    try {
      const dates = this.getAllInstallDates();
      delete dates[modName];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dates));
      return true;
    } catch (error) {
      console.error('Error deleting install date:', error);
      return false;
    }
  },
  
  // Initialise les dates pour les mods existants (appelé seulement si pas déjà fait)
  initializeDatesForExistingMods() {
    const modsPath = localStorage.getItem('mods_path') || '';
    const disabledModsPath = localStorage.getItem('disabled_mods_path') || '';
    
    if (!modsPath || !disabledModsPath) return;
    
    // Vérifie si l'initialisation a déjà été faite
    const initKey = 'mod_dates_initialized';
    if (localStorage.getItem(initKey)) return;
    
    const activeMods = window.electronAPI.listFolders(modsPath);
    const disabledMods = window.electronAPI.listFolders(disabledModsPath);
    const allMods = [...activeMods, ...disabledMods];
    
    const existingDates = this.getAllInstallDates();
    
    // Pour chaque mod qui n'a pas de date, on lui assigne une date estimée
    allMods.forEach((modName, index) => {
      if (!existingDates[modName]) {
        // Date estimée : il y a (index + 1) jours pour créer un ordre réaliste
        const estimatedDate = new Date(Date.now() - ((allMods.length - index) * 24 * 60 * 60 * 1000));
        this.setInstallDate(modName, estimatedDate);
      }
    });
    
    // Marque l'initialisation comme terminée
    localStorage.setItem(initKey, 'true');
    console.log('📅 Initialized install dates for', allMods.length, 'existing mods');
  },
  
  // Enregistre un nouveau mod installé avec la date actuelle
  recordNewModInstall(modName) {
    console.log('📅 Recording new mod install:', modName);
    return this.setInstallDate(modName, new Date());
  }
};

// 🆕 SYSTÈME DE GESTION DES FAVORIS
const ModFavoritesManager = {
  STORAGE_KEY: 'mod_favorites',
  
  // Récupère tous les favoris
  getAllFavorites() {
    try {
      const favorites = localStorage.getItem(this.STORAGE_KEY);
      return favorites ? JSON.parse(favorites) : {};
    } catch (error) {
      console.error('Error reading favorites:', error);
      return {};
    }
  },
  
  // Vérifie si un mod est en favoris
  isFavorite(modName) {
    const favorites = this.getAllFavorites();
    return !!favorites[modName];
  },
  
  // Ajoute/retire un mod des favoris
  toggleFavorite(modName) {
    try {
      const favorites = this.getAllFavorites();
      if (favorites[modName]) {
        delete favorites[modName];
      } else {
        favorites[modName] = {
          added: new Date().toISOString()
        };
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
      return true;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return false;
    }
  },
  
  // Supprime un favori
  deleteFavorite(modName) {
    try {
      const favorites = this.getAllFavorites();
      delete favorites[modName];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
      return true;
    } catch (error) {
      console.error('Error deleting favorite:', error);
      return false;
    }
  },
  
  // Renomme un favori
  renameFavorite(oldModName, newModName) {
    try {
      const favorites = this.getAllFavorites();
      if (favorites[oldModName]) {
        favorites[newModName] = { ...favorites[oldModName] };
        delete favorites[oldModName];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
      }
      return true;
    } catch (error) {
      console.error('Error renaming favorite:', error);
      return false;
    }
  }
};

// 🆕 SYSTÈME DE GESTION DES NOTES
const ModNotesManager = {
  // Clé de stockage localStorage
  STORAGE_KEY: 'mod_notes',
  
  // Récupère toutes les notes
  getAllNotes() {
    try {
      const notes = localStorage.getItem(this.STORAGE_KEY);
      return notes ? JSON.parse(notes) : {};
    } catch (error) {
      console.error('Error reading notes:', error);
      return {};
    }
  },
  
  // Récupère la note d'un mod spécifique
  getNote(modName) {
    const notes = this.getAllNotes();
    return notes[modName] || null;
  },
  
  // Sauvegarde une note
  saveNote(modName, note) {
    try {
      const notes = this.getAllNotes();
      if (note && note.trim()) {
        notes[modName] = {
          text: note.trim(),
          lastUpdated: new Date().toISOString(),
          created: notes[modName]?.created || new Date().toISOString()
        };
      } else {
        // Supprime la note si vide
        delete notes[modName];
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notes));
      return true;
    } catch (error) {
      console.error('Save note error:', error);
      return false;
    }
  },
  
  // Supprime une note
  deleteNote(modName) {
    try {
      const notes = this.getAllNotes();
      delete notes[modName];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notes));
      return true;
    } catch (error) {
      console.error('Note deletion error:', error);
      return false;
    }
  },
  
  // 🆕 RENOMME UNE NOTE (quand un mod est renommé)
  renameNote(oldModName, newModName) {
    try {
      const notes = this.getAllNotes();
      if (notes[oldModName]) {
        // Copie la note vers le nouveau nom
        notes[newModName] = { ...notes[oldModName] };
        notes[newModName].lastUpdated = new Date().toISOString();
        
        // Supprime l'ancienne note
        delete notes[oldModName];
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notes));
        console.log('📝 Note renamed:', oldModName, '→', newModName);
        return true;
      }
      return true; // Pas de note à renommer, c'est OK
    } catch (error) {
      console.error('Error renaming note:', error);
      return false;
    }
  },
  
  // Formate une note pour l'affichage (coupe si trop longue)
  formatNotePreview(noteText, maxLength = 50) {
    if (!noteText) return '';
    return noteText.length > maxLength ? 
      noteText.substring(0, maxLength) + '...' : 
      noteText;
  }
};

// 🆕 NOUVEAU SYSTÈME DE GESTION DES CONFLITS DE MODS
const ModConflictManager = {
  STORAGE_KEY: 'mod_conflicts',
  
  // Récupère tous les conflits
  getAllConflicts() {
    try {
      const conflicts = localStorage.getItem(this.STORAGE_KEY);
      return conflicts ? JSON.parse(conflicts) : {};
    } catch (error) {
      console.error('Error reading conflicts:', error);
      return {};
    }
  },
  
  // 🆕 RÉCUPÈRE TOUS LES CONFLITS (DIRECTS ET BIDIRECTIONNELS) POUR UN MOD
  getAllConflictsForMod(modName) {
    const directConflicts = this.getConflicts(modName);
    const directList = directConflicts.conflicts || [];
    
    // Cherche les conflits bidirectionnels (autres mods qui ont ce mod dans leurs conflits)
    const allConflicts = this.getAllConflicts();
    const bidirectionalList = [];
    
    for (const [otherModName, otherModData] of Object.entries(allConflicts)) {
      if (otherModData.conflicts && 
          otherModData.conflicts.includes(modName) && 
          otherModName !== modName) {
        bidirectionalList.push(otherModName);
      }
    }
    
    // Combine et déduplique
    const allConflictsList = [...new Set([...directList, ...bidirectionalList])];
    
    return {
      total: allConflictsList.length,
      direct: directList,
      bidirectional: bidirectionalList,
      all: allConflictsList
    };
  },

  // Récupère les conflits d'un mod spécifique
  getConflicts(modName) {
    const conflicts = this.getAllConflicts();
    return conflicts[modName] || [];
  },
  
  // Sauvegarde la liste des conflits pour un mod
  saveConflicts(modName, conflictList) {
    try {
      const conflicts = this.getAllConflicts();
      if (conflictList && conflictList.length > 0) {
        conflicts[modName] = {
          conflicts: conflictList,
          lastUpdated: new Date().toISOString(),
          created: conflicts[modName]?.created || new Date().toISOString()
        };
      } else {
        // Supprime les conflits si liste vide
        delete conflicts[modName];
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(conflicts));
      return true;
    } catch (error) {
      console.error('Save conflicts error:', error);
      return false;
    }
  },
  
  // Supprime les conflits d'un mod
  deleteConflicts(modName) {
    try {
      const conflicts = this.getAllConflicts();
      delete conflicts[modName];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(conflicts));
      return true;
    } catch (error) {
      console.error('Delete conflicts error:', error);
      return false;
    }
  },
  
  // Renomme les conflits d'un mod
  renameConflicts(oldModName, newModName) {
    try {
      const conflicts = this.getAllConflicts();
      if (conflicts[oldModName]) {
        conflicts[newModName] = { ...conflicts[oldModName] };
        conflicts[newModName].lastUpdated = new Date().toISOString();
        delete conflicts[oldModName];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(conflicts));
      }
      
      // Met aussi à jour les références dans les autres conflits
      Object.keys(conflicts).forEach(modName => {
        if (conflicts[modName].conflicts && conflicts[modName].conflicts.includes(oldModName)) {
          const index = conflicts[modName].conflicts.indexOf(oldModName);
          conflicts[modName].conflicts[index] = newModName;
          conflicts[modName].lastUpdated = new Date().toISOString();
        }
      });
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(conflicts));
      return true;
    } catch (error) {
      console.error('Error renaming conflicts:', error);
      return false;
    }
  },
  
  // Affiche l'interface de gestion des conflits
  showConflictManager(modName, callback) {
    console.log('⚔️ Opening conflict manager for:', modName);
    
    const popup = document.createElement('div');
    popup.className = 'custom-popup conflict-popup';
    
    // Récupère la liste des conflits existants
    const existingConflicts = this.getConflicts(modName);
    const currentConflictsList = existingConflicts.conflicts || [];
    
    popup.innerHTML = `
      <div class="popup-content conflict-content">
        <h2>⚔️ Manage conflicts for<br><span>${modName}</span></h2>
        <p style="color: #888; margin-bottom: 20px; text-align: center;">
          Select mods that should be disabled when this mod is activated
        </p>
        
        <div class="conflict-input-container">
          <div class="conflict-search-container">
            <input type="text" id="conflict-search" placeholder="🔍 Search mods..." 
                   style="width: 100%; padding: 10px; background: #191b25; border: 1px solid #444; 
                          border-radius: 8px; color: #fff; font-size: 1em; outline: none; margin-bottom: 15px;">
          </div>
          
          <div class="conflict-mods-list" id="conflict-mods-list" style="max-height: 300px; overflow-y: auto; 
                                                 border: 1px solid #333; border-radius: 8px; background: #191b25;">
            <!-- Les mods seront insérés ici -->
          </div>
        </div>
        
        <div class="conflict-tips">
          💡 <strong>Tips:</strong> 
          <ul>
            <li>Select mods that modify the same assets (outfits, textures, etc.)</li>
            <li>These mods will be automatically disabled when you activate this mod</li>
            <li>You can search and select multiple mods</li>
          </ul>
        </div>
        
        <div class="popup-btns">
          <button id="conflict-cancel" style="background: #666;">❌ Cancel</button>
          <button id="conflict-clear" style="background: #ff6b35;" ${!currentConflictsList.length ? 'style="display:none;"' : ''}>🗑️ Clear All</button>
          <button id="conflict-save" class="primary">💾 Save</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    // Styles CSS spécifiques
    const style = document.createElement('style');
    style.setAttribute('data-popup-temp', 'true');
    style.textContent = `
      .conflict-popup .popup-content {
        min-width: 500px;
        max-width: 650px;
      }
      
      .conflict-mods-list {
        padding: 8px;
      }
      
      .conflict-mod-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s;
        margin-bottom: 4px;
      }
      
      .conflict-mod-item:hover {
        background: #2a3139;
      }
      
      .conflict-mod-item.selected {
        background: #1e3a2e;
        border: 1px solid #48ffd3;
      }
      
      .conflict-mod-checkbox {
        width: 18px;
        height: 18px;
        border: 2px solid #666;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        transition: all 0.2s;
      }
      
      .conflict-mod-item.selected .conflict-mod-checkbox {
        background: #48ffd3;
        border-color: #48ffd3;
        color: #181c22;
        font-weight: bold;
      }
      
      .conflict-mod-info {
        flex: 1;
      }
      
      .conflict-mod-name {
        color: #fff;
        font-weight: 500;
        margin-bottom: 2px;
      }
      
      .conflict-mod-status {
        font-size: 0.8em;
        opacity: 0.7;
      }
      
      .conflict-mod-status.active {
        color: #48ffd3;
      }
      
      .conflict-mod-status.disabled {
        color: #ff6b35;
      }
      
      .conflict-tips {
        background: rgba(255, 107, 53, 0.05);
        border: 1px solid rgba(255, 107, 53, 0.2);
        border-radius: 8px;
        padding: 15px;
        margin: 20px 0;
        text-align: left;
        font-size: 0.9em;
        color: #ccc;
      }
      
      .conflict-tips strong {
        color: #ff6b35;
      }
      
      .conflict-tips ul {
        margin: 8px 0 0 0;
        padding-left: 20px;
      }
      
      .conflict-tips li {
        margin: 4px 0;
        color: #aaa;
      }
    `;
    document.head.appendChild(style);
    
    // Charge et affiche la liste des mods
    this.populateConflictModsList(popup, modName, currentConflictsList);
    
    // Event listeners
    const searchInput = popup.querySelector('#conflict-search');
    searchInput.addEventListener('input', () => {
      this.populateConflictModsList(popup, modName, currentConflictsList, searchInput.value);
    });
    
    // Bouton sauvegarder
    popup.querySelector('#conflict-save').onclick = () => {
      const selectedMods = Array.from(popup.querySelectorAll('.conflict-mod-item.selected'))
        .map(item => item.dataset.modName);
      
      this.saveConflicts(modName, selectedMods);
      this.closeConflictManager();
      
      if (selectedMods.length > 0) {
        showNotification(`⚔️ ${selectedMods.length} conflicts saved for "${modName}"`);
      } else {
        showNotification(`⚔️ Conflicts cleared for "${modName}"`);
      }
      
      callback({ success: true, conflicts: selectedMods });
    };
    
    // Bouton effacer
    popup.querySelector('#conflict-clear').onclick = () => {
      popup.querySelectorAll('.conflict-mod-item.selected').forEach(item => {
        item.classList.remove('selected');
        item.querySelector('.conflict-mod-checkbox').textContent = '';
      });
    };
    
    // Bouton annuler
    popup.querySelector('#conflict-cancel').onclick = () => {
      this.closeConflictManager();
      callback({ success: false, cancelled: true });
    };
    
    // Fermeture par Échap
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.closeConflictManager();
        callback({ success: false, cancelled: true });
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Fermeture par clic à l'extérieur
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        this.closeConflictManager();
        callback({ success: false, cancelled: true });
      }
    });
    
    // Focus sur la recherche
    setTimeout(() => searchInput.focus(), 100);
  },
  
  // Remplit la liste des mods dans le gestionnaire de conflits
  populateConflictModsList(popup, currentModName, selectedConflicts, searchQuery = '') {
    const listContainer = popup.querySelector('#conflict-mods-list');
    
    try {
      const modsPath = localStorage.getItem('mods_path') || '';
      const disabledModsPath = localStorage.getItem('disabled_mods_path') || '';
      
      const activeMods = window.electronAPI.listFolders(modsPath);
      const disabledMods = window.electronAPI.listFolders(disabledModsPath);
      
      // Combine tous les mods sauf le mod actuel
      const allMods = [
        ...activeMods.filter(mod => mod !== currentModName).map(mod => ({ name: mod, status: 'active' })),
        ...disabledMods.filter(mod => mod !== currentModName).map(mod => ({ name: mod, status: 'disabled' }))
      ];
      
      // Filtre selon la recherche
      const filteredMods = searchQuery ? 
        allMods.filter(mod => mod.name.toLowerCase().includes(searchQuery.toLowerCase())) :
        allMods;
      
      listContainer.innerHTML = '';
      
      if (filteredMods.length === 0) {
        listContainer.innerHTML = `
          <div style="padding: 20px; text-align: center; color: #888;">
            ${searchQuery ? '🔍 No mods found' : '📭 No other mods available'}
          </div>
        `;
        return;
      }
      
      filteredMods.forEach(mod => {
        const isSelected = selectedConflicts.includes(mod.name);
        
        const modItem = document.createElement('div');
        modItem.className = `conflict-mod-item ${isSelected ? 'selected' : ''}`;
        modItem.dataset.modName = mod.name;
        
        modItem.innerHTML = `
          <div class="conflict-mod-checkbox">${isSelected ? '✓' : ''}</div>
          <div class="conflict-mod-info">
            <div class="conflict-mod-name">${mod.name}</div>
            <div class="conflict-mod-status ${mod.status}">${mod.status === 'active' ? '✅ Active' : '⚠️ Disabled'}</div>
          </div>
        `;
        
        modItem.addEventListener('click', () => {
          const isCurrentlySelected = modItem.classList.contains('selected');
          const checkbox = modItem.querySelector('.conflict-mod-checkbox');
          
          if (isCurrentlySelected) {
            modItem.classList.remove('selected');
            checkbox.textContent = '';
          } else {
            modItem.classList.add('selected');
            checkbox.textContent = '✓';
          }
        });
        
        listContainer.appendChild(modItem);
      });
      
    } catch (error) {
      console.error('Error loading mods for conflict manager:', error);
      listContainer.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #ff4343;">
          ❌ Error loading mods
        </div>
      `;
    }
  },
  
  // Ferme le gestionnaire de conflits
  closeConflictManager() {
    const popup = document.querySelector('.conflict-popup');
    if (popup) {
      popup.remove();
    }
    document.querySelectorAll('style[data-popup-temp]').forEach(s => s.remove());
  },
  
  // 🆕 GESTION BIDIRECTIONNELLE DES CONFLITS
  async handleModActivation(modName) {
    const modsPath = localStorage.getItem('mods_path') || '';
    const disabledModsPath = localStorage.getItem('disabled_mods_path') || '';
    let disabledCount = 0;
    const disabledMods = [];
    
    // 1. CONFLITS DIRECTS : Ce mod désactive ses conflits définis
    const directConflicts = this.getConflicts(modName);
    if (directConflicts.conflicts && directConflicts.conflicts.length > 0) {
      console.log('⚔️ Direct conflicts for', modName, ':', directConflicts.conflicts);
      
      for (const conflictMod of directConflicts.conflicts) {
        const srcPath = `${modsPath}/${conflictMod}`;
        const destPath = `${disabledModsPath}/${conflictMod}`;
        
        if (window.electronAPI.listFolders(modsPath).includes(conflictMod)) {
          try {
            const moved = await window.electronAPI.moveFolder(srcPath, destPath);
            if (moved) {
              disabledCount++;
              disabledMods.push(conflictMod);
              console.log('⚔️ Auto-disabled direct conflict:', conflictMod);
            }
          } catch (error) {
            console.error('Error auto-disabling direct conflict:', conflictMod, error);
          }
        }
      }
    }
    
    // 2. CONFLITS INVERSES : Les autres mods qui ont CE mod dans leurs conflits
    const allConflicts = this.getAllConflicts();
    for (const [otherModName, otherModData] of Object.entries(allConflicts)) {
      // Si un autre mod a ce mod dans ses conflits ET que l'autre mod est actif
      if (otherModData.conflicts && 
          otherModData.conflicts.includes(modName) && 
          window.electronAPI.listFolders(modsPath).includes(otherModName)) {
        
        console.log('⚔️ Bidirectional conflict:', otherModName, 'has', modName, 'in conflicts');
        
        const srcPath = `${modsPath}/${otherModName}`;
        const destPath = `${disabledModsPath}/${otherModName}`;
        
        try {
          const moved = await window.electronAPI.moveFolder(srcPath, destPath);
          if (moved) {
            disabledCount++;
            disabledMods.push(otherModName);
            console.log('⚔️ Auto-disabled bidirectional conflict:', otherModName);
          }
        } catch (error) {
          console.error('Error auto-disabling bidirectional conflict:', otherModName, error);
        }
      }
    }
    
    return { conflictsHandled: disabledCount, disabledMods };
  },
  
  // 🆕 AFFICHE LA LISTE DES CONFLITS D'UN MOD (pour le badge cliquable)
  showConflictsList(modName) {
    console.log('📋 Showing conflicts list for:', modName);
    
    const allConflicts = this.getAllConflictsForMod(modName);
    if (allConflicts.total === 0) {
      showNotification(`ℹ️ "${modName}" has no conflicts defined`, false);
      return;
    }
    
    const popup = document.createElement('div');
    popup.className = 'custom-popup conflicts-list-popup';
    
    popup.innerHTML = `
      <div class="popup-content conflicts-list-content">
        <h2>⚔️ Conflicts for<br><span>${modName}</span></h2>
        <p style="color: #888; margin-bottom: 20px; text-align: center;">
          These mods will be disabled when "${modName}" is activated
        </p>
        
        <div class="conflicts-list-container">
          ${allConflicts.all.map(conflictMod => {
            // Vérifie si le mod conflictuel existe encore
            const modsPath = localStorage.getItem('mods_path') || '';
            const disabledModsPath = localStorage.getItem('disabled_mods_path') || '';
            const isActive = window.electronAPI.listFolders(modsPath).includes(conflictMod);
            const isDisabled = window.electronAPI.listFolders(disabledModsPath).includes(conflictMod);
            const exists = isActive || isDisabled;
            
            // Détermine le type de conflit
            const isDirect = allConflicts.direct.includes(conflictMod);
            const isBidirectional = allConflicts.bidirectional.includes(conflictMod);
            const conflictType = isDirect && isBidirectional ? 'Both directions' : 
                                isDirect ? 'Direct conflict' : 'Bidirectional conflict';
            
            return `
              <div class="conflict-list-item ${!exists ? 'missing' : ''}">
                <div class="conflict-icon">${!exists ? '❌' : isActive ? '✅' : '⚠️'}</div>
                <div class="conflict-info">
                  <div class="conflict-name">${conflictMod}</div>
                  <div class="conflict-status">
                    ${!exists ? 'Missing (mod not found)' : 
                      isActive ? 'Currently Active' : 'Currently Disabled'}
                  </div>
                  <div class="conflict-type" style="font-size: 0.75em; color: #ff6b35; margin-top: 2px;">
                    ${conflictType}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <div class="conflicts-info">
          💡 <strong>Note:</strong> This mod has ${allConflicts.total} conflict(s) total:
          <br>• <span style="color: #48ffd3;">${allConflicts.direct.length} direct</span> (this mod disables others)
          <br>• <span style="color: #82eefd;">${allConflicts.bidirectional.length} bidirectional</span> (others disable this mod)
          <br>All conflicts work bidirectionally - activating any conflicting mod will disable the others.
        </div>
        
        <div class="popup-btns">
          <button id="conflicts-edit" style="background: #ff6b35;">⚔️ Edit Conflicts</button>
          <button id="conflicts-close" class="primary">✅ Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    // Styles CSS pour la liste des conflits
    const style = document.createElement('style');
    style.setAttribute('data-popup-temp', 'true');
    style.textContent = `
      .conflicts-list-popup .popup-content {
        min-width: 450px;
        max-width: 550px;
      }
      
      .conflicts-list-container {
        max-height: 300px;
        overflow-y: auto;
        margin-bottom: 20px;
        border: 1px solid #333;
        border-radius: 8px;
        background: #191b25;
        padding: 8px;
      }
      
      .conflict-list-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 4px;
        transition: background 0.2s;
      }
      
      .conflict-list-item:hover {
        background: #2a3139;
      }
      
      .conflict-list-item.missing {
        opacity: 0.6;
        background: rgba(255, 67, 67, 0.1);
      }
      
      .conflict-icon {
        font-size: 1.2em;
        width: 24px;
        text-align: center;
        flex-shrink: 0;
      }
      
      .conflict-info {
        flex: 1;
      }
      
      .conflict-name {
        color: #fff;
        font-weight: 500;
        margin-bottom: 2px;
      }
      
      .conflict-status {
        font-size: 0.8em;
        opacity: 0.8;
      }
      
      .conflict-list-item:not(.missing) .conflict-status {
        color: #48ffd3;
      }
      
      .conflict-list-item.missing .conflict-status {
        color: #ff6b35;
      }
      
      .conflicts-info {
        background: rgba(72, 255, 211, 0.05);
        border: 1px solid rgba(72, 255, 211, 0.2);
        border-radius: 8px;
        padding: 12px;
        margin: 15px 0;
        font-size: 0.9em;
        color: #ccc;
        text-align: left;
      }
      
      .conflicts-info strong {
        color: #48ffd3;
      }
    `;
    document.head.appendChild(style);
    
    // Event listeners
    popup.querySelector('#conflicts-edit').onclick = () => {
      this.closeConflictsList();
      // Ouvre le gestionnaire de conflits
      this.showConflictManager(modName, (result) => {
        if (result.success) {
          // Recharge la page pour voir les changements
          setTimeout(() => window.loadModsPage(), 500);
        }
      });
    };
    
    popup.querySelector('#conflicts-close').onclick = () => {
      this.closeConflictsList();
    };
    
    // Fermeture par Échap
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.closeConflictsList();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Fermeture par clic à l'extérieur
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        this.closeConflictsList();
      }
    });
    
    // Focus sur le bouton close
    setTimeout(() => popup.querySelector('#conflicts-close').focus(), 100);
  },
  
  // Ferme la liste des conflits
  closeConflictsList() {
    const popup = document.querySelector('.conflicts-list-popup');
    if (popup) {
      popup.remove();
    }
    document.querySelectorAll('style[data-popup-temp]').forEach(s => s.remove());
  }
};

// 🆕 GESTIONNAIRE DE LANCEMENT TEMPORAIRE SANS MOD
const TemporaryLaunchManager = {
  // Lance le jeu en désactivant temporairement un mod
  async launchWithoutMod(modName, callback) {
    console.log('🎮 Launching game without mod:', modName);
    
    const modsPath = localStorage.getItem('mods_path') || '';
    const disabledModsPath = localStorage.getItem('disabled_mods_path') || '';
    const gamePath = localStorage.getItem('game_path');
    
    if (!gamePath) {
      callback({ success: false, error: 'Game path not configured' });
      return;
    }
    
    const modSrcPath = `${modsPath}/${modName}`;
    const modTempPath = `${disabledModsPath}/${modName}_TEMP_DISABLED`;
    
    try {
      // Vérifie si le mod est actuellement actif
      if (!window.electronAPI.listFolders(modsPath).includes(modName)) {
        callback({ success: false, error: 'Mod is not currently active' });
        return;
      }
      
      showNotification(`🎮 Temporarily disabling "${modName}" and launching game...`);
      
      // Désactive temporairement le mod
      const moved = await window.electronAPI.moveFolder(modSrcPath, modTempPath);
      if (!moved) {
        callback({ success: false, error: 'Failed to temporarily disable mod' });
        return;
      }
      
      // Lance le jeu
      const gameExePath = `${gamePath}/SB-Win64-Shipping.exe`;
      const launched = await window.electronAPI.launchGame(gameExePath);
      
      if (launched) {
        showNotification('🎮 Game launched successfully!');
        
        // Propose de réactiver le mod après un délai
        setTimeout(() => {
          this.showReactivationDialog(modName, modTempPath, modSrcPath, callback);
        }, 3000);
      } else {
        // Réactive le mod immédiatement en cas d'échec de lancement
        await window.electronAPI.moveFolder(modTempPath, modSrcPath);
        callback({ success: false, error: 'Failed to launch game' });
      }
      
    } catch (error) {
      console.error('Error during temporary launch:', error);
      // Tente de restaurer le mod en cas d'erreur
      try {
        await window.electronAPI.moveFolder(modTempPath, modSrcPath);
      } catch (restoreError) {
        console.error('Error restoring mod after failure:', restoreError);
      }
      callback({ success: false, error: error.message });
    }
  },
  
  // Affiche le dialog de réactivation du mod
  showReactivationDialog(modName, tempPath, originalPath, callback) {
    const popup = document.createElement('div');
    popup.className = 'custom-popup reactivation-popup';
    
    popup.innerHTML = `
      <div class="popup-content">
        <h3>🔄 Reactivate mod?</h3>
        <p style="margin: 15px 0;">The mod <strong>"${modName}"</strong> was temporarily disabled for the game launch.</p>
        <p style="color: #888; margin-bottom: 20px;">Do you want to reactivate it now?</p>
        
        <div class="popup-btns">
          <button id="keep-disabled" style="background: #666;">Keep Disabled</button>
          <button id="reactivate-mod" class="primary">🔄 Reactivate</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    // Bouton réactiver
    popup.querySelector('#reactivate-mod').onclick = async () => {
      try {
        const restored = await window.electronAPI.moveFolder(tempPath, originalPath);
        if (restored) {
          showNotification(`✅ Mod "${modName}" reactivated!`);
          // Rafraîchit l'affichage
          if (window.loadModsPage) {
            setTimeout(() => window.loadModsPage(), 500);
          }
        } else {
          showNotification(`❌ Failed to reactivate mod "${modName}"`, true);
        }
      } catch (error) {
        console.error('Error reactivating mod:', error);
        showNotification(`❌ Error reactivating mod: ${error.message}`, true);
      }
      
      popup.remove();
      callback({ success: true, reactivated: true });
    };
    
    // Bouton garder désactivé
    popup.querySelector('#keep-disabled').onclick = async () => {
      try {
        // Déplace vers le dossier de mods désactivés normal
        const finalPath = `${localStorage.getItem('disabled_mods_path')}/${modName}`;
        const moved = await window.electronAPI.moveFolder(tempPath, finalPath);
        if (moved) {
          showNotification(`⚠️ Mod "${modName}" kept disabled`);
          // Rafraîchit l'affichage
          if (window.loadModsPage) {
            setTimeout(() => window.loadModsPage(), 500);
          }
        }
      } catch (error) {
        console.error('Error moving mod to disabled folder:', error);
      }
      
      popup.remove();
      callback({ success: true, reactivated: false });
    };
    
    // Fermeture par Échap (réactive par défaut)
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        popup.querySelector('#reactivate-mod').click();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Focus sur le bouton réactiver
    setTimeout(() => popup.querySelector('#reactivate-mod').focus(), 100);
  }
};

// 🆕 GESTIONNAIRE DE RENOMMAGE DE MODS
const ModRenameManager = {
  // 🏷️ Fonction principale de renommage
  async renameMod(oldModName, newModName, isEnabled) {
    try {
      console.log('🏷️ Starting rename:', oldModName, '→', newModName);
      
      // Validation du nouveau nom
      const validation = this.validateNewName(newModName);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      
      // Détermine les chemins
      const modsPath = localStorage.getItem('mods_path') || '';
      const disabledModsPath = localStorage.getItem('disabled_mods_path') || '';
      
      if (!modsPath || !disabledModsPath) {
        return { success: false, error: 'Mod paths not configured' };
      }
      
      const basePath = isEnabled ? modsPath : disabledModsPath;
      const oldPath = `${basePath}/${oldModName}`;
      const newPath = `${basePath}/${newModName}`;
      
      console.log('📁 Old path:', oldPath);
      console.log('📁 New path:', newPath);
      
      // Vérifie que l'ancien mod existe
      const existingMods = window.electronAPI.listFolders(basePath);
      if (!existingMods.includes(oldModName)) {
        return { success: false, error: 'Source mod not found' };
      }
      
      // Vérifie que le nouveau nom n'existe pas déjà
      if (existingMods.includes(newModName)) {
        return { success: false, error: 'A mod with this name already exists' };
      }
      
      // Vérifie aussi dans l'autre dossier (actif/désactivé)
      const otherBasePath = isEnabled ? disabledModsPath : modsPath;
      const otherMods = window.electronAPI.listFolders(otherBasePath);
      if (otherMods.includes(newModName)) {
        return { success: false, error: 'A mod with this name already exists (in ' + (isEnabled ? 'disabled' : 'active') + ' mods)' };
      }
      
      // Effectue le renommage via moveFolder
      console.log('🔄 Executing rename...');
      const moveResult = window.electronAPI.moveFolder(oldPath, newPath);
      
      if (!moveResult) {
        return { success: false, error: 'Rename failed (system error)' };
      }
      
      // Met à jour la note associée
      ModNotesManager.renameNote(oldModName, newModName);
      
      // Met à jour les conflits associés
      ModConflictManager.renameConflicts(oldModName, newModName);
      
      // 🆕 Met à jour les favoris associés
      ModFavoritesManager.renameFavorite(oldModName, newModName);
      
      // 🆕 Met à jour les dates d'installation
      ModInstallDateManager.renameInstallDate(oldModName, newModName);
      
      // 🆕 Met à jour les liens Nexus
      ModNexusLinksManager.renameNexusLink(oldModName, newModName);
      
      console.log('✅ Rename successful:', oldModName, '→', newModName);
      return { success: true, oldName: oldModName, newName: newModName };
      
    } catch (error) {
      console.error('❌ Error renaming mod:', error);
      return { success: false, error: error.message };
    }
  },
  
  // 🔍 Validation du nouveau nom
  validateNewName(newName) {
    // Nettoie le nom
    newName = newName.trim();
    
    // Vérifie que le nom n'est pas vide
    if (!newName) {
      return { valid: false, error: 'Name cannot be empty' };
    }
    
    // Vérifie la longueur
    if (newName.length > 100) {
      return { valid: false, error: 'Name is too long (max 100 characters)' };
    }
    
    // Vérifie les caractères interdits pour les noms de fichiers Windows
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(newName)) {
      return { valid: false, error: 'Invalid characters: < > : " / \\ | ? *' };
    }
    
    // Vérifie les noms réservés Windows
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    if (reservedNames.includes(newName.toUpperCase())) {
      return { valid: false, error: 'Reserved system name not allowed' };
    }
    
    return { valid: true };
  },
  
  // 📝 Interface de saisie du nouveau nom
  showRenameDialog(currentName, callback) {
    console.log('📝 Opening rename dialog for:', currentName);
    
    // Utilise le système de popup existant mais adapté
    const popup = document.createElement('div');
    popup.className = 'custom-popup rename-popup';
    
    popup.innerHTML = `
      <div class="popup-content rename-content">
        <h2>🏷️ Rename mod<br><span>${currentName}</span></h2>
        <p style="color: #888; margin-bottom: 20px; text-align: center;">
          Enter the new name for this mod
        </p>
        
        <div class="rename-input-container">
          <input type="text" id="rename-input" value="${currentName}" 
                 placeholder="New mod name..."
                 maxlength="100" autocomplete="off">
          <div class="rename-char-count">
            <span id="rename-char-count">${currentName.length}</span>/100 characters
          </div>
        </div>
        
        <div class="rename-tips">
          💡 <strong>Tips:</strong> 
          <ul>
            <li>Avoid special characters: < > : " / \\ | ? *</li>
            <li>Use descriptive and short names</li>
            <li>Spaces are allowed</li>
          </ul>
        </div>
        
        <div class="popup-btns">
          <button id="rename-cancel" style="background: #666;">❌ Cancel</button>
          <button id="rename-confirm" class="primary">🏷️ Rename</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(popup);

    // Styles CSS spécifiques
    const style = document.createElement('style');
    style.setAttribute('data-popup-temp', 'true');
    style.textContent = `
      .rename-popup .popup-content {
        min-width: 500px;
        max-width: 600px;
      }
      
      .rename-input-container {
        position: relative;
        margin: 20px 0;
      }
      
      #rename-input {
        width: 100%;
        padding: 12px;
        background: #191b25;
        border: 2px solid #444;
        border-radius: 8px;
        color: #fff;
        font-size: 1.1em;
        font-family: inherit;
        outline: none;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      
      #rename-input:focus {
        border-color: #48ffd3;
        box-shadow: 0 0 0 3px rgba(72, 255, 211, 0.1);
      }
      
      .rename-char-count {
        position: absolute;
        bottom: -25px;
        right: 0;
        font-size: 0.85em;
        color: #888;
      }
      
      .rename-char-count.warning {
        color: #ffa726;
      }
      
      .rename-char-count.error {
        color: #ff5722;
      }
      
      .rename-tips {
        background: rgba(72, 255, 211, 0.05);
        border: 1px solid rgba(72, 255, 211, 0.2);
        border-radius: 8px;
        padding: 15px;
        margin: 30px 0 20px 0;
        text-align: left;
        font-size: 0.9em;
        color: #ccc;
      }
      
      .rename-tips strong {
        color: #48ffd3;
      }
      
      .rename-tips ul {
        margin: 8px 0 0 0;
        padding-left: 20px;
      }
      
      .rename-tips li {
        margin: 4px 0;
        color: #aaa;
      }
    `;
    document.head.appendChild(style);

    const input = popup.querySelector('#rename-input');
    const charCount = popup.querySelector('#rename-char-count');
    const charCountContainer = popup.querySelector('.rename-char-count');
    const confirmBtn = popup.querySelector('#rename-confirm');

    // Gestion du compteur de caractères et validation
    function updateCharCount() {
      const currentLength = input.value.length;
      charCount.textContent = currentLength;
      
      charCountContainer.className = 'rename-char-count';
      if (currentLength > 80) {
        charCountContainer.classList.add('warning');
      }
      if (currentLength > 100) {
        charCountContainer.classList.add('error');
      }
      
      // Validation en temps réel
      const validation = ModRenameManager.validateNewName(input.value);
      confirmBtn.disabled = !validation.valid;
      
      if (!validation.valid && input.value.trim()) {
        input.style.borderColor = '#ff5722';
        confirmBtn.textContent = '❌ ' + validation.error;
      } else {
        input.style.borderColor = input.value.trim() === currentName ? '#444' : '#48ffd3';
        confirmBtn.textContent = input.value.trim() === currentName ? '🏷️ Rename' : '🏷️ Rename';
      }
    }

    // Event listeners
    input.addEventListener('input', updateCharCount);
    
    // Sélectionne tout le texte au focus
    input.addEventListener('focus', () => {
      input.select();
    });

    // Bouton confirmer
    confirmBtn.addEventListener('click', () => {
      const newName = input.value.trim();
      
      if (newName === currentName) {
        closeRenameDialog();
        return;
      }
      
      const validation = ModRenameManager.validateNewName(newName);
      if (validation.valid) {
        closeRenameDialog();
        callback({ success: true, newName });
      } else {
        showNotification('❌ ' + validation.error, true);
      }
    });

    // Bouton annuler
    popup.querySelector('#rename-cancel').addEventListener('click', () => {
      closeRenameDialog();
      callback({ success: false, cancelled: true });
    });

    // Entrée pour confirmer
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !confirmBtn.disabled) {
        confirmBtn.click();
      }
      if (e.key === 'Escape') {
        closeRenameDialog();
        callback({ success: false, cancelled: true });
      }
    });

    // Fermeture par clic à l'extérieur
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        closeRenameDialog();
        callback({ success: false, cancelled: true });
      }
    });

    // Focus sur l'input
    setTimeout(() => {
      input.focus();
      input.select();
    }, 100);

    // Initialise la validation
    updateCharCount();

    function closeRenameDialog() {
      popup.remove();
      document.querySelectorAll('style[data-popup-temp]').forEach(s => s.remove());
    }
  }
};

window.loadModsPage = function() {
  const modsContent = document.getElementById('mods-content');

  const modsPath = localStorage.getItem('mods_path') || '';
  const disabledModsPath = localStorage.getItem('disabled_mods_path') || '';

  const activeMods = window.electronAPI.listFolders(modsPath);
  const disabledMods = window.electronAPI.listFolders(disabledModsPath);

  // Stockage des données pour la recherche
  allModsData = {
    active: activeMods.map(name => ({ name, enabled: true, basePath: modsPath })),
    disabled: disabledMods.map(name => ({ name, enabled: false, basePath: disabledModsPath }))
  };

  // 🆕 Initialise les dates d'installation pour les mods existants
  ModInstallDateManager.initializeDatesForExistingMods();

  function getPreviewPath(basePath, modName) {
    return `file://${basePath.replace(/\\/g, '/')}/${modName}/preview.jpg`;
  }

  // 🆕 NOUVELLE FONCTION POUR CRÉER UNE CARTE DE MOD (avec badges, favoris, conflits bidirectionnels et liens Nexus)
  function createModCard(modName, enabled, basePath) {
    // Récupère la note du mod
    const note = ModNotesManager.getNote(modName);
    const hasNote = note && note.text;
    const notePreview = hasNote ? ModNotesManager.formatNotePreview(note.text, 60) : '';
    
    // 🆕 Récupère TOUS les conflits (directs + bidirectionnels)
    const allConflicts = ModConflictManager.getAllConflictsForMod(modName);
    const hasConflicts = allConflicts.total > 0;
    
    // 🆕 Récupère le statut des favoris
    const isFavorite = ModFavoritesManager.isFavorite(modName);
    
    // 🆕 Récupère le lien Nexus
    const nexusLink = ModNexusLinksManager.getNexusLink(modName);
    const hasNexusLink = nexusLink && nexusLink.url;
    
    // Badge style capture d'écran
    const badgeClass = enabled ? 'active-badge' : 'inactive-badge';
    const badgeText = enabled ? 'Active' : 'Inactive';
    const badgeColor = enabled ? '#48ffd3' : '#ff4343'; // Cyan pour actifs, rouge pour inactifs
    
    // Bouton avec couleurs spécifiées
    const buttonText = enabled ? 'Disable' : 'Enable';
    const buttonClass = enabled ? 'deactivate-btn' : 'activate-btn';
    
    return `
      <div class="home-mod-card mod-card-flex" data-mod="${modName}" data-enabled="${enabled}">
        <!-- Image avec badge de statut -->
        <div class="mod-image-container">
          <img src="${getPreviewPath(basePath, modName)}" alt="thumbnail"
               onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg';">
          
          <!-- Badge style capture d'écran -->
          <div class="mod-status-badge ${badgeClass}">
            <span class="status-dot" style="background: ${badgeColor};"></span>
            ${badgeText}
          </div>
          
          <!-- 🆕 Étoile de favoris -->
          <div class="mod-favorite-star ${isFavorite ? 'favorited' : ''}" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}" data-mod="${modName}">
            ${isFavorite ? '⭐' : '☆'}
          </div>
          
          <!-- Indicateur de conflits si présent (bidirectionnel) -->
          ${hasConflicts ? `
            <div class="mod-conflict-badge clickable" title="Click to view ${allConflicts.total} conflict(s): ${allConflicts.all.join(', ')}" data-mod="${modName}">
              ⚔️ ${allConflicts.total}
            </div>
          ` : ''}
          
          <!-- 🆕 Badge Nexus Link -->
          ${hasNexusLink ? `
            <div class="mod-nexus-badge clickable" title="Open Nexus page: ${nexusLink.url}" data-mod="${modName}" data-url="${nexusLink.url}">
              🌐
            </div>
          ` : ''}
        </div>
        
        <!-- Informations du mod -->
        <div class="mod-info mod-info-flex">
          <div class="mod-name" title="${modName}">${modName}</div>
          
          ${hasNote ? `
            <div class="mod-note-preview" title="${note.text}">
              📝 ${notePreview}
            </div>
          ` : ''}
        </div>
        
        <!-- Actions alignées en bas -->
        <div class="mod-actions mod-actions-bottom">
          <button class="mod-action-btn ${buttonClass}" data-mod="${modName}" data-enabled="${enabled}">
            <span class="btn-text">${buttonText}</span>
          </button>
        </div>
      </div>
    `;
  }

  // Interface avec deux sections séparées (Active/Disabled) - Header supprimé pour éviter le doublon
  modsContent.innerHTML = `
    <!-- Header supprimé car déjà présent dans index.html -->

    <!-- 🆕 CONTRÔLES SÉPARÉS POUR ÉVITER LES CONFLITS CSS -->
    <div style="margin-bottom: 30px;">
      <!-- Barre de recherche -->
      <div class="search-container" style="margin-bottom: 15px; max-width: 400px;">
        <input type="text" id="mod-search" placeholder="🔍 Search mod..." />
        <button id="clear-search" class="clear-btn" title="Clear">✕</button>
      </div>
      
      <!-- Sélecteur de tri repositionné -->
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="color: #888; font-size: 0.9em;">Sort by:</span>
        <select id="sort-select" style="padding: 8px 12px; background: #191b25; border: 1px solid #444; border-radius: 8px; color: #fff; font-size: 0.9em; outline: none; cursor: pointer; min-width: 150px;">
          <option value="name-asc">📝 Name (A-Z)</option>
          <option value="name-desc">📝 Name (Z-A)</option>
          <option value="date-desc">📅 Newest first</option>
          <option value="date-asc">📅 Oldest first</option>
          <option value="favorites">⭐ Favorites first</option>
          <option value="conflicts">⚔️ Most conflicts</option>
        </select>
      </div>
    </div>

    <!-- Sections avec grilles harmonisées -->
    <div class="mods-sections">
      <!-- Section Enabled Mods -->
      <div class="home-section" id="active-section">
        <div class="section-header">
          <h3>🟢 Enabled Mods (<span id="active-visible">${activeMods.length}</span>)</h3>
          <p>Mods currently used by the game</p>
        </div>
        <div class="home-mods-grid" id="active-mods-grid">
          ${activeMods.map(name => createModCard(name, true, modsPath)).join('')}
        </div>
      </div>

      <!-- Section Disabled Mods -->
      <div class="home-section" id="disabled-section">
        <div class="section-header">
          <h3>🔴 Disabled Mods (<span id="disabled-visible">${disabledMods.length}</span>)</h3>
          <p>Installed but not currently used mods</p>
        </div>
        <div class="home-mods-grid" id="disabled-mods-grid">
          ${disabledMods.map(name => createModCard(name, false, disabledModsPath)).join('')}
        </div>
      </div>
    </div>

    <!-- Styles CSS pour badges et alignement -->
    <style>
      /* Badges style capture d'écran avec transparence et centrage */
      .mod-status-badge {
        position: absolute;
        top: 8px;
        left: 8px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 6px 12px;
        border-radius: 12px;
        font-size: 0.8em;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        text-align: center;
        min-width: 70px;
      }
      
      /* Badge de conflits */
      .mod-conflict-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(255, 107, 53, 0.9);
        color: white;
        padding: 4px 8px;
        border-radius: 10px;
        font-size: 0.75em;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 3px;
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 107, 53, 0.6);
        box-shadow: 0 2px 8px rgba(255, 107, 53, 0.4);
        min-width: 35px;
        transition: all 0.2s ease;
      }
      
      .mod-conflict-badge.clickable {
        cursor: pointer;
        user-select: none;
      }
      
      .mod-conflict-badge.clickable:hover {
        background: rgba(255, 107, 53, 1);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(255, 107, 53, 0.6);
        border-color: rgba(255, 107, 53, 0.8);
      }
      
      .mod-conflict-badge.clickable:active {
        transform: translateY(0);
        box-shadow: 0 2px 6px rgba(255, 107, 53, 0.4);
      }
      
      /* 🆕 Étoile de favoris */
      .mod-favorite-star {
        position: absolute;
        top: 50px;
        left: 8px;
        background: rgba(0, 0, 0, 0.7);
        color: #ffd700;
        padding: 4px 6px;
        border-radius: 8px;
        font-size: 1.1em;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 215, 0, 0.3);
        cursor: pointer;
        user-select: none;
        transition: all 0.2s ease;
        width: 24px;
        height: 24px;
      }
      
      .mod-favorite-star:hover {
        background: rgba(255, 215, 0, 0.2);
        transform: translateY(-1px) scale(1.1);
        box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
        border-color: rgba(255, 215, 0, 0.6);
      }
      
      .mod-favorite-star.favorited {
        background: rgba(255, 215, 0, 0.2);
        border-color: rgba(255, 215, 0, 0.6);
        color: #ffd700;
        text-shadow: 0 0 8px rgba(255, 215, 0, 0.8);
      }
      
      .mod-favorite-star:not(.favorited) {
        color: #999;
        opacity: 0.7;
      }
      
      .mod-favorite-star:not(.favorited):hover {
        color: #ffd700;
        opacity: 1;
      }
      
      .mod-favorite-star:active {
        transform: translateY(0) scale(1);
        box-shadow: 0 2px 6px rgba(255, 215, 0, 0.3);
      }
      
      /* 🆕 Badge Nexus Link */
      .mod-nexus-badge {
        position: absolute;
        bottom: 8px;
        right: 8px;
        background: rgba(0, 100, 200, 0.9);
        color: white;
        padding: 6px 8px;
        border-radius: 8px;
        font-size: 1em;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(8px);
        border: 1px solid rgba(100, 150, 255, 0.6);
        cursor: pointer;
        user-select: none;
        transition: all 0.2s ease;
        width: 28px;
        height: 28px;
        box-shadow: 0 2px 8px rgba(0, 100, 200, 0.4);
      }
      
      .mod-nexus-badge:hover {
        background: rgba(0, 120, 255, 1);
        transform: translateY(-1px) scale(1.05);
        box-shadow: 0 4px 12px rgba(0, 120, 255, 0.6);
        border-color: rgba(100, 150, 255, 0.8);
      }
      
      .mod-nexus-badge:active {
        transform: translateY(0) scale(1);
        box-shadow: 0 2px 6px rgba(0, 100, 200, 0.4);
      }
      
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
      }
      
      .active-badge {
        background: linear-gradient(135deg, rgba(72, 255, 211, 0.45), rgba(40, 212, 123, 0.45));
        color: white;
        border: 1px solid rgba(72, 255, 211, 0.6);
      }
      
      .inactive-badge {
        background: rgba(255, 67, 67, 0.45);
        color: white;
        border: 1px solid rgba(255, 67, 67, 0.6);
      }
      
      /* Cartes avec alignement flexible */
      .mod-card-flex {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      
      .mod-info-flex {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .mod-actions-bottom {
        margin-top: auto;
        padding-top: 8px;
      }
      
      /* Couleurs des boutons avec effets de survol et transparence */
      .mod-action-btn {
        width: 100%;
        border: none;
        border-radius: 8px;
        padding: 10px 16px;
        font-size: 0.9em;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s ease, transform 0.1s ease;
        color: white;
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .mod-action-btn:hover {
        transform: translateY(-1px);
      }
      
      /* Bouton désactiver (mods actifs) - dégradé cyan/vert transparent par défaut, rouge transparent au survol */
      .deactivate-btn {
        background: linear-gradient(135deg, rgba(72, 255, 211, 0.46), rgba(40, 212, 123, 0.85));
        border: 1px solid rgba(72, 255, 211, 0.6);
      }
      
      .deactivate-btn:hover {
        background: rgba(255, 67, 67, 0.85) !important;
        border: 1px solid rgba(255, 67, 67, 0.6) !important;
      }
      
      /* Bouton activer (mods désactivés) - rouge transparent par défaut, dégradé cyan/vert transparent au survol */
      .activate-btn {
        background: rgba(255, 67, 67, 0.85);
        border: 1px solid rgba(255, 67, 67, 0.6);
      }
      
      .activate-btn:hover {
        background: linear-gradient(135deg, rgba(72, 255, 211, 0.85), rgba(40, 212, 123, 0.85)) !important;
        border: 1px solid rgba(72, 255, 211, 0.6) !important;
      }
      
      /* Animation de traitement */
      .mod-action-btn.processing {
        background: #666 !important;
        cursor: wait;
      }
      
      .mod-action-btn.processing:hover {
        background: #666 !important;
        transform: none;
      }
    </style>
  `;

  // Initialisation de la recherche
  initializeSearch();
  
  // Gestion activation/désactivation avec notification et gestion des conflits
  setupModToggleHandlers();
  
  // Menu contextuel clic droit
  setupContextMenus();
  
  // 🆕 Gestion des clics sur les badges de conflit
  setupConflictBadgeHandlers();
  
  // 🆕 Gestion des étoiles de favoris
  setupFavoriteStarHandlers();
  
  // 🆕 Gestion du tri
  setupSortingHandlers();
  
  // 🆕 Gestion des badges Nexus
  setupNexusBadgeHandlers();
};

function initializeSearch() {
  const searchInput = document.getElementById('mod-search');
  const clearButton = document.getElementById('clear-search');
  
  // Recherche en temps réel
  searchInput.addEventListener('input', function() {
    const query = this.value.toLowerCase().trim();
    filterMods(query);
    
    // Affiche/cache le bouton clear
    clearButton.style.display = query ? 'block' : 'none';
  });

  // Bouton pour effacer la recherche
  clearButton.addEventListener('click', function() {
    searchInput.value = '';
    filterMods('');
    this.style.display = 'none';
    searchInput.focus();
  });

  // Raccourci clavier Ctrl+F pour focus sur la recherche
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'f' && document.querySelector('#tab-mods').classList.contains('active')) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });
}

function filterMods(query) {
  const activeGrid = document.getElementById('active-mods-grid');
  const disabledGrid = document.getElementById('disabled-mods-grid');
  const activeSection = document.getElementById('active-section');
  const disabledSection = document.getElementById('disabled-section');
  
  let activeVisible = 0;
  let disabledVisible = 0;

  // Filtre les mods activés
  allModsData.active.forEach(mod => {
    const card = activeGrid.querySelector(`[data-mod="${mod.name}"]`);
    if (card) {
      // Recherche aussi dans les notes
      const note = ModNotesManager.getNote(mod.name);
      const noteText = note ? note.text.toLowerCase() : '';
      
      const matches = mod.name.toLowerCase().includes(query) || noteText.includes(query);
      card.style.display = matches ? 'block' : 'none';
      if (matches) activeVisible++;
    }
  });

  // Filtre les mods désactivés
  allModsData.disabled.forEach(mod => {
    const card = disabledGrid.querySelector(`[data-mod="${mod.name}"]`);
    if (card) {
      // Recherche aussi dans les notes
      const note = ModNotesManager.getNote(mod.name);
      const noteText = note ? note.text.toLowerCase() : '';
      
      const matches = mod.name.toLowerCase().includes(query) || noteText.includes(query);
      card.style.display = matches ? 'block' : 'none';
      if (matches) disabledVisible++;
    }
  });

  // Met à jour les compteurs
  document.getElementById('active-visible').textContent = activeVisible;
  document.getElementById('disabled-visible').textContent = disabledVisible;

  // Cache les sections vides lors de la recherche
  if (query) {
    activeSection.style.display = activeVisible > 0 ? 'block' : 'none';
    disabledSection.style.display = disabledVisible > 0 ? 'block' : 'none';
    
    // Affiche un message si aucun résultat
    showNoResultsMessage(activeVisible === 0 && disabledVisible === 0, query);
  } else {
    activeSection.style.display = 'block';
    disabledSection.style.display = 'block';
    removeNoResultsMessage();
  }
}

function showNoResultsMessage(show, query) {
  removeNoResultsMessage();
  
  if (show) {
    const modsContent = document.getElementById('mods-content');
    const noResults = document.createElement('div');
    noResults.id = 'no-results';
    noResults.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #888;">
        <div style="font-size: 3em; margin-bottom: 16px;">🔍</div>
        <div style="font-size: 1.2em; margin-bottom: 8px;">No mods found</div>
        <div style="font-size: 0.9em;">for "<strong>${query}</strong>"</div>
        <div style="font-size: 0.8em; margin-top: 8px; color: #666;">
          (search in names and notes)
        </div>
      </div>
    `;
    modsContent.appendChild(noResults);
  }
}

function removeNoResultsMessage() {
  const existing = document.getElementById('no-results');
  if (existing) existing.remove();
}

function setupModToggleHandlers() {
  const modsPath = localStorage.getItem('mods_path') || '';
  const disabledModsPath = localStorage.getItem('disabled_mods_path') || '';

  document.querySelectorAll('.mod-action-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const modName = btn.getAttribute('data-mod');
      const isEnabled = btn.getAttribute('data-enabled') === 'true';

      let src, dest;
      if (isEnabled) {
        src = `${modsPath}/${modName}`;
        dest = `${disabledModsPath}/${modName}`;
      } else {
        src = `${disabledModsPath}/${modName}`;
        dest = `${modsPath}/${modName}`;
      }

      // Animation du bouton pendant le traitement
      btn.classList.add('processing');
      btn.textContent = 'Processing...';

      try {
        // Si on active un mod, gère d'abord les conflits
        if (!isEnabled) {
          const conflictResult = await ModConflictManager.handleModActivation(modName);
          if (conflictResult.conflictsHandled > 0) {
            showNotification(`⚔️ ${conflictResult.conflictsHandled} conflicting mod(s) auto-disabled`);
          }
        }

        const moved = await window.electronAPI.moveFolder(src, dest);

        if (!moved) {
          showNotification("Error moving mod!", true);
          // Restaure le bouton en cas d'erreur
          btn.classList.remove('processing');
          btn.textContent = isEnabled ? 'Disable' : 'Enable';
        } else {
          showNotification(isEnabled ? "Mod disabled!" : "Mod enabled!");
          // Recharge la page pour refléter les changements
          setTimeout(() => window.loadModsPage(), 500);
        }
      } catch (error) {
        console.error('Error during mod toggle:', error);
        showNotification("Error during mod toggle!", true);
        btn.classList.remove('processing');
        btn.textContent = isEnabled ? 'Disable' : 'Enable';
      }
    });
  });
}

function setupFavoriteStarHandlers() {
  // Gestion des clics sur les étoiles de favoris
  document.querySelectorAll('.mod-favorite-star').forEach(star => {
    star.addEventListener('click', (e) => {
      e.stopPropagation(); // Empêche le clic de se propager à la carte
      e.preventDefault();
      
      const modName = star.getAttribute('data-mod');
      console.log('⭐ Favorite star clicked for:', modName);
      
      // Toggle le statut de favori
      const success = ModFavoritesManager.toggleFavorite(modName);
      if (success) {
        const isFavorite = ModFavoritesManager.isFavorite(modName);
        
        // Met à jour visuellement l'étoile
        if (isFavorite) {
          star.classList.add('favorited');
          star.textContent = '⭐';
          star.title = 'Remove from favorites';
          showNotification(`⭐ "${modName}" added to favorites!`);
        } else {
          star.classList.remove('favorited');
          star.textContent = '☆';
          star.title = 'Add to favorites';
          showNotification(`☆ "${modName}" removed from favorites`);
        }
      } else {
        showNotification('❌ Error updating favorite status', true);
      }
    });
  });
}

function setupSortingHandlers() {
  const sortSelect = document.getElementById('sort-select');
  
  sortSelect.addEventListener('change', () => {
    const sortType = sortSelect.value;
    console.log('📊 Sorting by:', sortType);
    sortModsBy(sortType);
  });
}

function sortModsBy(sortType) {
  const activeGrid = document.getElementById('active-mods-grid');
  const disabledGrid = document.getElementById('disabled-mods-grid');
  
  // Récupère les cartes actuelles
  const activeCards = Array.from(activeGrid.querySelectorAll('.mod-card-flex'));
  const disabledCards = Array.from(disabledGrid.querySelectorAll('.mod-card-flex'));
  
  // Fonction de tri générique
  function sortCards(cards) {
    return cards.sort((a, b) => {
      const modNameA = a.getAttribute('data-mod');
      const modNameB = b.getAttribute('data-mod');
      
      switch (sortType) {
        case 'name-asc':
          return modNameA.toLowerCase().localeCompare(modNameB.toLowerCase());
          
        case 'name-desc':
          return modNameB.toLowerCase().localeCompare(modNameA.toLowerCase());
          
        case 'date-desc':
        case 'date-asc':
          const dateA = getModInstallDate(modNameA, a.getAttribute('data-enabled') === 'true');
          const dateB = getModInstallDate(modNameB, b.getAttribute('data-enabled') === 'true');
          return sortType === 'date-desc' ? dateB - dateA : dateA - dateB;
          
        case 'favorites':
          const favA = ModFavoritesManager.isFavorite(modNameA) ? 1 : 0;
          const favB = ModFavoritesManager.isFavorite(modNameB) ? 1 : 0;
          if (favA !== favB) return favB - favA; // Favoris en premier
          return modNameA.toLowerCase().localeCompare(modNameB.toLowerCase()); // Puis par nom
          
        case 'conflicts':
          const conflictsA = ModConflictManager.getAllConflictsForMod(modNameA).total;
          const conflictsB = ModConflictManager.getAllConflictsForMod(modNameB).total;
          if (conflictsA !== conflictsB) return conflictsB - conflictsA; // Plus de conflits en premier
          return modNameA.toLowerCase().localeCompare(modNameB.toLowerCase()); // Puis par nom
          
        default:
          return 0;
      }
    });
  }
  
  // Trie les cartes
  const sortedActiveCards = sortCards(activeCards);
  const sortedDisabledCards = sortCards(disabledCards);
  
  // Réinsère les cartes triées
  sortedActiveCards.forEach(card => activeGrid.appendChild(card));
  sortedDisabledCards.forEach(card => disabledGrid.appendChild(card));
  
  // Animation de tri
  document.querySelectorAll('.mod-card-flex').forEach((card, index) => {
    card.style.animationDelay = `${index * 0.02}s`;
    card.style.animation = 'cardIn 0.3s ease-out';
  });
}

function getModInstallDate(modName, isEnabled) {
  // Utilise le nouveau système de gestion des dates
  const installDate = ModInstallDateManager.getInstallDate(modName);
  
  if (installDate) {
    return installDate.getTime();
  }
  
  // Fallback : si pas de date enregistrée, essaie d'estimer basé sur l'ordre alphabétique
  // (ceci sera remplacé par l'initialisation automatique)
  console.warn(`📅 No install date found for mod: ${modName}`);
  return Date.now() - (modName.charCodeAt(0) * 86400000); // 1 jour par lettre de l'alphabet
}

function setupNexusBadgeHandlers() {
  // Gestion des clics sur les badges Nexus
  document.querySelectorAll('.mod-nexus-badge.clickable').forEach(badge => {
    badge.addEventListener('click', (e) => {
      e.stopPropagation(); // Empêche le clic de se propager à la carte
      e.preventDefault();
      
      const url = badge.getAttribute('data-url');
      console.log('🌐 Nexus badge clicked, opening:', url);
      
      // Ouvre l'URL dans le navigateur externe
      if (window.electronAPI && window.electronAPI.openExternal) {
        window.electronAPI.openExternal(url);
      } else {
        window.open(url, '_blank');
      }
    });
  });
}

function setupConflictBadgeHandlers() {
  // Gestion des clics sur les badges de conflit
  document.querySelectorAll('.mod-conflict-badge.clickable').forEach(badge => {
    badge.addEventListener('click', (e) => {
      e.stopPropagation(); // Empêche le clic de se propager à la carte
      e.preventDefault();
      
      const modName = badge.getAttribute('data-mod');
      console.log('🔍 Conflict badge clicked for:', modName);
      
      // Affiche la liste des conflits
      ModConflictManager.showConflictsList(modName);
    });
  });
}

// Expose ModNotesManager globalement
window.ModNotesManager = ModNotesManager;
// 🆕 Expose ModInstallDateManager globalement
window.ModInstallDateManager = ModInstallDateManager;
// 🆕 Expose ModFavoritesManager globalement
window.ModFavoritesManager = ModFavoritesManager;
// 🆕 Expose ModNexusLinksManager globalement
window.ModNexusLinksManager = ModNexusLinksManager;
// 🆕 Expose ModConflictManager globalement
window.ModConflictManager = ModConflictManager;
// 🆕 Expose TemporaryLaunchManager globalement
window.TemporaryLaunchManager = TemporaryLaunchManager;
// 🆕 Expose ModRenameManager globalement
window.ModRenameManager = ModRenameManager;

// Dans la fonction setupContextMenus() du fichier mods.js, remplacer la partie du menu contextuel par :

function setupContextMenus() {
  const modsPath = localStorage.getItem('mods_path') || '';
  const disabledModsPath = localStorage.getItem('disabled_mods_path') || '';

  document.getElementById('mods-content').querySelectorAll('.mod-card-flex').forEach(card => {
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      // Récupère les infos du mod
      const modName = card.getAttribute('data-mod');
      const isEnabled = card.getAttribute('data-enabled') === 'true';
      const basePath = isEnabled ? modsPath : disabledModsPath;
      const modPath = `${basePath}/${modName}`;

      // Récupère la note existante
      const existingNote = ModNotesManager.getNote(modName);
      const hasNote = existingNote && existingNote.text;
      
      // Récupère les conflits existants
      const existingConflicts = ModConflictManager.getConflicts(modName);
      const hasConflicts = existingConflicts.conflicts && existingConflicts.conflicts.length > 0;
      
      // 🆕 Récupère le lien Nexus existant
      const existingNexusLink = ModNexusLinksManager.getNexusLink(modName);
      const hasNexusLink = existingNexusLink && existingNexusLink.url;

      // Supprime les anciens menus contextuels s'il y en a
      document.querySelectorAll('.context-menu').forEach(m => m.remove());

      // Crée le menu contextuel AMÉLIORÉ avec nouvelles options 🆕
      const menu = document.createElement('div');
      menu.className = 'context-menu';
      menu.innerHTML = `
        <div class="context-item" data-action="open">📂 Open folder</div>
        <div class="context-item" data-action="add-preview">🖼️ Add thumbnail</div>
        <div class="context-separator"></div>
        <div class="context-item" data-action="rename" style="color:#48ffd3;">🏷️ Rename</div>
        <div class="context-item" data-action="nexus-link" style="color:#0078ff;">🌐 ${hasNexusLink ? 'Edit Nexus link' : 'Add Nexus link'}</div>
        <div class="context-separator"></div>
        <div class="context-item" data-action="manage-conflicts" style="color:#ff6b35;">⚔️ Manage conflicts ${hasConflicts ? `(${existingConflicts.conflicts.length})` : ''}</div>
        ${isEnabled ? '<div class="context-item" data-action="launch-without" style="color:#82eefd;">🎮 Launch game without this mod</div>' : ''}
        <div class="context-separator"></div>
        <div class="context-item" data-action="fix-structure">🔧 Fix structure</div>
        <div class="context-item" data-action="aggressive-fix" style="color:#ff9800;">⚡ Aggressive fix</div>
        <div class="context-separator"></div>
        <div class="context-item" data-action="edit-note">
          ${hasNote ? '📝 Edit note' : '📝 Add note'}
        </div>
        ${hasNote ? '<div class="context-item" data-action="delete-note" style="color:#ff8a65;">🗑️ Delete note</div>' : ''}
        <div class="context-separator"></div>
        <div class="context-item" data-action="delete" style="color:#ff4343;">🗑️ Delete this mod</div>
      `;
      document.body.appendChild(menu);
      menu.style.left = e.pageX + 'px';
      menu.style.top = e.pageY + 'px';

      menu.addEventListener('click', async (evt) => {
        // Ouvrir le dossier du mod
        if (evt.target.dataset.action === 'open') {
          window.electronAPI.openFolder(modPath);
        }
        
        // Ajouter une miniature (popup)
        if (evt.target.dataset.action === 'add-preview') {
          Popup.askMiniature(modName, result => {
            if (result?.mode === "file") {
              window.electronAPI.selectImageFile().then(filePath => {
                if (filePath) {
                  window.electronAPI.copyImageToPreview(filePath, modPath).then(ok => {
                    showNotification(ok ? "Thumbnail added!" : "Error adding thumbnail", !ok);
                    window.loadModsPage();
                  });
                }
              });
            }
            if (result?.mode === "url") {
              window.electronAPI.downloadImageToPreview(result.url, modPath).then(ok => {
                showNotification(ok ? "Thumbnail downloaded!" : "Error downloading thumbnail", !ok);
                window.loadModsPage();
              });
            }
          });
          menu.remove();
          return;
        }
        
        // 🆕 RENOMMER LE MOD
        if (evt.target.dataset.action === 'rename') {
          console.log('🏷️ Rename requested for:', modName);
          
          ModRenameManager.showRenameDialog(modName, async (result) => {
            if (result.success && result.newName) {
              // Affiche notification de traitement
              showNotification(`🏷️ Renaming in progress...`, false);
              
              const renameResult = await ModRenameManager.renameMod(modName, result.newName, isEnabled);
              
              if (renameResult.success) {
                showNotification(`🏷️ Mod renamed: "${renameResult.oldName}" → "${renameResult.newName}"`, false);
                // Recharge la page pour voir les changements
                setTimeout(() => window.loadModsPage(), 500);
              } else {
                showNotification(`❌ Rename error: ${renameResult.error}`, true);
              }
            }
          });
          
          menu.remove();
          return;
        }
        
        // 🆕 GESTION DU LIEN NEXUS
        if (evt.target.dataset.action === 'nexus-link') {
          console.log('🌐 Nexus link management requested for:', modName);
          
          ModNexusLinksManager.showNexusLinkDialog(modName, (result) => {
            if (result.success) {
              // Recharge la page pour voir les changements (badge Nexus)
              setTimeout(() => window.loadModsPage(), 500);
            }
          });
          
          menu.remove();
          return;
        }
        
        // 🆕 GESTION DES CONFLITS
        if (evt.target.dataset.action === 'manage-conflicts') {
          console.log('⚔️ Conflict management requested for:', modName);
          
          ModConflictManager.showConflictManager(modName, (result) => {
            if (result.success) {
              // Recharge la page pour voir les changements (indicateur de conflits)
              setTimeout(() => window.loadModsPage(), 500);
            }
          });
          
          menu.remove();
          return;
        }
        
        // 🆕 LANCEMENT TEMPORAIRE SANS MOD
        if (evt.target.dataset.action === 'launch-without') {
          console.log('🎮 Temporary launch without mod requested for:', modName);
          
          TemporaryLaunchManager.launchWithoutMod(modName, (result) => {
            if (result.success) {
              console.log('🎮 Temporary launch completed');
            } else {
              showNotification(`❌ Launch error: ${result.error}`, true);
            }
          });
          
          menu.remove();
          return;
        }
        
        // 🔧 CORRECTION STANDARD
        if (evt.target.dataset.action === 'fix-structure') {
          showNotification("🔧 Analyzing structure...", false);
          
          try {
            console.log('🔧 Structure fix for:', modPath);
            
            const result = window.electronAPI.flattenModDirectory(modPath);
            console.log('📊 Fix result:', result);
            
            if (result && result.success) {
              if (result.hasChanges) {
                const message = result.message || `Structure fixed for "${modName}"`;
                showNotification(`✅ ${message}`, false);
                setTimeout(() => window.loadModsPage(), 1000);
              } else {
                const message = result.message || `Structure already correct for "${modName}"`;
                showNotification(`ℹ️ ${message}`, false);
              }
            } else {
              const errorMsg = result && result.error ? result.error : 'Unknown error';
              showNotification(`❌ Error: ${errorMsg}`, true);
              console.error('Detailed error:', result);
            }
          } catch (error) {
            console.error('❌ Exception during fix:', error);
            showNotification(`❌ Unexpected error: ${error.message}`, true);
          }
          
          menu.remove();
          return;
        }
        
        // ⚡ CORRECTION AGRESSIVE
        if (evt.target.dataset.action === 'aggressive-fix') {
          showNotification("⚡ Aggressive fix in progress...", false);
          
          try {
            console.log('⚡ Aggressive fix for:', modPath);
            
            const result = window.electronAPI.aggressiveFlattenModDirectory(modPath);
            console.log('📊 Aggressive fix result:', result);
            
            if (result && result.success) {
              if (result.hasChanges) {
                const message = result.message || `Structure aggressively fixed for "${modName}"`;
                showNotification(`⚡ ${message}`, false);
                setTimeout(() => window.loadModsPage(), 1000);
              } else {
                const message = result.message || `No fix needed for "${modName}"`;
                showNotification(`ℹ️ ${message}`, false);
              }
            } else {
              const errorMsg = result && result.error ? result.error : 'Unknown error';
              showNotification(`❌ Aggressive error: ${errorMsg}`, true);
              console.error('Detailed error:', result);
            }
          } catch (error) {
            console.error('❌ Exception during aggressive fix:', error);
            showNotification(`❌ Unexpected error: ${error.message}`, true);
          }
          
          menu.remove();
          return;
        }
        
        // 🆕 AJOUTER/MODIFIER UNE NOTE
        if (evt.target.dataset.action === 'edit-note') {
          const existingNote = ModNotesManager.getNote(modName);
          
          Popup.askNote(modName, existingNote?.text || '', (result) => {
            if (result.success) {
              const saved = ModNotesManager.saveNote(modName, result.note);
              if (saved) {
                showNotification(result.note ? "📝 Note saved!" : "📝 Note deleted!");
                window.loadModsPage(); // Refresh pour afficher la note
              } else {
                showNotification("❌ Error saving note", true);
              }
            }
          });
          menu.remove();
          return;
        }
        
        // 🆕 SUPPRIMER UNE NOTE
        if (evt.target.dataset.action === 'delete-note') {
          Popup.askConfirm("Delete this mod's note?", (yes) => {
            if (yes) {
              const deleted = ModNotesManager.deleteNote(modName);
              if (deleted) {
                showNotification("🗑️ Note deleted!");
                window.loadModsPage(); // Refresh pour cacher l'indicateur de note
              } else {
                showNotification("❌ Error deleting note", true);
              }
            }
          });
          menu.remove();
          return;
        }
        
        // Supprimer le mod (popup confirm)
        if (evt.target.dataset.action === 'delete') {
          Popup.askConfirm("Delete this mod permanently?", (yes) => {
            if (yes) {
              window.electronAPI.deleteFolder(modPath);
              // Supprime aussi toutes les données associées au mod
              ModNotesManager.deleteNote(modName);
              ModConflictManager.deleteConflicts(modName);
              ModFavoritesManager.deleteFavorite(modName);
              ModInstallDateManager.deleteInstallDate(modName);
              ModNexusLinksManager.deleteNexusLink(modName);
              showNotification("Mod deleted!");
              window.loadModsPage();
            }
          });
          menu.remove();
          return;
        }
        menu.remove();
      });

      setTimeout(() => {
        document.addEventListener('click', () => menu.remove(), { once: true });
      }, 10);
    });
  });
}
