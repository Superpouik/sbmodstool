// Un seul popup universel pour l'app avec gestion des variantes

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

  // 🆕 NOUVEAU POPUP POUR SÉLECTIONNER UNE VARIANTE DE MOD
  askModVariant(modPath, variants, cb) {
    this.close();
    const popup = document.createElement('div');
    popup.className = 'custom-popup variant-popup';
    
    // Tri des variantes par taille (plus volumineuse en premier)
    const sortedVariants = variants.sort((a, b) => b.sizeBytes - a.sizeBytes);
    
    popup.innerHTML = `
      <div class="popup-content variant-content">
        <h2>🎭 Variantes de mod détectées</h2>
        <p style="color: #888; margin-bottom: 25px; text-align: center;">
          Ce mod contient plusieurs variantes. Choisissez celle que vous souhaitez installer :
        </p>
        
        <div class="variants-list" id="variants-list">
          ${sortedVariants.map((variant, index) => `
            <div class="variant-item" data-variant-index="${index}">
              <div class="variant-info">
                <div class="variant-name">📁 ${variant.name}</div>
                <div class="variant-details">
                  <span class="variant-size">💾 ${variant.sizeFormatted}</span>
                  <span class="variant-files">📦 ${variant.gameFilesCount} fichier(s) de jeu</span>
                </div>
              </div>
              <div class="variant-select">
                <input type="radio" name="variant" id="variant-${index}" value="${index}" ${index === 0 ? 'checked' : ''}>
                <label for="variant-${index}" class="variant-radio"></label>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="popup-info">
          <div style="color: #666; font-size: 0.9em; text-align: left; margin: 20px 0;">
            💡 <strong>Conseil :</strong> La variante la plus volumineuse est généralement la version complète du mod.
          </div>
        </div>
        
        <div class="popup-btns">
          <button id="popup-cancel" style="background: #666;">❌ Annuler</button>
          <button id="popup-install" class="primary">✅ Installer la variante</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(popup);

    // Styles CSS intégrés pour le popup de variantes
    const style = document.createElement('style');
    style.textContent = `
      .variant-popup .popup-content {
        min-width: 500px;
        max-width: 650px;
      }
      
      .variants-list {
        max-height: 350px;
        overflow-y: auto;
        margin-bottom: 20px;
        border: 1px solid #333;
        border-radius: 10px;
        background: #191b25;
      }
      
      .variant-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #333;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .variant-item:last-child {
        border-bottom: none;
      }
      
      .variant-item:hover {
        background: #2a3139;
      }
      
      .variant-item.selected {
        background: #1e3a2e;
        border-color: #48ffd3;
      }
      
      .variant-info {
        flex: 1;
      }
      
      .variant-name {
        font-size: 1.1em;
        font-weight: 600;
        color: #48ffd3;
        margin-bottom: 6px;
      }
      
      .variant-details {
        display: flex;
        gap: 20px;
        font-size: 0.9em;
        color: #888;
      }
      
      .variant-size {
        color: #82eefd;
      }
      
      .variant-files {
        color: #ffa726;
      }
      
      .variant-select {
        margin-left: 15px;
      }
      
      .variant-radio {
        width: 20px;
        height: 20px;
        border: 2px solid #666;
        border-radius: 50%;
        display: inline-block;
        position: relative;
        cursor: pointer;
        transition: border-color 0.2s;
      }
      
      input[type="radio"] {
        display: none;
      }
      
      input[type="radio"]:checked + .variant-radio {
        border-color: #48ffd3;
        background: #48ffd3;
      }
      
      input[type="radio"]:checked + .variant-radio::after {
        content: '';
        width: 8px;
        height: 8px;
        background: #181c22;
        border-radius: 50%;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }
    `;
    document.head.appendChild(style);

    // Gestion des clics sur les items pour sélectionner
    popup.querySelectorAll('.variant-item').forEach(item => {
      item.addEventListener('click', () => {
        const radio = item.querySelector('input[type="radio"]');
        radio.checked = true;
        
        // Update visual selection
        popup.querySelectorAll('.variant-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
      });
    });

    // Sélection initiale
    popup.querySelector('.variant-item').classList.add('selected');

    // Bouton installer
    popup.querySelector('#popup-install').onclick = () => {
      const selectedRadio = popup.querySelector('input[name="variant"]:checked');
      if (selectedRadio) {
        const variantIndex = parseInt(selectedRadio.value);
        const selectedVariant = sortedVariants[variantIndex];
        
        console.log('🎯 Variante sélectionnée:', selectedVariant.name);
        
        this.close();
        
        // Affiche notification de traitement
        if (window.showNotification) {
          window.showNotification(`⚙️ Installation de la variante "${selectedVariant.name}"...`, false);
        }
        
        // Installe la variante
        setTimeout(() => {
          const result = window.electronAPI.installModVariant(modPath, selectedVariant, variants);
          
          if (result.success) {
            if (window.showNotification) {
              window.showNotification(`✅ Variante "${selectedVariant.name}" installée avec succès !`, false);
            }
            cb({ success: true, variant: selectedVariant });
          } else {
            if (window.showNotification) {
              window.showNotification(`❌ Erreur installation: ${result.error || 'Erreur inconnue'}`, true);
            }
            cb({ success: false, error: result.error });
          }
        }, 300);
      }
    };

    // Bouton annuler
    popup.querySelector('#popup-cancel').onclick = () => {
      this.close();
      cb({ success: false, cancelled: true });
    };

    // Fermeture par Échap
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.close();
        cb({ success: false, cancelled: true });
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Focus sur le popup
    popup.querySelector('#popup-install').focus();
  },

  close() {
    document.querySelectorAll('.custom-popup').forEach(p => p.remove());
    // Nettoie aussi les styles temporaires
    document.querySelectorAll('style[data-popup-temp]').forEach(s => s.remove());
  }
};