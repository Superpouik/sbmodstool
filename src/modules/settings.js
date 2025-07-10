// Module paramètres harmonisé avec sélection de langue

// Configuration des langues disponibles
const availableLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

const confNames = [
  {
    key: 'game_path',
    label: 'game folder (SB-Win64-Shipping.exe)',
    placeholder: 'Select game folder…',
    icon: '🎮'
  },
  {
    key: 'mods_path',
    label: '~mods folder (activated)',
    placeholder: 'select ~mods folder…',
    icon: '✅'
  },
  {
    key: 'disabled_mods_path',
    label: 'Mods disabled folder',
    placeholder: 'Selects the folder for deactivated mods…',
    icon: '❌'
  },
  {
    key: 'downloads_path',
    label: 'Mods download folder',
    placeholder: 'Select where to download mods…',
    icon: '📥'
  }
];

function showNotification(msg, error = false) {
  const notif = document.getElementById('notification');
  if (notif) {
    notif.textContent = msg;
    notif.className = error ? 'show error' : 'show';
    setTimeout(() => { notif.className = 'hidden'; }, 3000);
  }
}

window.loadSettingsPage = function() {
  const container = document.getElementById('settings-content');
  container.innerHTML = '';

  // Header similaire à l'onglet Mods
  const header = document.createElement('div');
  header.className = 'settings-header';
  header.innerHTML = `
    <div class="settings-title">
      <h2>⚙️ Settings</h2>
      <p>Configure your folders, API keys and preferences</p>
    </div>
    <div class="settings-stats">
      <span id="configured-count">0</span> sur <span id="total-count">4</span> dossiers configurés
    </div>
  `;
  container.appendChild(header);

  // Container principal avec sections
  const mainContainer = document.createElement('div');
  mainContainer.className = 'settings-container';

  // ===== SECTION DOSSIERS =====
  const foldersSection = createSection('📁 Folder', 'Setting paths to your game folders and mods');
  const foldersGrid = document.createElement('div');
  foldersGrid.className = 'settings-grid';

  confNames.forEach(conf => {
    const card = createFolderCard(conf);
    foldersGrid.appendChild(card);
  });

  foldersSection.appendChild(foldersGrid);
  mainContainer.appendChild(foldersSection);

  // ===== SECTION API & CONNEXION =====
  const apiSection = createSection('🔗 API & connection', 'enter your nexus API key');
  const apiCard = createApiCard();
  apiSection.appendChild(apiCard);
  mainContainer.appendChild(apiSection);

  // ===== SECTION INTERFACE =====
  const interfaceSection = createSection('🎨 Interface', 'User interface customization');
  const interfaceGrid = document.createElement('div');
  interfaceGrid.className = 'settings-grid';
  
  const languageCard = createLanguageCard();
  interfaceGrid.appendChild(languageCard);
  
  interfaceSection.appendChild(interfaceGrid);
  mainContainer.appendChild(interfaceSection);

  container.appendChild(mainContainer);

  // Met à jour les statistiques
  updateSettingsStats();
};

function createSection(title, description) {
  const section = document.createElement('div');
  section.className = 'settings-section';
  section.innerHTML = `
    <div class="section-header">
      <h3>${title}</h3>
      <p>${description}</p>
    </div>
  `;
  return section;
}

