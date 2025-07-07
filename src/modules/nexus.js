// Module Nexus : charge le webview avec la page générale ou un mod précis

window.loadNexusWebview = function(modid) {
  const nexusDiv = document.getElementById('nexus-content');
  nexusDiv.innerHTML = '';
  const webview = document.createElement('webview');
  if (modid) {
    webview.src = `https://www.nexusmods.com/stellarblade/mods/${modid}`;
    webview.setAttribute('data-modid', modid);
  } else {
    webview.src = 'https://www.nexusmods.com/stellarblade/mods/';
  }
  webview.style.width = '100%';
  webview.style.height = '700px';
  webview.setAttribute('allowpopups', '');
  webview.setAttribute('webpreferences', 'nativeWindowOpen=yes');
  nexusDiv.appendChild(webview);
};

// ATTENTION : NE PAS charger automatiquement ici,
// tout passe désormais par index.js avec modid en param si besoin
