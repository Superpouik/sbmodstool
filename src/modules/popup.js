// Un seul popup universel pour l'app avec gestion des variantes et des notes

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

  // 🆕 NOUVEAU POPUP POUR AJOUTER/MODIFIER UNE NOTE DE MOD
  askNote(modName, existingNote = '', cb) {
    console.log('📝 Ouverture popup note pour:', modName);
    this.close();
    const popup = document.createElement('div');
    popup.className = 'custom-popup note-popup';
    
    popup.innerHTML = `
      <div class="popup-content note-content">
        <h2>📝 Note pour<br><span>${modName}</span></h2>
        <p style="color: #888; margin-bottom: 20px; text-align: center;">
          Ajoutez vos commentaires personnels sur ce mod
        </p>
        
        <div class="note-input-container">
          <textarea id="note-textarea" placeholder="Tapez votre note ici...
Exemples :
• Excellent mod, très bien fait
• Bug avec les textures parfois
• Version préférée : HD
• Compatible avec le mod XYZ">${existingNote}</textarea>
          <div class="note-char-count">
            <span id="char-count">${existingNote.length}</span>/500 caractères
          </div>
        </div>
        
        <div class="note-tips">
          💡 <strong>Astuces :</strong> 
          <ul>
            <li>Notez la qualité du mod (⭐⭐⭐⭐⭐)</li>
            <li>Signalez les bugs ou problèmes</li>
            <li>Mentionnez les compatibilités</li>
            <li>Votre version préférée si variantes</li>
          </ul>
        </div>
        
        <div class="popup-btns">
          <button id="popup-cancel" style="background: #666;">❌ Annuler</button>
          <button id="popup-clear" style="background: #ff6b35;" ${!existingNote ? 'style="display:none;"' : ''}>🗑️ Effacer</button>
          <button id="popup-save" class="primary">💾 Sauvegarder</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(popup);

    // Styles CSS spécifiques pour le popup de note
    const style = document.createElement('style');
    style.setAttribute('data-popup-temp', 'true');
    style.textContent = `
      .note-popup .popup-content {
        min-width: 500px;
        max-width: 600px;
      }
      
      .note-input-container {
        position: relative;
        margin: 20px 0;
      }
      
      #note-textarea {
        width: 100%;
        min-height: 120px;
        max-height: 200px;
        padding: 12px;
        background: #191b25;
        border: 2px solid #444;
        border-radius: 8px;
        color: #fff;
        font-size: 1em;
        font-family: inherit;
        line-height: 1.4;
        resize: vertical;
        outline: none;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      
      #note-textarea:focus {
        border-color: #48ffd3;
        box-shadow: 0 0 0 3px rgba(72, 255, 211, 0.1);
      }
      
      #note-textarea::placeholder {
        color: #666;
        font-style: italic;
        line-height: 1.3;
      }
      
      .note-char-count {
        position: absolute;
        bottom: -25px;
        right: 0;
        font-size: 0.85em;
        color: #888;
      }
      
      .note-char-count.warning {
        color: #ffa726;
      }
      
      .note-char-count.error {
        color: #ff5722;
      }
      
      .note-tips {
        background: rgba(72, 255, 211, 0.05);
        border: 1px solid rgba(72, 255, 211, 0.2);
        border-radius: 8px;
        padding: 15px;
        margin: 30px 0 20px 0;
        text-align: left;
        font-size: 0.9em;
        color: #ccc;
      }
      
      .note-tips strong {
        color: #48ffd3;
      }
      
      .note-tips ul {
        margin: 8px 0 0 0;
        padding-left: 20px;
      }
      
      .note-tips li {
        margin: 4px 0;
        color: #aaa;
      }
      
      .note-popup .popup-btns button {
        min-width: 120px;
      }
      
      #popup-clear {
        background: #ff6b35 !important;
      }
      
      #popup-clear:hover {
        background: #ff5722 !important;
      }
    `;
    document.head.appendChild(style);

    const textarea = popup.querySelector('#note-textarea');
    const charCount = popup.querySelector('#char-count');
    const charCountContainer = popup.querySelector('.note-char-count');
    const maxChars = 500;

    // Gestion du compteur de caractères
    function updateCharCount() {
      const currentLength = textarea.value.length;
      charCount.textContent = currentLength;
      
      // Change la couleur selon la limite
      charCountContainer.className = 'note-char-count';
      if (currentLength > maxChars * 0.9) {
        charCountContainer.classList.add('warning');
      }
      if (currentLength > maxChars) {
        charCountContainer.classList.add('error');
      }
    }

    // Event listeners
    textarea.addEventListener('input', () => {
      updateCharCount();
      
      // Limite le nombre de caractères
      if (textarea.value.length > maxChars) {
        textarea.value = textarea.value.substring(0, maxChars);
        updateCharCount();
      }
    });

    // Focus sur le textarea
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }, 100);

    // Bouton sauvegarder
    popup.querySelector('#popup-save').onclick = () => {
      const note = textarea.value.trim();
      console.log('💾 Sauvegarde note:', note);
      this.close();
      cb({ success: true, note });
    };

    // Bouton effacer
    popup.querySelector('#popup-clear').onclick = () => {
      textarea.value = '';
      updateCharCount();
      textarea.focus();
    };

    // Bouton annuler
    popup.querySelector('#popup-cancel').onclick = () => {
      console.log('❌ Annulation note');
      this.close();
      cb({ success: false, cancelled: true });
    };

    // Raccourci clavier Ctrl+Enter pour sauvegarder
    textarea.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        popup.querySelector('#popup-save').click();
      }
    });

    // Fermeture par Échap
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.close();
        cb({ success: false, cancelled: true });
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Initialise le compteur
    updateCharCount();
    
    console.log('✅ Popup note créé et affiché');
  },

  // 🆕 SÉLECTEUR DE VARIANTES DE MOD
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
    style.setAttribute('data-popup-temp', 'true');
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