function createFolderCard(conf) {
  const card = document.createElement('div');
  card.className = 'settings-card folder-card';
  
  const currentPath = localStorage.getItem(conf.key) || '';
  const isConfigured = currentPath.length > 0;
  
  card.innerHTML = `
    <div class="card-header">
      <div class="card-icon">${conf.icon}</div>
      <div class="card-title">${conf.label}</div>
      <div class="card-status ${isConfigured ? 'configured' : 'not-configured'}">
        ${isConfigured ? '✅' : '⚠️'}
      </div>
    </div>
    
    <div class="card-content">
      <div class="path-display" title="${currentPath}">
        ${currentPath || conf.placeholder}
      </div>
    </div>
    
    <div class="card-actions">
      <button class="browse-btn" data-key="${conf.key}">
        📂 Parcourir
      </button>
      ${isConfigured ? `<button class="clear-btn" data-key="${conf.key}">🗑️ delete</button>` : ''}
    </div>
  `;

  // Applique l'espacement correct pour les icônes
  setTimeout(() => {
    // Carte principale - plus d'espace autour
    card.style.padding = '32px';
    
    // Header - espacement harmonisé
    const header = card.querySelector('.card-header');
    if (header) {
      header.style.padding = '0 0 16px 0';
      header.style.margin = '0';
    }
    
    // Icône - taille et espacement optimisés
    const icon = card.querySelector('.card-icon');
    if (icon) {
      icon.style.margin = '0';
      icon.style.width = '50px';
      icon.style.height = '50px';
      icon.style.flexShrink = '0';
    }
    
    // Contenu - espacement interne
    const content = card.querySelector('.card-content');
    if (content) {
      content.style.padding = '0';
      content.style.margin = '16px 0';
    }
    
    // Actions - espacement vers le bas
    const actions = card.querySelector('.card-actions');
    if (actions) {
      actions.style.padding = '0';
      actions.style.marginTop = '16px';
    }
  }, 100);

  // Event listeners
  const browseBtn = card.querySelector('.browse-btn');
  browseBtn.addEventListener('click', async () => {
    const path = await window.electronAPI.selectDirectory();
    if (path) {
      localStorage.setItem(conf.key, path);
      showNotification(`✅ folder ${conf.label.toLowerCase()} configured !`);
      window.loadSettingsPage(); // Refresh
    }
  });

  const clearBtn = card.querySelector('.clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      localStorage.removeItem(conf.key);
      showNotification(`🗑️ folder ${conf.label.toLowerCase()} delete`);
      window.loadSettingsPage(); // Refresh
    });
  }

  return card;
}

function createApiCard() {
  const card = document.createElement('div');
  card.className = 'settings-card api-card';
  
  const currentKey = localStorage.getItem('nexus_api_key') || '';
  const isConfigured = currentKey.length > 0;
  
  card.innerHTML = `
    <div class="card-header">
      <div class="card-icon">🔑</div>
      <div class="card-title">Clé API Nexus Mods</div>
      <div class="card-status ${isConfigured ? 'configured' : 'not-configured'}">
        ${isConfigured ? '✅' : '⚠️'}
      </div>
    </div>
    
    <div class="card-content">
      <div class="api-input-container">
        <input type="password" id="nexus-api-key" 
               value="${currentKey}" 
               placeholder="Paste your Nexus Mods API key here..."
               autocomplete="off">
        <button class="toggle-visibility" type="button">👁️</button>
      </div>
      <div class="api-help">
        💡 <a href="https://www.nexusmods.com/users/myaccount?tab=api" target="_blank">
          Obtenir votre clé API Nexus Mods
        </a>
      </div>
    </div>
    
    <div class="card-actions">
      <button class="save-btn" id="save-api-btn">💾 Save</button>
      ${isConfigured ? '<button class="clear-btn" id="clear-api-btn">🗑️ Effacer</button>' : ''}
    </div>
  `;

  // Applique l'espacement correct pour les icônes
  setTimeout(() => {
    // Carte principale - plus d'espace autour
    card.style.padding = '32px';
    
    // Header - espacement harmonisé
    const header = card.querySelector('.card-header');
    if (header) {
      header.style.padding = '0 0 16px 0';
      header.style.margin = '0';
    }
    
    // Icône - taille et espacement optimisés
    const icon = card.querySelector('.card-icon');
    if (icon) {
      icon.style.margin = '0';
      icon.style.width = '50px';
      icon.style.height = '50px';
      icon.style.flexShrink = '0';
    }
    
    // Contenu - espacement interne
    const content = card.querySelector('.card-content');
    if (content) {
      content.style.padding = '0';
      content.style.margin = '16px 0';
    }
    
    // Actions - espacement vers le bas
    const actions = card.querySelector('.card-actions');
    if (actions) {
      actions.style.padding = '0';
      actions.style.marginTop = '16px';
    }
  }, 100);

  // Event listeners
  const input = card.querySelector('#nexus-api-key');
  const toggleBtn = card.querySelector('.toggle-visibility');
  const saveBtn = card.querySelector('#save-api-btn');
  const clearBtn = card.querySelector('#clear-api-btn');

  // Toggle visibility
  toggleBtn.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    toggleBtn.textContent = isPassword ? '🙈' : '👁️';
  });

  // Save API key
  saveBtn.addEventListener('click', () => {
    const key = input.value.trim();
    if (key) {
      localStorage.setItem('nexus_api_key', key);
      showNotification('🔑 Nexus API key saved !');
      window.loadSettingsPage(); // Refresh
    } else {
      showNotification('⚠️ Please enter a valid API key', true);
    }
  });

  // Clear API key
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      localStorage.removeItem('nexus_api_key');
      showNotification('🗑️ Clé API Nexus effacée');
      window.loadSettingsPage(); // Refresh
    });
  }

  // Save on Enter
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveBtn.click();
    }
  });

  return card;
}

