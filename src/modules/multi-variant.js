// src/modules/multi-variant.js - Gestion des mods modulaires avec sélection multiple

console.log('🎭 Module multi-variant.js chargé');

/**
 * Gestionnaire pour les mods modulaires nécessitant une sélection multiple de variants
 */
class MultiVariantManager {
  constructor() {
    this.modularPatterns = [
      // Patterns communs de mods modulaires
      /^(core|base|main|principal)$/i,
      /^(optional|addon|extra|supplement)$/i,
      /^(texture|material|skin)$/i,
      /^(sound|audio|music)$/i,
      /^(compatibility|compat)$/i,
      /^(patch|fix|update)$/i,
      /^(hd|4k|2k|uhd)$/i,
      /^(low|med|high|ultra)$/i,
      /^(part\d+|section\d+|component\d+)$/i,
      /^(english|français|deutsch|español)$/i
    ];

    this.requiredPatterns = [
      /^(core|base|main|principal|required)$/i
    ];

    this.conflictGroups = [
      // Groupes de variants qui s'excluent mutuellement
      ['low', 'med', 'medium', 'high', 'ultra'],
      ['2k', '4k', 'hd', 'uhd'],
      ['english', 'français', 'deutsch', 'español', 'french', 'german', 'spanish']
    ];
  }

  /**
   * Détermine si un mod est modulaire et nécessite une sélection multiple
   */
  isModularMod(variants) {
    if (!variants || variants.length < 2) return false;

    // Compte les variants qui correspondent aux patterns modulaires
    const modularCount = variants.filter(variant => 
      this.modularPatterns.some(pattern => pattern.test(variant.name))
    ).length;

    // Si plus de 70% des variants correspondent aux patterns modulaires
    const modularRatio = modularCount / variants.length;
    const hasRequiredComponent = variants.some(variant =>
      this.requiredPatterns.some(pattern => pattern.test(variant.name))
    );

    console.log(`🔍 Analyse modularité: ${modularCount}/${variants.length} (${Math.round(modularRatio * 100)}%) - Requis: ${hasRequiredComponent}`);

    return modularRatio >= 0.6 || hasRequiredComponent || variants.length >= 4;
  }

  /**
   * Analyse les variants pour détecter les composants requis et les groupes de conflit
   */
  analyzeVariants(variants) {
    const analysis = {
      required: [],
      optional: [],
      conflictGroups: [],
      recommended: []
    };

    // Identifie les composants requis
    variants.forEach(variant => {
      if (this.requiredPatterns.some(pattern => pattern.test(variant.name))) {
        analysis.required.push(variant);
      } else {
        analysis.optional.push(variant);
      }
    });

    // Détecte les groupes de conflit
    this.conflictGroups.forEach(group => {
      const conflictingVariants = variants.filter(variant =>
        group.some(keyword => variant.name.toLowerCase().includes(keyword.toLowerCase()))
      );
      
      if (conflictingVariants.length > 1) {
        analysis.conflictGroups.push({
          type: group.join('/'),
          variants: conflictingVariants,
          allowMultiple: false
        });
      }
    });

    // Recommande le variant le plus volumineux dans chaque groupe de conflit
    analysis.conflictGroups.forEach(group => {
      const largest = group.variants.reduce((prev, current) => 
        current.sizeBytes > prev.sizeBytes ? current : prev
      );
      if (!analysis.recommended.includes(largest)) {
        analysis.recommended.push(largest);
      }
    });

    // Recommande tous les composants requis
    analysis.recommended.push(...analysis.required);

    console.log('📊 Analyse variants:', analysis);
    return analysis;
  }

  /**
   * Vérifie les conflits dans une sélection
   */
  checkConflicts(selectedVariants, analysis) {
    const conflicts = [];

    analysis.conflictGroups.forEach(group => {
      const selectedFromGroup = selectedVariants.filter(variant =>
        group.variants.includes(variant)
      );

      if (selectedFromGroup.length > 1 && !group.allowMultiple) {
        conflicts.push({
          type: 'exclusion',
          group: group.type,
          variants: selectedFromGroup,
          message: `Only one variant can be selected from: ${group.type}`
        });
      }
    });

    return conflicts;
  }

