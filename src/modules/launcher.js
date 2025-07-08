// Module Launcher : Gestion du bouton Launch Stellar Blade

function showNotification(msg, error = false) {
  const notif = document.getElementById('notification');
  notif.textContent = msg;
  notif.className = error ? 'show error' : 'show';
  setTimeout(() => { notif.className = 'hidden'; }, 2000);
}

function initializeLauncher() {
  const launchBtn = document.getElementById('launch-game');
  
  if (!launchBtn) return;

  // Vérifie si le chemin du jeu est configuré au chargement
  updateLaunchButtonState();

  launchBtn.addEventListener('click', async () => {
    const gamePath = localStorage.getItem('game_path');
    
    if (!gamePath) {
      showNotification('⚠️ Chemin du jeu non configuré ! Allez dans Paramètres.', true);
      // Bascule automatiquement vers l'onglet paramètres
      switchToSettingsTab();
      return;
    }

    // Vérifie que le dossier existe
    const gameExePath = `${gamePath}/SB-Win64-Shipping.exe`;
    
    try {
      // Change l'état du bouton en loading
      setLaunchButtonLoading(true);
      
      // Tente de lancer le jeu
      const success = await window.electronAPI.launchGame(gameExePath);
      
      if (success) {
        showNotification('🎮 Stellar Blade lancé avec succès !');
        
        // Animation de succès
        launchBtn.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
        setTimeout(() => {
          launchBtn.style.background = '';
        }, 1000);
        
      } else {
        showNotification('❌ Impossible de lancer le jeu. Vérifiez le chemin dans les paramètres.', true);
      }
      
    } catch (error) {
      console.error('Erreur lors du lancement:', error);
      showNotification('❌ Erreur lors du lancement du jeu.', true);
    } finally {
      setLaunchButtonLoading(false);
    }
  });

  // Écoute les changements de paramètres pour mettre à jour le bouton
  window.addEventListener('storage', updateLaunchButtonState);
  
  // Vérifie périodiquement si les paramètres ont changé
  setInterval(updateLaunchButtonState, 2000);
}

function updateLaunchButtonState() {
  const launchBtn = document.getElementById('launch-game');
  const gamePath = localStorage.getItem('game_path');
  
  if (!launchBtn) return;

  if (!gamePath) {
    launchBtn.disabled = true;
    launchBtn.querySelector('.launch-text').textContent = 'Configurer le jeu';
    launchBtn.title = 'Veuillez configurer le chemin du jeu dans les paramètres';
  } else {
    launchBtn.disabled = false;
    launchBtn.querySelector('.launch-text').textContent = 'Launch Stellar Blade';
    launchBtn.title = `Lancer Stellar Blade depuis: ${gamePath}`;
  }
}

function setLaunchButtonLoading(loading) {
  const launchBtn = document.getElementById('launch-game');
  
  if (loading) {
    launchBtn.classList.add('loading');
    launchBtn.disabled = true;
    launchBtn.querySelector('.launch-text').textContent = 'Lancement';
  } else {
    launchBtn.classList.remove('loading');
    updateLaunchButtonState(); // Restaure l'état normal
  }
}

function switchToSettingsTab() {
  // Simule un clic sur l'onglet paramètres
  document.querySelectorAll('#menu li').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  
  const settingsTab = document.querySelector('#menu li[data-tab="settings"]');
  const settingsContent = document.querySelector('#tab-settings');
  
  if (settingsTab && settingsContent) {
    settingsTab.classList.add('active');
    settingsContent.classList.add('active');
    
    // Charge la page des paramètres si elle existe
    if (window.loadSettingsPage) {
      window.loadSettingsPage();
    }
  }
}

// Initialise le launcher quand le DOM est prêt
document.addEventListener('DOMContentLoaded', initializeLauncher);

// Si le DOM est déjà chargé
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeLauncher);
} else {
  initializeLauncher();
}