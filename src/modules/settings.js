// Module paramètres : 4 sélecteurs de dossiers + clé API Nexus

const confNames = [
  {
    key: 'game_path',
    label: 'Dossier du jeu (SB-Win64-Shipping.exe)',
    placeholder: 'Sélectionne le dossier du jeu…'
  },
  {
    key: 'mods_path',
    label: 'Dossier ~mods (mods actifs)',
    placeholder: 'Sélectionne le dossier ~mods…'
  },
  {
    key: 'disabled_mods_path',
    label: 'Dossier Mods désactivés',
    placeholder: 'Sélectionne le dossier des mods désactivés…'
  },
  {
    key: 'downloads_path',
    label: 'Dossier de téléchargement des mods',
    placeholder: 'Sélectionne où télécharger les mods…'
  }
];

window.loadSettingsPage = function() {
  const container = document.getElementById('settings-content');
  container.innerHTML = '';

  // CHAMPS DOSSIERS
  confNames.forEach(conf => {
    const wrapper = document.createElement('div');
    wrapper.style.margin = '18px 0';

    const label = document.createElement('label');
    label.textContent = conf.label + ' : ';
    label.style.display = 'block';
    label.style.marginBottom = '7px';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = localStorage.getItem(conf.key) || '';
    input.placeholder = conf.placeholder;
    input.style.width = '420px';
    input.style.fontSize = '1em';
    input.readOnly = true;
    input.style.marginRight = '14px';

    const browse = document.createElement('button');
    browse.textContent = '📂 Parcourir…';
    browse.style.marginRight = '10px';
    browse.onclick = async () => {
      const path = await window.electronAPI.selectDirectory();
      if (path) {
        input.value = path;
        localStorage.setItem(conf.key, path);
      }
    };

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    wrapper.appendChild(browse);
    container.appendChild(wrapper);
  });

  // CLÉ API NEXUS
  const apiLabel = document.createElement('label');
  apiLabel.textContent = 'Clé API Nexus Mods : ';
  apiLabel.style.display = 'block';
  apiLabel.style.marginTop = '35px';
  apiLabel.style.marginBottom = '7px';

  const apiInput = document.createElement('input');
  apiInput.type = 'text';
  apiInput.value = localStorage.getItem('nexus_api_key') || '';
  apiInput.placeholder = 'Colle ta clé API Nexus Mods ici';
  apiInput.style.width = '400px';
  apiInput.style.fontSize = '1em';
  apiInput.autocomplete = 'off';

  const apiSave = document.createElement('button');
  apiSave.textContent = '💾 Sauvegarder';
  apiSave.style.marginLeft = '14px';

  const savedMsg = document.createElement('span');
  savedMsg.textContent = '';
  savedMsg.style.marginLeft = '12px';
  savedMsg.style.color = '#43ea84';
  savedMsg.style.fontWeight = 'bold';

  apiSave.onclick = () => {
    localStorage.setItem('nexus_api_key', apiInput.value.trim());
    savedMsg.textContent = 'Clé sauvegardée !';
    setTimeout(() => savedMsg.textContent = '', 1600);
  };

  container.appendChild(apiLabel);
  container.appendChild(apiInput);
  container.appendChild(apiSave);
  container.appendChild(savedMsg);
};

// Charge direct si onglet settings actif
if(document.querySelector('#tab-settings').classList.contains('active')) {
  window.loadSettingsPage();
}
