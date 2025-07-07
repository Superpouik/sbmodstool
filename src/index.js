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
  });
});

// Sélection du bouton Nexus dans la sidebar
const nexusBtn = document.querySelector('#menu li[data-tab="nexus"]');

// Crée la barre de progression horizontale à l’intérieur du bouton
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

// Crée l’icône ✅ pour la fin
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
document.querySelectorAll('#menu li').forEach(li => {
  li.addEventListener('click', () => {
    document.querySelectorAll('#menu li').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    li.classList.add('active');
    document.querySelector(`#tab-${li.dataset.tab}`).classList.add('active');

    if (li.dataset.tab === 'mods' && window.loadModsPage) {
      window.loadModsPage();
    }
    // …les autres onglets…
  });
});