function createLanguageCard() {
  const card = document.createElement('div');
  card.className = 'settings-card language-card';
  
  const currentLang = localStorage.getItem('app_language') || 'en';
  const selectedLang = availableLanguages.find(lang => lang.code === currentLang) || availableLanguages[0];
  
  card.innerHTML = `
    <div class="card-header">
      <div class="card-icon">🌍</div>
      <div class="card-title">Interface language</div>
      <div class="card-status configured">
        ${selectedLang.flag}
      </div>
    </div>
    
    <div class="card-content">
      <div class="language-selector">
        <select id="language-select">
          ${availableLanguages.map(lang => 
            `<option value="${lang.code}" ${lang.code === currentLang ? 'selected' : ''}>
              ${lang.flag} ${lang.name}
            </option>`
          ).join('')}
        </select>
      </div>
      <div class="language-info">
        💡 The selected language will be applied the next time the application is restarted.
      </div>
    </div>
    
    <div class="card-actions">
      <button class="apply-btn" id="apply-language-btn">🔄 Appliquer</button>
      <button class="restart-btn" id="restart-app-btn">🚀 restart</button>
    </div>
  `;

  // Applique l'espacement correct pour les icônes
  setTimeout(() => {
    // Carte principale - plus d'espace autour
    card.style.padding = '32px';
    
    // Header - espacement harmonisé
    const header = card.querySelector('.card-header');
    if (header) {
      header.style.padding = '0 0 16px 0';
      header.style.margin = '0';
    }
    
    // Icône - taille et espacement optimisés
    const icon = card.querySelector('.card-icon');
    if (icon) {
      icon.style.margin = '0';
      icon.style.width = '50px';
      icon.style.height = '50px';
      icon.style.flexShrink = '0';
    }
    
    // Contenu - espacement interne
    const content = card.querySelector('.card-content');
    if (content) {
      content.style.padding = '0';
      content.style.margin = '16px 0';
    }
    
    // Actions - espacement vers le bas
    const actions = card.querySelector('.card-actions');
    if (actions) {
      actions.style.padding = '0';
      actions.style.marginTop = '16px';
    }
  }, 100);

  // Event listeners
  const select = card.querySelector('#language-select');
  const applyBtn = card.querySelector('#apply-language-btn');
  const restartBtn = card.querySelector('#restart-app-btn');

  select.addEventListener('change', () => {
    const newLang = select.value;
    if (newLang !== currentLang) {
      applyBtn.className = 'apply-btn warning';
      applyBtn.textContent = '⚠️ apply changes';
    } else {
      applyBtn.className = 'apply-btn';
      applyBtn.textContent = '🔄 Apply';
    }
  });

  applyBtn.addEventListener('click', () => {
    const newLang = select.value;
    const selectedLangObj = availableLanguages.find(lang => lang.code === newLang);
    
    localStorage.setItem('app_language', newLang);
    showNotification(`🌍 Langue changée vers ${selectedLangObj.name} !`);
    
    // Affiche le bouton redémarrer
    restartBtn.className = 'restart-btn visible';
    applyBtn.textContent = '✅ Applyed';
    applyBtn.disabled = true;
    
    // Cache le message d'info et affiche un nouveau
    const infoDiv = card.querySelector('.language-info');
    infoDiv.innerHTML = '🔄 <strong>Restart the application to see the changes</strong>';
    infoDiv.className = 'language-info warning';
  });

  restartBtn.addEventListener('click', () => {
    // Note: Dans un vrai environnement Electron, on pourrait utiliser app.relaunch()
    showNotification('🚀 Restart functionality to be implemented');
    // Pour l'instant, on propose juste de recharger
    if (confirm('Do you want to reload the application now ?')) {
      window.location.reload();
    }
  });

  return card;
}

function updateSettingsStats() {
  const configuredCount = confNames.filter(conf => 
    localStorage.getItem(conf.key)
  ).length;
  
  const configuredSpan = document.getElementById('configured-count');
  const totalSpan = document.getElementById('total-count');
  
  if (configuredSpan) configuredSpan.textContent = configuredCount;
  if (totalSpan) totalSpan.textContent = confNames.length;
}

// Charge direct si onglet settings actif
if(document.querySelector('#tab-settings')?.classList.contains('active')) {
  window.loadSettingsPage();
}