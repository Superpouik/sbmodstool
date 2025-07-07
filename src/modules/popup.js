// Un seul popup universel pour l'app
window.Popup = {
  askMiniature(modName, cb) {
    this.close();
    const popup = document.createElement('div');
    popup.className = 'custom-popup';

    popup.innerHTML = `
      <div class="popup-content">
        <h2>🖼️ Miniature pour<br><span>${modName}</span></h2>
        <button id="popup-file">Choisir un fichier image</button>
        <div class="popup-or">OU</div>
        <input id="popup-url" type="text" placeholder="Colle l'URL d'une image (jpg/png/webp)"/>
        <div class="popup-btns">
          <button id="popup-cancel">Annuler</button>
          <button id="popup-validate" class="primary">Valider</button>
        </div>
      </div>
    `;
    document.body.appendChild(popup);

    // Choix fichier local
    popup.querySelector('#popup-file').onclick = () => {
      window.electronAPI.selectImageFile().then(filePath => {
        this.close();
        if (filePath) cb({ mode: "file", filePath });
      });
    };
    // Valider via URL
    popup.querySelector('#popup-validate').onclick = () => {
      const url = popup.querySelector('#popup-url').value.trim();
      this.close();
      if (url) cb({ mode: "url", url });
    };
    // Cancel
    popup.querySelector('#popup-cancel').onclick = () => this.close();
  },
  askConfirm(txt, cb) {
    this.close();
    const popup = document.createElement('div');
    popup.className = 'custom-popup';
    popup.innerHTML = `
      <div class="popup-content">
        <h3 style="margin-bottom:20px;">${txt}</h3>
        <div class="popup-btns">
          <button id="popup-cancel">Non</button>
          <button id="popup-ok" class="primary">Oui</button>
        </div>
      </div>
    `;
    document.body.appendChild(popup);
    popup.querySelector('#popup-cancel').onclick = () => { this.close(); cb(false); };
    popup.querySelector('#popup-ok').onclick = () => { this.close(); cb(true); };
  },
  close() {
    document.querySelectorAll('.custom-popup').forEach(p => p.remove());
  }
};
