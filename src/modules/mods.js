function showNotification(msg, error = false) {
  const notif = document.getElementById('notification');
  notif.textContent = msg;
  notif.className = error ? 'show error' : 'show';
  setTimeout(() => { notif.className = 'hidden'; }, 2000);
}

window.loadModsPage = function() {
  const modsContent = document.getElementById('mods-content');
  modsContent.innerHTML = '<div style="text-align:center">Chargement des mods...</div>';

  const modsPath = localStorage.getItem('mods_path') || '';
  const disabledModsPath = localStorage.getItem('disabled_mods_path') || '';

  const activeMods = window.electronAPI.listFolders(modsPath);
  const disabledMods = window.electronAPI.listFolders(disabledModsPath);
function showNotification(msg, error = false) {
  const notif = document.getElementById('notification');
  notif.textContent = msg;
  notif.className = error ? 'show error' : 'show';
  setTimeout(() => { notif.className = 'hidden'; }, 2000);
}

// Variable globale pour stocker les données des mods pour le filtrage
let allModsData = { active: [], disabled: [] };

window.loadModsPage = function() {
  const modsContent = document.getElementById('mods-content');
  modsContent.innerHTML = '<div style="text-align:center">Chargement des mods...</div>';

  const modsPath = localStorage.getItem('mods_path') || '';
  const disabledModsPath = localStorage.getItem('disabled_mods_path') || '';

  const activeMods = window.electronAPI.listFolders(modsPath);
  const disabledMods = window.electronAPI.listFolders(disabledModsPath);

  // Stockage des données pour la recherche
  allModsData = {
    active: activeMods.map(name => ({ name, enabled: true, basePath: modsPath })),
    disabled: disabledMods.map(name => ({ name, enabled: false, basePath: disabledModsPath }))
  };

  function getPreviewPath(basePath, modName) {
    return `file://${basePath.replace(/\\/g, '/')}/${modName}/preview.jpg`;
  }

  function modTile(modName, enabled, basePath) {
    let shortName = modName.length > 35 ? modName.substring(0, 32) + '...' : modName;
    return `
      <div class="mod-card ${enabled ? 'enabled' : 'disabled'}" data-mod="${modName}" data-enabled="${enabled}">
        <img src="${getPreviewPath(basePath, modName)}" alt="miniature"
          onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg';">
        <div class="mod-name" title="${modName}">${shortName}</div>
        <button class="toggle-mod" data-mod="${modName}" data-enabled="${enabled}">
          ${enabled ? 'Désactiver' : 'Activer'}
        </button>
      </div>
    `;
  }

  // Interface avec barre de recherche
  modsContent.innerHTML = `
    <div class="mods-header">
      <div class="search-container">
        <input type="text" id="mod-search" placeholder="🔍 Rechercher un mod..." />
        <button id="clear-search" class="clear-btn" title="Effacer la recherche">✕</button>
      </div>
      <div class="mods-stats">
        <span id="active-count">${activeMods.length}</span> actifs • 
        <span id="disabled-count">${disabledMods.length}</span> désactivés
      </div>
    </div>
    <div class="mods-list">
      <h3 id="active-section">🟢 Mods activés (<span id="active-visible">${activeMods.length}</span>)</h3>
      <div class="mods-grid" id="active-mods-grid">
        ${activeMods.map(name => modTile(name, true, modsPath)).join('')}
      </div>
      <h3 id="disabled-section" style="margin-top:32px;">🔴 Mods désactivés (<span id="disabled-visible">${disabledMods.length}</span>)</h3>
      <div class="mods-grid" id="disabled-mods-grid">
        ${disabledMods.map(name => modTile(name, false, disabledModsPath)).join('')}
      </div>
    </div>
  `;

  // Initialisation de la recherche
  initializeSearch();
  
  // Gestion activation/désactivation avec notification
  setupModToggleHandlers();
  
  // Menu contextuel clic droit
  setupContextMenus();
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
      const matches = mod.name.toLowerCase().includes(query);
      card.style.display = matches ? 'flex' : 'none';
      if (matches) activeVisible++;
    }
  });

  // Filtre les mods désactivés
  allModsData.disabled.forEach(mod => {
    const card = disabledGrid.querySelector(`[data-mod="${mod.name}"]`);
    if (card) {
      const matches = mod.name.toLowerCase().includes(query);
      card.style.display = matches ? 'flex' : 'none';
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
        <div style="font-size: 1.2em; margin-bottom: 8px;">Aucun mod trouvé</div>
        <div style="font-size: 0.9em;">pour "<strong>${query}</strong>"</div>
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

  document.querySelectorAll('.toggle-mod').forEach(btn => {
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

      const moved = await window.electronAPI.moveFolder(src, dest);

      if (!moved) {
        showNotification("Erreur lors du déplacement du mod !", true);
      } else {
        showNotification(isEnabled ? "Mod désactivé !" : "Mod activé !");
      }

      window.loadModsPage(); // Refresh la grid
    });
  });
}

