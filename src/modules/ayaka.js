// ayaka.js - Version STABLE avec gestion propre du polling

window.loadAyakaWebview = function() {
  const ayakaDiv = document.getElementById('ayaka-webview');
  ayakaDiv.innerHTML = '';
  
  const webview = document.createElement('webview');
  webview.src = 'https://ayakamods.cc/games/stellar-blade.6/';
  webview.style.width = '100%';
  webview.style.height = '700px';
  webview.setAttribute('allowpopups', '');
  webview.setAttribute('webpreferences', 'nodeIntegration=no,contextIsolation=yes');
  webview.id = 'ayaka-webview';
  
  // Variable pour gérer le polling
  let ayakaPollingInterval = null;
  
  webview.addEventListener('dom-ready', () => {
    console.log('🌐 Ayaka webview DOM ready, configuration stable...');
    
    const script = `
      (function() {
        console.log('🖼️ Script stable Ayaka démarré');
        
        window.lastRightClickedImage = null;
        window.lastRightClickTime = 0;
        
        if (window.ayakaImageHandler) {
          document.removeEventListener('contextmenu', window.ayakaImageHandler, true);
        }
        
        window.ayakaImageHandler = function(e) {
          let targetImage = null;
          
          if (e.target.tagName === 'IMG') {
            targetImage = e.target;
          } else {
            targetImage = e.target.querySelector('img') || 
                         e.target.closest('figure, div, a, span, .bbImage, .message-userBanner')?.querySelector('img');
          }
          
          if (targetImage && targetImage.src && 
              targetImage.src.startsWith('http') && 
              (targetImage.src.includes('ayakamods.cc') || 
               targetImage.src.includes('xenforo.com') ||
               targetImage.src.includes('.jpg') || 
               targetImage.src.includes('.png') || 
               targetImage.src.includes('.webp') ||
               targetImage.src.includes('.gif'))) {
            
            console.log('🖼️ CLIC DROIT Ayaka détecté sur:', targetImage.src);
            
            window.lastRightClickedImage = {
              imageUrl: targetImage.src,
              pageUrl: window.location.href,
              imageAlt: targetImage.alt || '',
              imageTitle: targetImage.title || '',
              source: 'ayaka',
              threadId: window.location.pathname.split('/').pop() || 'unknown',
              timestamp: Date.now()
            };
            
            window.lastRightClickTime = Date.now();
            console.log('💾 Données Ayaka stockées');
            return true;
          }
        };
        
        document.addEventListener('contextmenu', window.ayakaImageHandler, true);
        
        // Observer pour contenu XenForo dynamique
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.addedNodes) {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1 && node.querySelectorAll) {
                  const newImages = node.querySelectorAll('img');
                  if (newImages.length > 0) {
                    console.log('🖼️ Nouvelles images Ayaka:', newImages.length);
                  }
                }
              });
            }
          });
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        window.getRecentImageData = function() {
          if (window.lastRightClickedImage && 
              (Date.now() - window.lastRightClickTime) < 2000) {
            const data = window.lastRightClickedImage;
            window.lastRightClickedImage = null;
            return data;
          }
          return null;
        };
        
        console.log('✅ Handler stable Ayaka configuré');
        
      })();
    `;
    
    webview.executeJavaScript(script)
      .then(() => {
        console.log('✅ Script stable Ayaka injecté');
        startStableImageDetectionAyaka(webview);
      })
      .catch(err => console.error('❌ Erreur injection Ayaka:', err));
  });

  // Nettoyage à la destruction de la webview
  webview.addEventListener('destroyed', () => {
    if (ayakaPollingInterval) {
      clearInterval(ayakaPollingInterval);
      ayakaPollingInterval = null;
      console.log('🧹 Polling Ayaka nettoyé');
    }
  });

  ayakaDiv.appendChild(webview);
  console.log('✅ Ayaka webview stable créée');

  // Fonction de surveillance stable
  function startStableImageDetectionAyaka(webview) {
    console.log('🔧 Démarrage surveillance stable Ayaka');
    
    // Nettoie l'ancien polling s'il existe
    if (ayakaPollingInterval) {
      clearInterval(ayakaPollingInterval);
    }
    
    // Event contextmenu simple
    webview.addEventListener('contextmenu', (e) => {
      console.log('📱 Event contextmenu Ayaka');
      setTimeout(() => checkForImageDataAyaka(webview), 50);
    });
    
    // Polling avec gestion d'erreurs robuste
    ayakaPollingInterval = setInterval(() => {
      // Vérifie si l'onglet Ayaka est actif
      const ayakaTab = document.querySelector('#tab-ayaka');
      if (!ayakaTab || !ayakaTab.classList.contains('active')) {
        return; // Ne fait rien si pas sur l'onglet Ayaka
      }
      
      // Vérifie si la webview existe encore
      if (!webview || !webview.executeJavaScript) {
        console.log('⚠️ Webview Ayaka non disponible, arrêt du polling');
        if (ayakaPollingInterval) {
          clearInterval(ayakaPollingInterval);
          ayakaPollingInterval = null;
        }
        return;
      }
      
      // Appel sécurisé avec gestion d'erreur
      webview.executeJavaScript('window.getRecentImageData && window.getRecentImageData()')
        .then(imageData => {
          if (imageData && imageData.imageUrl) {
            console.log('🎯 Image Ayaka détectée via polling:', imageData.imageUrl);
            
            // Arrête temporairement le polling pour éviter les doublons
            if (ayakaPollingInterval) {
              clearInterval(ayakaPollingInterval);
              ayakaPollingInterval = null;
            }
            
            // Affiche le menu
            showImageContextMenuAyaka(imageData);
            
            // Redémarre le polling après 1 seconde
            setTimeout(() => {
              if (document.querySelector('#tab-ayaka')?.classList.contains('active')) {
                startStableImageDetectionAyaka(webview);
              }
            }, 1000);
          }
        })
        .catch(err => {
          // Ignore silencieusement les erreurs de polling
        });
    }, 200);
    
    console.log('👂 Surveillance stable Ayaka active');
  }

  // Fonction pour vérifier les données
  function checkForImageDataAyaka(webview) {
    if (!webview || !webview.executeJavaScript) return;
    
    webview.executeJavaScript('window.getRecentImageData && window.getRecentImageData()')
      .then(imageData => {
        if (imageData) {
          console.log('📨 Données Ayaka récupérées:', imageData.imageUrl);
          showImageContextMenuAyaka(imageData);
        }
      })
      .catch(err => {}); // Ignore les erreurs
  }

  // Fonction pour afficher le menu
  function showImageContextMenuAyaka(imageData) {
    console.log('🖼️ Affichage menu Ayaka pour:', imageData.imageUrl);
    
    if (window.electronAPI && window.electronAPI.showImageContextMenu) {
      window.electronAPI.showImageContextMenu(imageData);
    } else if (window.ImageContextManager) {
      window.ImageContextManager.showImageContextMenu(imageData);
    } else {
      console.error('❌ Aucune méthode de menu Ayaka disponible');
    }
  }
};

// Nettoie le polling global si on change d'onglet
document.addEventListener('DOMContentLoaded', () => {
  const ayakaTab = document.querySelector('#menu li[data-tab="ayaka"]');
  if (ayakaTab) {
    ayakaTab.addEventListener('click', () => {
      // Redémarre la webview proprement
      setTimeout(() => {
        if (window.loadAyakaWebview) {
          console.log('🔄 Rechargement Ayaka webview');
        }
      }, 100);
    });
  }
});

// Auto-chargement si onglet ayaka actif au démarrage
if (document.querySelector('#tab-ayaka')?.classList.contains('active')) {
  window.loadAyakaWebview();
}
