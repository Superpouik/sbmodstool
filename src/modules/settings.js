// Module paramètres harmonisé avec sélection de langue et chiffrement sécurisé

// Configuration des langues disponibles
const availableLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

const confNames = [
  {
    key: 'game_path',
    label: 'Dossier du jeu (SB-Win64-Shipping.exe)',
    placeholder: 'Sélectionne le dossier du jeu…',
    icon: '🎮'
  },
  {
    key: 'mods_path',
    label: 'Dossier ~mods (activés)',
    placeholder: 'Sélectionne le dossier ~mods…',
    icon: '✅'
  },
  {
    key: 'disabled_mods_path',
    label: 'Dossier Mods désactivés',
    placeholder: 'Sélectionne le dossier des mods désactivés…',
    icon: '❌'
  },
  {
    key: 'downloads_path',
    label: 'Dossier de téléchargement des mods',
    placeholder: 'Sélectionne où télécharger les mods…',
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

// 🆕 GESTION SÉCURISÉE DE LA CLÉ API
const ApiKeyManager = {
  // Variable pour stocker temporairement la clé déchiffrée
  currentApiKey: null,
  
  // Charge la clé API de manière sécurisée
  async loadApiKey() {
    try {
      console.log('🔐 Chargement sécurisé de la clé API...');
      
      const result = await window.electronAPI.decryptAndGetApiKey();
      
      if (result.success && result.apiKey) {
        this.currentApiKey = result.apiKey;
        console.log('✅ Clé API chargée avec succès');
        
        // Si la clé était en texte brut, on la migre vers le chiffrement
        if (!result.encrypted && result.needsMigration) {
          console.log('🔄 Migration de la clé vers le chiffrement...');
          await this.saveApiKey(result.apiKey);
        }
        
        return result.apiKey;
      } else {
        this.currentApiKey = null;
        return null;
      }
    } catch (error) {
      console.error('❌ Erreur chargement clé API:', error);
      this.currentApiKey = null;
      return null;
    }
  },
  
  // Sauvegarde la clé API de manière sécurisée
  async saveApiKey(apiKey) {
    try {
      console.log('🔐 Sauvegarde sécurisée de la clé API...');
      
      const result = await window.electronAPI.encryptAndSaveApiKey(apiKey);
      
      if (result.success) {
        this.currentApiKey = apiKey;
        console.log('✅ Clé API sauvegardée avec succès');
        
        if (result.encrypted) {
          console.log('🔒 Clé API chiffrée avec safeStorage');
        } else if (result.fallback) {
          console.warn('⚠️ Clé API sauvegardée en fallback (localStorage)');
        }
        
        return true;
      } else {
        console.error('❌ Erreur sauvegarde clé API:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde clé API:', error);
      return false;
    }
  },
  
  // Supprime la clé API de manière sécurisée
  async deleteApiKey() {
    try {
      console.log('🗑️ Suppression sécurisée de la clé API...');
      
      const result = await window.electronAPI.deleteApiKey();
      
      if (result.success) {
        this.currentApiKey = null;
        console.log('✅ Clé API supprimée avec succès');
        return true;
      } else {
        console.error('❌ Erreur suppression clé API:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur suppression clé API:', error);
      return false;
    }
  },
  
  // Récupère la clé API actuelle (en cache)
  getCurrentApiKey() {
    return this.currentApiKey;
  },
  
  // Vérifie si une clé API est configurée
  hasApiKey() {
    return this.currentApiKey && this.currentApiKey.length > 0;
  }
};

window.loadSettingsPage = async function() {
  const container = document.getElementById('settings-content');
  container.innerHTML = '';

  // Header similaire à l'onglet Mods
  const header = document.createElement('div');
  header.className = 'settings-header';
  header.innerHTML = `
    <div class="settings-title">
      <h2 style="margin: 0; color: #82eefd;">⚙️ Configuration</h2>
      <p style="color: #888; margin: 5px 0 0 0;">Configurez vos dossiers, clés API et préférences</p>
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
  const foldersSection = createSection('📁 Dossiers', 'Configuration des chemins vers vos dossiers de jeu et mods');
  const foldersGrid = document.createElement('div');
  foldersGrid.className = 'settings-grid';

  confNames.forEach(conf => {
    const card = createFolderCard(conf);
    foldersGrid.appendChild(card);
  });

  foldersSection.appendChild(foldersGrid);
  mainContainer.appendChild(foldersSection);

  // ===== SECTION API & CONNEXION =====
  const apiSection = createSection('🔗 API & Connexion', 'Configuration des clés API pour les services externes');
  const apiCard = await createApiCard(); // 🆕 Async pour charger la clé chiffrée
  apiSection.appendChild(apiCard);
  mainContainer.appendChild(apiSection);

  // ===== SECTION INTERFACE =====
  const interfaceSection = createSection('🎨 Interface', 'Personnalisation de l\'interface utilisateur');
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
        📂 Parcourir…
      </button>
      ${isConfigured ? `<button class="clear-btn" data-key="${conf.key}">🗑️ Effacer</button>` : ''}
    </div>
  `;

  // Event listeners
  const browseBtn = card.querySelector('.browse-btn');
  browseBtn.addEventListener('click', async () => {
    const path = await window.electronAPI.selectDirectory();
    if (path) {
      localStorage.setItem(conf.key, path);
      showNotification(`✅ Dossier ${conf.label.toLowerCase()} configuré !`);
      window.loadSettingsPage(); // Refresh
    }
  });

  const clearBtn = card.querySelector('.clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      localStorage.removeItem(conf.key);
      showNotification(`🗑️ Dossier ${conf.label.toLowerCase()} effacé`);
      window.loadSettingsPage(); // Refresh
    });
  }

  return card;
}

// 🆕 CARTE API AVEC CHIFFREMENT SÉCURISÉ
async function createApiCard() {
  const card = document.createElement('div');
  card.className = 'settings-card api-card';
  
  // Charge la clé API de manière sécurisée
  const currentKey = await ApiKeyManager.loadApiKey() || '';
  const isConfigured = currentKey.length > 0;
  
  // Vérifie si le chiffrement sécurisé est disponible
  const isSecureStorageAvailable = await window.electronAPI.isSafeStorageAvailable();
  
  card.innerHTML = `
    <div class="card-header">
      <div class="card-icon">🔑</div>
      <div class="card-title">
        Clé API Nexus Mods
        ${isSecureStorageAvailable ? 
          '<div style="font-size: 0.7em; color: #28d47b; margin-top: 2px;">🔒 Chiffrement sécurisé</div>' : 
          '<div style="font-size: 0.7em; color: #ff9f43; margin-top: 2px;">⚠️ Stockage non chiffré</div>'
        }
      </div>
      <div class="card-status ${isConfigured ? 'configured' : 'not-configured'}">
        ${isConfigured ? '✅' : '⚠️'}
      </div>
    </div>
    
    <div class="card-content">
      <div class="api-input-container">
        <input type="password" id="nexus-api-key" 
               value="${currentKey}" 
               placeholder="Collez votre clé API Nexus Mods ici..."
               autocomplete="off">
        <button class="toggle-visibility" type="button">👁️</button>
      </div>
      
      ${!isSecureStorageAvailable ? `
        <div class="security-warning">
          ⚠️ <strong>Attention :</strong> Le chiffrement sécurisé n'est pas disponible sur ce système. 
          La clé sera stockée en texte brut dans localStorage.
        </div>
      ` : ''}
      
      <div class="api-help">
        💡 <a href="https://www.nexusmods.com/users/myaccount?tab=api" target="_blank">
          Obtenir votre clé API Nexus Mods
        </a>
      </div>
    </div>
    
    <div class="card-actions">
      <button class="save-btn" id="save-api-btn">💾 Sauvegarder</button>
      ${isConfigured ? '<button class="clear-btn" id="clear-api-btn">🗑️ Effacer</button>' : ''}
    </div>
  `;

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

  // Save API key avec chiffrement sécurisé
  saveBtn.addEventListener('click', async () => {
    const key = input.value.trim();
    if (key) {
      // Désactive le bouton pendant la sauvegarde
      saveBtn.disabled = true;
      saveBtn.textContent = '🔄 Sauvegarde...';
      
      try {
        const success = await ApiKeyManager.saveApiKey(key);
        
        if (success) {
          showNotification('🔑 Clé API Nexus sauvegardée avec chiffrement sécurisé !');
          setTimeout(() => window.loadSettingsPage(), 1000); // Refresh après succès
        } else {
          showNotification('❌ Erreur lors de la sauvegarde de la clé API', true);
        }
      } catch (error) {
        console.error('❌ Erreur sauvegarde clé API:', error);
        showNotification('❌ Erreur lors de la sauvegarde de la clé API', true);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Sauvegarder';
      }
    } else {
      showNotification('⚠️ Veuillez saisir une clé API valide', true);
    }
  });

  // Clear API key avec suppression sécurisée
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      // Désactive le bouton pendant la suppression
      clearBtn.disabled = true;
      clearBtn.textContent = '🔄 Suppression...';
      
      try {
        const success = await ApiKeyManager.deleteApiKey();
        
        if (success) {
          showNotification('🗑️ Clé API Nexus supprimée de manière sécurisée');
          setTimeout(() => window.loadSettingsPage(), 1000); // Refresh après succès
        } else {
          showNotification('❌ Erreur lors de la suppression de la clé API', true);
        }
      } catch (error) {
        console.error('❌ Erreur suppression clé API:', error);
        showNotification('❌ Erreur lors de la suppression de la clé API', true);
      } finally {
        clearBtn.disabled = false;
        clearBtn.textContent = '🗑️ Effacer';
      }
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
      <div class="card-title">Langue de l'interface</div>
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
        💡 La langue sélectionnée sera appliquée au prochain redémarrage de l'application
      </div>
    </div>
    
    <div class="card-actions">
      <button class="apply-btn" id="apply-language-btn">🔄 Appliquer</button>
      <button class="restart-btn" id="restart-app-btn" style="display: none;">🚀 Redémarrer</button>
    </div>
  `;

  // Event listeners
  const select = card.querySelector('#language-select');
  const applyBtn = card.querySelector('#apply-language-btn');
  const restartBtn = card.querySelector('#restart-app-btn');

  select.addEventListener('change', () => {
    const newLang = select.value;
    if (newLang !== currentLang) {
      applyBtn.style.background = '#ff6b35';
      applyBtn.textContent = '⚠️ Appliquer changement';
    } else {
      applyBtn.style.background = '';
      applyBtn.textContent = '🔄 Appliquer';
    }
  });

  applyBtn.addEventListener('click', () => {
    const newLang = select.value;
    const selectedLangObj = availableLanguages.find(lang => lang.code === newLang);
    
    localStorage.setItem('app_language', newLang);
    showNotification(`🌍 Langue changée vers ${selectedLangObj.name} !`);
    
    // Affiche le bouton redémarrer
    restartBtn.style.display = 'inline-block';
    applyBtn.textContent = '✅ Appliqué';
    applyBtn.disabled = true;
    
    // Cache le message d'info et affiche un nouveau
    const infoDiv = card.querySelector('.language-info');
    infoDiv.innerHTML = '🔄 <strong>Redémarrez l\'application pour voir les changements</strong>';
    infoDiv.style.color = '#ff6b35';
  });

  restartBtn.addEventListener('click', () => {
    // Note: Dans un vrai environnement Electron, on pourrait utiliser app.relaunch()
    showNotification('🚀 Fonctionnalité de redémarrage à implémenter');
    // Pour l'instant, on propose juste de recharger
    if (confirm('Voulez-vous recharger l\'application maintenant ?')) {
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

// 🆕 EXPOSE LE GESTIONNAIRE D'API GLOBALEMENT
window.ApiKeyManager = ApiKeyManager;

// Charge direct si onglet settings actif
if(document.querySelector('#tab-settings')?.classList.contains('active')) {
  window.loadSettingsPage();
}