function setupContextMenus() {
  const modsPath = localStorage.getItem('mods_path') || '';
  const disabledModsPath = localStorage.getItem('disabled_mods_path') || '';

  document.getElementById('mods-content').querySelectorAll('.mod-card').forEach(card => {
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      // Récupère les infos du mod
      const modName = card.getAttribute('data-mod');
      const isEnabled = card.getAttribute('data-enabled') === 'true';
      const basePath = isEnabled ? modsPath : disabledModsPath;
      const modPath = `${basePath}/${modName}`;

      // Supprime les anciens menus contextuels s'il y en a
      document.querySelectorAll('.context-menu').forEach(m => m.remove());

      // Crée le menu contextuel
      const menu = document.createElement('div');
      menu.className = 'context-menu';
      menu.innerHTML = `
        <div class="context-item" data-action="open">📂 Ouvrir le dossier</div>
        <div class="context-item" data-action="add-preview">🖼️ Ajouter une miniature</div>
        <div class="context-item" data-action="delete" style="color:#ff4343;">🗑️ Supprimer ce mod</div>
      `;
      document.body.appendChild(menu);
      menu.style.left = e.pageX + 'px';
      menu.style.top = e.pageY + 'px';

      menu.addEventListener('click', (evt) => {
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
                    showNotification(ok ? "Miniature ajoutée !" : "Erreur lors de l'ajout", !ok);
                    window.loadModsPage();
                  });
                }
              });
            }
            if (result?.mode === "url") {
              window.electronAPI.downloadImageToPreview(result.url, modPath).then(ok => {
                showNotification(ok ? "Miniature téléchargée !" : "Erreur lors du téléchargement", !ok);
                window.loadModsPage();
              });
            }
          });
          menu.remove();
          return;
        }
        // Supprimer le mod (popup confirm)
        if (evt.target.dataset.action === 'delete') {
          Popup.askConfirm("Supprimer définitivement ce mod ?", (yes) => {
            if (yes) {
              window.electronAPI.deleteFolder(modPath);
              showNotification("Mod supprimé !");
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
  function getPreviewPath(basePath, modName) {
    return `file://${basePath.replace(/\\/g, '/')}/${modName}/preview.jpg`;
  }

  function modTile(modName, enabled, basePath) {
    let shortName = modName.length > 35 ? modName.substring(0, 32) + '...' : modName;
    return `
      <div class="mod-card ${enabled ? 'enabled' : 'disabled'}" data-mod="${modName}" data-enabled="${enabled}">
        <img src="${getPreviewPath(basePath, modName)}" alt="miniature"
          onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg';">
        <div class="mod-name" title="${modName}">${shortName}</div>
        <button class="toggle-mod" data-mod="${modName}" data-enabled="${enabled}">
          ${enabled ? 'Désactiver' : 'Activer'}
        </button>
      </div>
    `;
  }

  modsContent.innerHTML = `
    <div class="mods-list">
      <h3>🟢 Mods activés</h3>
      <div class="mods-grid">
        ${activeMods.map(name => modTile(name, true, modsPath)).join('')}
      </div>
      <h3 style="margin-top:32px;">🔴 Mods désactivés</h3>
      <div class="mods-grid">
        ${disabledMods.map(name => modTile(name, false, disabledModsPath)).join('')}
      </div>
    </div>
  `;

  // (1) Gestion activation/désactivation avec notification
  document.querySelectorAll('.toggle-mod').forEach(btn => {
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

      const moved = await window.electronAPI.moveFolder(src, dest);

      if (!moved) {
        showNotification("Erreur lors du déplacement du mod !", true);
      } else {
        showNotification(isEnabled ? "Mod désactivé !" : "Mod activé !");
      }

      window.loadModsPage(); // Refresh la grid
    });
  });

  // (2) Menu contextuel clic droit avec popup custom pour miniature/suppression
  modsContent.querySelectorAll('.mod-card').forEach(card => {
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      // Récupère les infos du mod
      const modName = card.getAttribute('data-mod');
      const isEnabled = card.getAttribute('data-enabled') === 'true';
      const basePath = isEnabled ? modsPath : disabledModsPath;
      const modPath = `${basePath}/${modName}`;

      // Supprime les anciens menus contextuels s'il y en a
      document.querySelectorAll('.context-menu').forEach(m => m.remove());

      // Crée le menu contextuel
      const menu = document.createElement('div');
      menu.className = 'context-menu';
      menu.innerHTML = `
        <div class="context-item" data-action="open">📂 Ouvrir le dossier</div>
        <div class="context-item" data-action="add-preview">🖼️ Ajouter une miniature</div>
        <div class="context-item" data-action="delete" style="color:#ff4343;">🗑️ Supprimer ce mod</div>
      `;
      document.body.appendChild(menu);
      menu.style.left = e.pageX + 'px';
      menu.style.top = e.pageY + 'px';

      menu.addEventListener('click', (evt) => {
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
                    showNotification(ok ? "Miniature ajoutée !" : "Erreur lors de l'ajout", !ok);
                    window.loadModsPage();
                  });
                }
              });
            }
            if (result?.mode === "url") {
              window.electronAPI.downloadImageToPreview(result.url, modPath).then(ok => {
                showNotification(ok ? "Miniature téléchargée !" : "Erreur lors du téléchargement", !ok);
                window.loadModsPage();
              });
            }
          });
          menu.remove();
          return;
        }
        // Supprimer le mod (popup confirm)
        if (evt.target.dataset.action === 'delete') {
          Popup.askConfirm("Supprimer définitivement ce mod ?", (yes) => {
            if (yes) {
              window.electronAPI.deleteFolder(modPath);
              showNotification("Mod supprimé !");
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
};
