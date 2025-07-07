// nexus.js - Version STABLE avec gestion propre du polling

window.loadNexusWebview = function(modid) {
  const nexusDiv = document.getElementById('nexus-content');
  nexusDiv.innerHTML = '';
  
  const webview = document.createElement('webview');
  webview.src = modid ? `https://www.nexusmods.com/stellarblade/mods/${modid}` : 'https://www.nexusmods.com/stellarblade/mods/';
  webview.style.width = '100%';
  webview.style.height = '700px';
  webview.setAttribute('allowpopups', '');
  webview.setAttribute('webpreferences', 'nodeIntegration=no,contextIsolation=yes');
  webview.id = 'nexus-webview';
  
  // Variable pour gérer le polling
  let nexusPollingInterval = null;
  
  webview.addEventListener('dom-ready', () => {
    console.log('🌐 Nexus webview DOM ready, configuration stable...');
    
    const script = `
      (function() {
        console.log('🖼️ Script stable Nexus démarré');
        
        window.lastRightClickedImage = null;
        window.lastRightClickTime = 0;
        
        if (window.nexusImageHandler) {
          document.removeEventListener('contextmenu', window.nexusImageHandler, true);
        }
        
        window.nexusImageHandler = function(e) {
          let targetImage = null;
          
          if (e.target.tagName === 'IMG') {
            targetImage = e.target;
          } else {
            targetImage = e.target.querySelector('img') || 
                         e.target.closest('figure, div, a, span')?.querySelector('img');
          }
          
          if (targetImage && targetImage.src && 
              targetImage.src.startsWith('http') && 
              (targetImage.src.includes('nexusmods.com') || 
               targetImage.src.includes('staticdelivery.nexusmods.com') ||
               targetImage.src.includes('.jpg') || 
               targetImage.src.includes('.png') || 
               targetImage.src.includes('.webp'))) {
            
            console.log('🖼️ CLIC DROIT détecté sur:', targetImage.src);
            
            window.lastRightClickedImage = {
              imageUrl: targetImage.src,
              pageUrl: window.location.href,
              imageAlt: targetImage.alt || '',
              imageTitle: targetImage.title || '',
              source: 'nexus',
              modId: window.location.pathname.split('/').pop() || 'unknown',
              timestamp: Date.now()
            };
            
            window.lastRightClickTime = Date.now();
            console.log('💾 Données stockées');
            return true;
          }
        };
        
        document.addEventListener('contextmenu', window.nexusImageHandler, true);
        
        window.getRecentImageData = function() {
          if (window.lastRightClickedImage && 
              (Date.now() - window.lastRightClickTime) < 2000) {
            const data = window.lastRightClickedImage;
            window.lastRightClickedImage = null;
            return data;
          }
          return null;
        };
        
        console.log('✅ Handler stable Nexus configuré');
        
      })();
    `;
    
    webview.executeJavaScript(script)
      .then(() => {
        console.log('✅ Script stable injecté');
        startStableImageDetection(webview);
      })
      .catch(err => console.error('❌ Erreur injection:', err));
  });

  // Nettoyage à la destruction de la webview
  webview.addEventListener('destroyed', () => {
    if (nexusPollingInterval) {
      clearInterval(nexusPollingInterval);
      nexusPollingInterval = null;
      console.log('🧹 Polling Nexus nettoyé');
    }
  });

  nexusDiv.appendChild(webview);
  console.log('✅ Nexus webview stable créée');

  // Fonction de surveillance stable
  function startStableImageDetection(webview) {
    console.log('🔧 Démarrage surveillance stable Nexus');
    
    // Nettoie l'ancien polling s'il existe
    if (nexusPollingInterval) {
      clearInterval(nexusPollingInterval);
    }
    
    // Event contextmenu simple
    webview.addEventListener('contextmenu', (e) => {
      console.log('📱 Event contextmenu Nexus');
      setTimeout(() => checkForImageData(webview), 50);
    });
    
    // Polling avec gestion d'erreurs robuste
    nexusPollingInterval = setInterval(() => {
      // Vérifie si l'onglet Nexus est actif
      const nexusTab = document.querySelector('#tab-nexus');
      if (!nexusTab || !nexusTab.classList.contains('active')) {
        return; // Ne fait rien si pas sur l'onglet Nexus
      }
      
      // Vérifie si la webview existe encore
      if (!webview || !webview.executeJavaScript) {
        console.log('⚠️ Webview non disponible, arrêt du polling');
        if (nexusPollingInterval) {
          clearInterval(nexusPollingInterval);
          nexusPollingInterval = null;
        }
        return;
      }
      
      // Appel sécurisé avec gestion d'erreur
      webview.executeJavaScript('window.getRecentImageData && window.getRecentImageData()')
        .then(imageData => {
          if (imageData && imageData.imageUrl) {
            console.log('🎯 Image détectée via polling:', imageData.imageUrl);
            
            // Arrête temporairement le polling pour éviter les doublons
            if (nexusPollingInterval) {
              clearInterval(nexusPollingInterval);
              nexusPollingInterval = null;
            }
            
            // Affiche le menu
            showImageContextMenu(imageData);
            
            // Redémarre le polling après 1 seconde
            setTimeout(() => {
              if (document.querySelector('#tab-nexus')?.classList.contains('active')) {
                startStableImageDetection(webview);
              }
            }, 1000);
          }
        })
        .catch(err => {
          // Ignore silencieusement les erreurs de polling pour éviter le spam
          // console.log('Polling error (normal):', err.message);
        });
    }, 200);
    
    console.log('👂 Surveillance stable Nexus active');
  }

  // Fonction pour vérifier les données
  function checkForImageData(webview) {
    if (!webview || !webview.executeJavaScript) return;
    
    webview.executeJavaScript('window.getRecentImageData && window.getRecentImageData()')
      .then(imageData => {
        if (imageData) {
          console.log('📨 Données récupérées:', imageData.imageUrl);
          showImageContextMenu(imageData);
        }
      })
      .catch(err => {}); // Ignore les erreurs
  }

  // Fonction pour afficher le menu
  function showImageContextMenu(imageData) {
    console.log('🖼️ Affichage menu pour:', imageData.imageUrl);
    
    if (window.electronAPI && window.electronAPI.showImageContextMenu) {
      window.electronAPI.showImageContextMenu(imageData);
    } else if (window.ImageContextManager) {
      window.ImageContextManager.showImageContextMenu(imageData);
    } else {
      console.error('❌ Aucune méthode de menu disponible');
    }
  }
};

// Nettoie le polling global si on change d'onglet
document.addEventListener('DOMContentLoaded', () => {
  const nexusTab = document.querySelector('#menu li[data-tab="nexus"]');
  if (nexusTab) {
    nexusTab.addEventListener('click', () => {
      // Redémarre la webview proprement
      setTimeout(() => {
        if (window.loadNexusWebview) {
          console.log('🔄 Rechargement Nexus webview');
        }
      }, 100);
    });
  }
});