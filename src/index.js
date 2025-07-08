document.querySelectorAll('#menu li').forEach(li => {
  li.addEventListener('click', () => {
    document.querySelectorAll('#menu li').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    li.classList.add('active');
    document.querySelector(`#tab-${li.dataset.tab}`).classList.add('active');
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

// Sélection du bouton Nexus dans la sidebar
const nexusBtn = document.querySelector('#menu li[data-tab="nexus"]');

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

// 🆕 LISTENER POUR SÉLECTEUR DE VARIANTES DE MODS
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

// Initialisation des listeners au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎭 Initialisation listener variantes...');
  
  // Écoute les demandes de sélection de variantes
  if (window.electronAPI && window.electronAPI.onVariantSelectorRequest) {
    window.electronAPI.onVariantSelectorRequest((event, data) => {
      console.log('🎯 Sélecteur de variantes demandé:', data);
      
      if (window.Popup && window.Popup.askModVariant) {
        window.Popup.askModVariant(data.modPath, data.variants, (result) => {
          console.log('📊 Résultat sélection variante:', result);
          
          if (result.success) {
            console.log('✅ Variante installée avec succès');
            
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
        console.error('❌ Popup.askModVariant non disponible');
        showNotification('❌ Erreur: Interface de sélection non disponible', true);
      }
    });
  } else {
    // Alternative : utiliser ipcRenderer directement si disponible
    if (typeof require !== 'undefined') {
      try {
        const { ipcRenderer } = require('electron');
        ipcRenderer.on('show-variant-selector', (event, data) => {
          console.log('🎯 Sélecteur variantes via ipcRenderer:', data);
          
          if (window.Popup && window.Popup.askModVariant) {
            window.Popup.askModVariant(data.modPath, data.variants, (result) => {
              console.log('📊 Résultat sélection variante (ipc):', result);
              
              if (result.success) {
                console.log('✅ Variante installée avec succès');
                
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
          }
        });
        console.log('✅ Listener variantes ipcRenderer configuré');
      } catch (error) {
        console.error('❌ Erreur configuration ipcRenderer pour variantes:', error);
      }
    }
  }
  
  console.log('✅ Listeners variantes initialisés');
});

// Si le DOM est déjà chargé
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready - initialization des listeners variantes');
  });
} else {
  console.log('DOM déjà chargé - listeners variantes prêts');
}