  /**
   * Installe plusieurs variants en les fusionnant intelligemment
   */
  async installMultipleVariants(modPath, selectedVariants, allVariants) {
    try {
      console.log('⚙️ Installation de variants multiples:', selectedVariants.map(v => v.name));

      // 🔧 CORRECTION : Utilise window.electronAPI au lieu de require direct
      const result = await window.electronAPI.installMultipleVariants(modPath, selectedVariants, allVariants);
      
      if (result && result.success) {
        console.log(`✅ Installation multiple terminée: ${result.fileCount || 0} fichiers installés`);
        return result;
      } else {
        console.error('❌ Erreur installation multiple:', result?.error);
        return { success: false, error: result?.error || 'Installation échouée' };
      }

    } catch (error) {
      console.error('❌ Erreur installation multiple:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Affiche l'interface de sélection multiple
   */
  showMultiVariantSelector(modPath, variants, callback) {
    console.log('🎭 Affichage interface multi-variants pour:', variants.length, 'variants');
    
    // Ferme les popups existants
    if (window.Popup) {
      window.Popup.close();
    }

    const analysis = this.analyzeVariants(variants);
    const popup = document.createElement('div');
    popup.className = 'custom-popup multi-variant-popup';
    
    // Tri des variants par catégorie
    const sortedVariants = [
      ...analysis.required,
      ...analysis.optional.filter(v => !analysis.required.includes(v))
    ];
    
    popup.innerHTML = `
      <div class="popup-content multi-variant-content">
        <h2>🎭 Mod modulaire détecté</h2>
        <p style="color: #888; margin-bottom: 25px; text-align: center;">
          Ce mod contient plusieurs composants. Sélectionnez ceux que vous souhaitez installer :
        </p>
        
        <div class="multi-variants-container" id="multi-variants-container">
          ${this.renderVariantsList(sortedVariants, analysis)}
        </div>
        
        <div class="selection-info" id="selection-info">
          <div class="info-row">
            <span>📦 Sélectionnés: <strong id="selected-count">0</strong></span>
            <span>💾 Taille totale: <strong id="total-size">0 B</strong></span>
          </div>
          <div id="conflict-warnings" class="conflict-warnings"></div>
        </div>
        
        <div class="popup-info">
          <div style="color: #666; font-size: 0.9em; text-align: left; margin: 20px 0;">
            💡 <strong>Conseils :</strong><br>
            • Les composants <span style="color: #ff6b35;">requis</span> sont automatiquement sélectionnés<br>
            • Les éléments <span style="color: #48ffd3;">recommandés</span> sont présélectionnés<br>
            • Certains composants s'excluent mutuellement
          </div>
        </div>
        
        <div class="popup-btns">
          <button id="popup-cancel" style="background: #666;">❌ Annuler</button>
          <button id="popup-install" class="primary">✅ Installer la sélection</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(popup);
    this.addMultiVariantStyles();
    this.setupMultiVariantEvents(popup, modPath, variants, analysis, callback);
    
    console.log('✅ Interface multi-variants affichée');
  }

  /**
   * Génère le HTML pour la liste des variants
   */
  renderVariantsList(variants, analysis) {
    return variants.map((variant, index) => {
      const isRequired = analysis.required.includes(variant);
      const isRecommended = analysis.recommended.includes(variant);
      const isPreselected = isRequired || isRecommended;
      
      const statusBadge = isRequired ? 
        '<span class="variant-badge required">Requis</span>' :
        isRecommended ? 
        '<span class="variant-badge recommended">Recommandé</span>' :
        '<span class="variant-badge optional">Optionnel</span>';

      return `
        <div class="multi-variant-item" data-variant-index="${index}">
          <div class="variant-checkbox-container">
            <input type="checkbox" id="variant-${index}" 
                   data-variant-index="${index}"
                   ${isPreselected ? 'checked' : ''} 
                   ${isRequired ? 'disabled' : ''}>
            <label for="variant-${index}" class="variant-checkbox-label"></label>
          </div>
          
          <div class="variant-info-multi">
            <div class="variant-name-multi">
              📁 ${variant.name}
              ${statusBadge}
            </div>
            <div class="variant-details-multi">
              <span class="variant-size">💾 ${variant.sizeFormatted}</span>
              <span class="variant-files">📦 ${variant.gameFilesCount} fichier(s)</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Configure les événements de l'interface multi-variants
   */
  setupMultiVariantEvents(popup, modPath, variants, analysis, callback) {
    const updateSelection = () => {
      const checkboxes = popup.querySelectorAll('input[type="checkbox"]:checked');
      const selectedVariants = Array.from(checkboxes).map(cb => 
        variants[parseInt(cb.dataset.variantIndex)]
      );
      
      // Met à jour les compteurs
      const totalSize = selectedVariants.reduce((sum, v) => sum + v.sizeBytes, 0);
      const selectedCountEl = popup.querySelector('#selected-count');
      const totalSizeEl = popup.querySelector('#total-size');
      
      if (selectedCountEl) selectedCountEl.textContent = selectedVariants.length;
      if (totalSizeEl) totalSizeEl.textContent = this.formatBytes(totalSize);
      
      // Vérifie les conflits
      const conflicts = this.checkConflicts(selectedVariants, analysis);
      const warningsDiv = popup.querySelector('#conflict-warnings');
      const installBtn = popup.querySelector('#popup-install');
      
      if (conflicts.length > 0) {
        if (warningsDiv) {
          warningsDiv.innerHTML = conflicts.map(conflict =>
            `<div class="conflict-warning">⚠️ ${conflict.message}</div>`
          ).join('');
          warningsDiv.style.display = 'block';
        }
        if (installBtn) installBtn.disabled = true;
      } else {
        if (warningsDiv) warningsDiv.style.display = 'none';
        if (installBtn) installBtn.disabled = selectedVariants.length === 0;
      }
    };

    // Events sur les checkboxes
    popup.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const variantItem = checkbox.closest('.multi-variant-item');
        if (variantItem) {
          variantItem.classList.toggle('selected', checkbox.checked);
        }
        updateSelection();
      });
    });

    // Clic sur les items pour toggle
    popup.querySelectorAll('.multi-variant-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.type !== 'checkbox' && !e.target.matches('label')) {
          const checkbox = item.querySelector('input[type="checkbox"]');
          if (checkbox && !checkbox.disabled) {
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
          }
        }
      });
    });

    // Bouton installer
    const installBtn = popup.querySelector('#popup-install');
    if (installBtn) {
      installBtn.onclick = async () => {
        const selectedCheckboxes = popup.querySelectorAll('input[type="checkbox"]:checked');
        const selectedVariants = Array.from(selectedCheckboxes).map(cb => 
          variants[parseInt(cb.dataset.variantIndex)]
        );
        
        if (selectedVariants.length === 0) return;
        
        installBtn.disabled = true;
        installBtn.innerHTML = '⏳ Installation...';
        
        try {
          console.log('🔧 Démarrage installation variants:', selectedVariants.map(v => v.name));
          const result = await this.installMultipleVariants(modPath, selectedVariants, variants);
          this.closeMultiVariantPopup();
          callback(result);
        } catch (error) {
          console.error('❌ Erreur installation:', error);
          this.closeMultiVariantPopup();
          callback({ success: false, error: error.message });
        }
      };
    }

    // Bouton annuler
    const cancelBtn = popup.querySelector('#popup-cancel');
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        this.closeMultiVariantPopup();
        callback({ success: false, cancelled: true });
      };
    }

    // Fermeture par Échap
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.closeMultiVariantPopup();
        callback({ success: false, cancelled: true });
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Initialise l'affichage
    updateSelection();
    
    // Marque les items présélectionnés
    popup.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
      const item = checkbox.closest('.multi-variant-item');
      if (item) {
        item.classList.add('selected');
      }
    });
  }

  /**
   * Ajoute les styles CSS pour l'interface multi-variants
   */
  addMultiVariantStyles() {
    if (document.querySelector('#multi-variant-styles')) return;

    const style = document.createElement('style');
    style.id = 'multi-variant-styles';
    style.textContent = `
      .multi-variant-popup .popup-content {
        min-width: 600px;
        max-width: 750px;
        max-height: 85vh;
        overflow-y: auto;
      }
      
      .multi-variants-container {
        max-height: 400px;
        overflow-y: auto;
        margin-bottom: 20px;
        border: 1px solid #333;
        border-radius: 12px;
        background: #191b25;
        padding: 8px;
      }
      
      .multi-variant-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-bottom: 8px;
        border: 2px solid transparent;
      }
      
      .multi-variant-item:hover {
        background: #2a3139;
        transform: translateX(2px);
      }
      
      .multi-variant-item.selected {
        background: #1e3a2e;
        border-color: #48ffd3;
        box-shadow: 0 2px 12px rgba(72, 255, 211, 0.2);
      }
      
      .variant-checkbox-container {
        display: flex;
        align-items: center;
      }
      
      .multi-variant-item input[type="checkbox"] {
        display: none;
      }
      
      .variant-checkbox-label {
        width: 22px;
        height: 22px;
        border: 2px solid #666;
        border-radius: 6px;
        display: inline-block;
        position: relative;
        cursor: pointer;
        transition: all 0.2s ease;
        background: transparent;
      }
      
      .multi-variant-item input[type="checkbox"]:checked + .variant-checkbox-label {
        border-color: #48ffd3;
        background: #48ffd3;
      }
      
      .multi-variant-item input[type="checkbox"]:checked + .variant-checkbox-label::after {
        content: '✓';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #181c22;
        font-weight: bold;
        font-size: 14px;
      }
      
      .multi-variant-item input[type="checkbox"]:disabled + .variant-checkbox-label {
        border-color: #ff6b35;
        background: #ff6b35;
        cursor: not-allowed;
      }
      
      .multi-variant-item input[type="checkbox"]:disabled + .variant-checkbox-label::after {
        content: '!';
        color: #fff;
        font-weight: bold;
      }
      
      .variant-info-multi {
        flex: 1;
        text-align: left;
      }
      
      .variant-name-multi {
        font-size: 1.1em;
        font-weight: 600;
        color: #48ffd3;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      
      .variant-badge {
        font-size: 0.75em;
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .variant-badge.required {
        background: #ff6b35;
        color: #fff;
      }
      
      .variant-badge.recommended {
        background: #48ffd3;
        color: #181c22;
      }
      
      .variant-badge.optional {
        background: #666;
        color: #ccc;
      }
      
      .variant-details-multi {
        display: flex;
        gap: 20px;
        font-size: 0.9em;
        color: #888;
      }
      
      .variant-size {
        color: #82eefd;
        font-weight: 500;
      }
      
      .variant-files {
        color: #ffa726;
        font-weight: 500;
      }
      
      .selection-info {
        background: rgba(72, 255, 211, 0.05);
        border: 1px solid rgba(72, 255, 211, 0.2);
        border-radius: 10px;
        padding: 16px;
        margin: 20px 0;
      }
      
      .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #ccc;
        font-size: 0.95em;
      }
      
      .info-row strong {
        color: #48ffd3;
      }
      
      .conflict-warnings {
        margin-top: 12px;
        display: none;
      }
      
      .conflict-warning {
        background: rgba(255, 107, 53, 0.1);
        border: 1px solid rgba(255, 107, 53, 0.3);
        border-radius: 6px;
        padding: 8px 12px;
        color: #ff6b35;
        font-size: 0.9em;
        margin-bottom: 6px;
      }
      
      .multi-variant-popup .popup-btns button {
        min-width: 140px;
        padding: 12px 20px;
        font-size: 1em;
        font-weight: 600;
      }
      
      .multi-variant-popup .popup-btns button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Ferme le popup multi-variants
   */
  closeMultiVariantPopup() {
    const popup = document.querySelector('.multi-variant-popup');
    if (popup) {
      popup.remove();
    }
    
    const styles = document.querySelector('#multi-variant-styles');
    if (styles) {
      styles.remove();
    }
  }

  /**
   * Formate les tailles de fichiers
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

// Instance globale
window.MultiVariantManager = new MultiVariantManager();

// 🔧 CORRECTION : Fonction d'entrée principale - à utiliser au lieu de Popup.askModVariant
window.showModVariantSelector = function(modPath, variants, callback) {
  console.log('🎯 showModVariantSelector appelé:', { modPath, variantsCount: variants?.length });
  
  // Validation des paramètres
  if (!modPath || !variants || !Array.isArray(variants) || variants.length === 0) {
    console.error('❌ Paramètres invalides pour showModVariantSelector');
    callback({ success: false, error: 'Paramètres invalides' });
    return;
  }

  if (!callback || typeof callback !== 'function') {
    console.error('❌ Callback invalide pour showModVariantSelector');
    return;
  }

  const manager = window.MultiVariantManager;
  
  if (!manager) {
    console.error('❌ MultiVariantManager non disponible');
    callback({ success: false, error: 'MultiVariantManager non disponible' });
    return;
  }
  
  if (manager.isModularMod(variants)) {
    console.log('🎭 Mod modulaire détecté - Interface multi-sélection');
    manager.showMultiVariantSelector(modPath, variants, callback);
  } else {
    console.log('🎯 Mod standard - Interface sélection unique');
    // Utilise l'ancien système pour les mods simples
    if (window.Popup && typeof window.Popup.askModVariant === 'function') {
      window.Popup.askModVariant(modPath, variants, callback);
    } else {
      console.error('❌ Popup.askModVariant non disponible');
      callback({ success: false, error: 'Interface de sélection non disponible' });
    }
  }
};

console.log('✅ Multi-Variant Manager initialisé');

// Export pour utilisation globale
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MultiVariantManager };
}