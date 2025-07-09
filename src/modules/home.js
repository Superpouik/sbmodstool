// Module Home : Affiche les derniers mods Nexus pour Stellar Blade (API), harmonisé avec le style moderne

window.loadHomeWebview = async function() {
  const homeDiv = document.getElementById('home-webview');
  
  // Header harmonisé avec Settings/Mods
  const header = document.createElement('div');
  header.className = 'home-header';
  header.innerHTML = `
    <div class="home-title">
      <h2 style="margin: 0; color: #82eefd;">🏡 Accueil – Derniers Mods Nexus</h2>
      <p style="color: #888; margin: 5px 0 0 0;">Découvrez les derniers mods ajoutés sur Nexus Mods</p>
    </div>
    <div class="home-stats" id="home-stats" style="opacity: 0;">
      <span id="mods-count">0</span> mods récents disponibles
    </div>
  `;

  // Loading state moderne
  homeDiv.innerHTML = '';
  homeDiv.appendChild(header);
  
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'home-loading';
  loadingDiv.innerHTML = `
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <div class="loading-text">Chargement des derniers mods…</div>
    </div>
  `;
  homeDiv.appendChild(loadingDiv);

  const apiKey = localStorage.getItem('nexus_api_key') || '';
  if (!apiKey) {
    showApiKeyError(homeDiv, header);
    return;
  }

  try {
    const resp = await fetch('https://api.nexusmods.com/v1/games/stellarblade/mods/latest_added.json', {
      headers: {
        'apikey': apiKey,
        'Application-Name': 'stellarblade-mod-manager',
        'Accept': 'application/json'
      }
    });
    
    if (!resp.ok) throw new Error('Erreur API : ' + resp.status);
    const mods = await resp.json();

    if (!mods || !Array.isArray(mods) || !mods.length) {
      showNoModsError(homeDiv, header);
      return;
    }

    // Supprime le loading
    loadingDiv.remove();
    
    // Met à jour les stats
    updateHomeStats(mods.length);
    
    // Crée la section principale
    const mainSection = createHomeSection('🆕 Derniers ajouts', 'Les mods les plus récemment ajoutés à la base de données Nexus');
    const modsGrid = createModsGrid(mods);
    
    mainSection.appendChild(modsGrid);
    homeDiv.appendChild(mainSection);

    // Active les boutons de téléchargement
    setupDownloadButtons(homeDiv);

  } catch(e) {
    showFetchError(homeDiv, header, e.message);
  }
};

// Fonctions utilitaires harmonisées

function showApiKeyError(container, header) {
  container.innerHTML = '';
  container.appendChild(header);
  
  const errorSection = document.createElement('div');
  errorSection.className = 'home-error-section';
  errorSection.innerHTML = `
    <div class="error-content">
      <div class="error-icon">🔑</div>
      <div class="error-title">Clé API Nexus manquante</div>
      <div class="error-message">Pour afficher les derniers mods, vous devez configurer votre clé API Nexus Mods.</div>
      <button class="error-action-btn" onclick="goToSettings()">
        ⚙️ Aller aux Paramètres
      </button>
    </div>
  `;
  container.appendChild(errorSection);
}

function showNoModsError(container, header) {
  container.innerHTML = '';
  container.appendChild(header);
  
  const errorSection = document.createElement('div');
  errorSection.className = 'home-error-section';
  errorSection.innerHTML = `
    <div class="error-content">
      <div class="error-icon">😢</div>
      <div class="error-title">Aucun mod trouvé</div>
      <div class="error-message">Impossible de récupérer les mods depuis l'API Nexus.</div>
      <button class="error-action-btn" onclick="window.loadHomeWebview()">
        🔄 Réessayer
      </button>
    </div>
  `;
  container.appendChild(errorSection);
}

function showFetchError(container, header, errorMsg) {
  container.innerHTML = '';
  container.appendChild(header);
  
  const errorSection = document.createElement('div');
  errorSection.className = 'home-error-section';
  errorSection.innerHTML = `
    <div class="error-content">
      <div class="error-icon">❌</div>
      <div class="error-title">Erreur de connexion</div>
      <div class="error-message">Erreur lors de la récupération des mods :<br><code>${errorMsg}</code></div>
      <button class="error-action-btn" onclick="window.loadHomeWebview()">
        🔄 Réessayer
      </button>
    </div>
  `;
  container.appendChild(errorSection);
}

function updateHomeStats(modsCount) {
  const statsElement = document.getElementById('home-stats');
  const countElement = document.getElementById('mods-count');
  
  if (countElement) countElement.textContent = modsCount;
  if (statsElement) {
    statsElement.style.opacity = '1';
    statsElement.style.transform = 'translateY(0)';
  }
}

function createHomeSection(title, description) {
  const section = document.createElement('div');
  section.className = 'home-section';
  section.innerHTML = `
    <div class="section-header">
      <h3>${title}</h3>
      <p>${description}</p>
    </div>
  `;
  return section;
}

function createModsGrid(mods) {
  const grid = document.createElement('div');
  grid.className = 'home-mods-grid';
  
  mods.forEach((mod, index) => {
    const card = createModCard(mod, index);
    grid.appendChild(card);
  });
  
  return grid;
}

function createModCard(mod, index) {
  const card = document.createElement('div');
  card.className = 'home-mod-card';
  card.style.animationDelay = `${index * 0.1}s`;
  
  // Formatage des téléchargements
  const downloads = formatDownloads(mod.downloads || 0);
  
  card.innerHTML = `
    <div class="mod-image-container">
      <img src="${mod.picture_url || 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg'}" 
           alt="${mod.name}" 
           onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg';">
      <div class="mod-stats-overlay">
        <span class="download-count">💾 ${downloads}</span>
      </div>
    </div>
    
    <div class="mod-info">
      <div class="mod-name" title="${mod.name}" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3; height: 1.3em;">${mod.name}</div>
    </div>
    
    <div class="mod-actions">
      <button class="mod-download-btn" data-modid="${mod.mod_id}">
        <span class="btn-icon">⬇️</span>
        <span class="btn-text">Télécharger</span>
      </button>
    </div>
  `;
  
  return card;
}

function formatDownloads(count) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}

function setupDownloadButtons(container) {
  container.querySelectorAll('.mod-download-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const modid = btn.getAttribute('data-modid');
      
      // Animation du bouton
      btn.classList.add('downloading');
      btn.innerHTML = `
        <span class="btn-icon spinning">⏳</span>
        <span class="btn-text">Ouverture...</span>
      `;
      
      // Mémorise pour le switch d'onglet
      window.lastNexusModId = modid;
      
      setTimeout(() => {
        // Change d'onglet vers Nexus
        document.querySelectorAll('#menu li').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector('#menu li[data-tab="nexus"]').classList.add('active');
        document.querySelector('#tab-nexus').classList.add('active');
        
        // Charge le mod directement dans le webview Nexus
        if(window.loadNexusWebview) window.loadNexusWebview(modid);
      }, 800);
    });
  });
}

// Fonction pour aller aux paramètres
window.goToSettings = function() {
  document.querySelectorAll('#menu li').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.querySelector('#menu li[data-tab="settings"]').classList.add('active');
  document.querySelector('#tab-settings').classList.add('active');
  
  if (window.loadSettingsPage) {
    window.loadSettingsPage();
  }
};

// Auto-charge si onglet home actif au démarrage
if(document.querySelector('#tab-home')?.classList.contains('active')) {
  window.loadHomeWebview();
};