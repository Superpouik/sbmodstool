// Module Home : Affiche les derniers mods Nexus pour Stellar Blade (API), bouton Télécharger qui ouvre l’onglet Nexus sur la fiche du mod

window.loadHomeWebview = async function() {
  const homeDiv = document.getElementById('home-webview');
  homeDiv.innerHTML = '<div style="font-size:1.2em;padding:32px">Chargement des derniers mods…</div>';

  const apiKey = localStorage.getItem('nexus_api_key') || '';
  if (!apiKey) {
    homeDiv.innerHTML = '<span style="color:#fa6464">⚠️ Clé API Nexus manquante.<br>Va dans Paramètres pour la renseigner !</span>';
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
      homeDiv.innerHTML = '<span style="color:#fa6464">Aucun mod trouvé 😢</span>';
      return;
    }

    // Liste de cartes mods avec bouton Télécharger stylé
    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:24px;">';
    for(const mod of mods) {
      html += `<div style="background:#23272f;border-radius:15px;padding:18px;box-shadow:0 2px 14px #0003">
        <img src="${mod.picture_url || ''}" alt="mod" style="width:100%;max-width:246px;border-radius:12px;box-shadow:0 0 12px #0004;object-fit:cover;">
        <div style="font-size:1.15em;font-weight:600;color:#82eefd;margin:18px 0 8px 0;">${mod.name}</div>
        <div style="color:#eee;font-size:0.97em;">${mod.author}</div>
        <div style="font-size:0.93em;color:#97b1b5;">${mod.summary || ''}</div>
        <div style="margin:10px 0 5px 0;color:#aaa;">💾 Téléchargements : <b>${mod.downloads}</b></div>
        <button class="mod-dl-btn" data-modid="${mod.mod_id}" style="display:block;margin:14px auto 0 auto;padding:8px 24px;background:#181c22;color:#48ffd3;font-weight:600;border:2px solid #48ffd3;border-radius:9px;font-size:1.09em;cursor:pointer;transition:background .2s, color .2s;">⬇️ Télécharger</button>
      </div>`;
    }
    html += '</div>';
    homeDiv.innerHTML = html;

    // Ajoute les event listeners sur les boutons Télécharger
    homeDiv.querySelectorAll('.mod-dl-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const modid = btn.getAttribute('data-modid');
        window.lastNexusModId = modid; // mémorise pour le switch d’onglet
        // Change d’onglet vers Nexus
        document.querySelectorAll('#menu li').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector('#menu li[data-tab="nexus"]').classList.add('active');
        document.querySelector('#tab-nexus').classList.add('active');
        // Charge le mod directement dans le webview Nexus
        if(window.loadNexusWebview) window.loadNexusWebview(modid);
      });
    });
  } catch(e) {
    homeDiv.innerHTML = `<span style="color:#fa6464">Erreur lors de la récupération des mods.<br>${e}</span>`;
  }
};

if(document.querySelector('#tab-home').classList.contains('active')) {
  window.loadHomeWebview();
}
