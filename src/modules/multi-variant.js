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

      // Trie les variants par priorité (requis en premier, puis par taille)
      const sortedVariants = selectedVariants.sort((a, b) => {
        const aRequired = this.requiredPatterns.some(pattern => pattern.test(a.name));
        const bRequired = this.requiredPatterns.some(pattern => pattern.test(b.name));
        
        if (aRequired && !bRequired) return -1;
        if (!aRequired && bRequired) return 1;
        return b.sizeBytes - a.sizeBytes; // Plus gros en premier
      });

      // Collecte tous les fichiers à installer avec gestion des conflits
      const filesToInstall = new Map(); // chemin relatif -> { source, priority, variant }
      
      for (let i = 0; i < sortedVariants.length; i++) {
        const variant = sortedVariants[i];
        const priority = sortedVariants.length - i; // Plus prioritaire = plus haut

        console.log(`📦 Traitement variant "${variant.name}" (priorité: ${priority})`);
        
        await this.collectVariantFiles(variant.path, '', filesToInstall, priority, variant.name);
      }

      // Installe les fichiers dans l'ordre de priorité
      let installedCount = 0;
      for (const [relativePath, fileInfo] of filesToInstall) {
        const sourcePath = fileInfo.source;
        const destPath = require('path').join(modPath, relativePath);
        
        try {
          // Crée le dossier de destination si nécessaire
          const destDir = require('path').dirname(destPath);
          if (!require('fs').existsSync(destDir)) {
            require('fs').mkdirSync(destDir, { recursive: true });
          }

          // Copie le fichier
          require('fs').copyFileSync(sourcePath, destPath);
          installedCount++;
          console.log(`✅ Installé: ${relativePath} (de ${fileInfo.variant})`);
          
        } catch (error) {
          console.error(`❌ Erreur installation ${relativePath}:`, error.message);
        }
      }

      // Supprime tous les dossiers de variants originaux
      for (const variant of allVariants) {
        try {
          if (require('fs').existsSync(variant.path)) {
            await require('rimraf').sync(variant.path);
            console.log(`🗑️ Dossier variant supprimé: ${variant.name}`);
          }
        } catch (error) {
          console.error(`❌ Erreur suppression ${variant.name}:`, error.message);
        }
      }

      console.log(`✅ Installation multiple terminée: ${installedCount} fichiers installés`);
      return { 
        success: true, 
        installedVariants: selectedVariants.map(v => v.name),
        fileCount: installedCount 
      };

    } catch (error) {
      console.error('❌ Erreur installation multiple:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Collecte récursivement tous les fichiers d'un variant
   */
  async collectVariantFiles(variantPath, relativePath, filesToInstall, priority, variantName) {
    const fs = require('fs');
    const path = require('path');

    try {
      const items = fs.readdirSync(path.join(variantPath, relativePath));

      for (const item of items) {
        const itemPath = path.join(variantPath, relativePath, item);
        const relativeItemPath = path.join(relativePath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          // Récursion pour les sous-dossiers
          await this.collectVariantFiles(variantPath, relativeItemPath, filesToInstall, priority, variantName);
        } else if (stat.isFile()) {
          // Ajoute le fichier s'il n'existe pas ou si la priorité est plus élevée
          const normalizedPath = relativeItemPath.replace(/\\/g, '/');
          
          if (!filesToInstall.has(normalizedPath) || filesToInstall.get(normalizedPath).priority < priority) {
            filesToInstall.set(normalizedPath, {
              source: itemPath,
              priority: priority,
              variant: variantName
            });
          } else {
            console.log(`⚠️ Conflit fichier: ${normalizedPath} - priorité ${filesToInstall.get(normalizedPath).variant} > ${variantName}`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Erreur collecte fichiers ${variantName}:`, error.message);
    }
  }

  /**
   * Affiche l'interface de sélection multiple
   */
  showMultiVariantSelector(modPath, variants, callback) {
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
      popup.querySelector('#selected-count').textContent = selectedVariants.length;
      popup.querySelector('#total-size').textContent = this.formatBytes(totalSize);
      
      // Vérifie les conflits
      const conflicts = this.checkConflicts(selectedVariants, analysis);
      const warningsDiv = popup.querySelector('#conflict-warnings');
      
      if (conflicts.length > 0) {
        warningsDiv.innerHTML = conflicts.map(conflict =>
          `<div class="conflict-warning">⚠️ ${conflict.message}</div>`
        ).join('');
        warningsDiv.style.display = 'block';
        popup.querySelector('#popup-install').disabled = true;
      } else {
        warningsDiv.style.display = 'none';
        popup.querySelector('#popup-install').disabled = selectedVariants.length === 0;
      }
    };

    // Events sur les checkboxes
    popup.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const variantItem = checkbox.closest('.multi-variant-item');
        variantItem.classList.toggle('selected', checkbox.checked);
        updateSelection();
      });
    });

    // Clic sur les items pour toggle
    popup.querySelectorAll('.multi-variant-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.type !== 'checkbox' && !e.target.matches('label')) {
          const checkbox = item.querySelector('input[type="checkbox"]');
          if (!checkbox.disabled) {
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
          }
        }
      });
    });

    // Bouton installer
    popup.querySelector('#popup-install').onclick = async () => {
      const selectedCheckboxes = popup.querySelectorAll('input[type="checkbox"]:checked');
      const selectedVariants = Array.from(selectedCheckboxes).map(cb => 
        variants[parseInt(cb.dataset.variantIndex)]
      );
      
      if (selectedVariants.length === 0) return;
      
      popup.querySelector('#popup-install').disabled = true;
      popup.querySelector('#popup-install').innerHTML = '⏳ Installation...';
      
      try {
        const result = await this.installMultipleVariants(modPath, selectedVariants, variants);
        this.closeMultiVariantPopup();
        callback(result);
      } catch (error) {
        console.error('❌ Erreur installation:', error);
        this.closeMultiVariantPopup();
        callback({ success: false, error: error.message });
      }
    };

    // Bouton annuler
    popup.querySelector('#popup-cancel').onclick = () => {
      this.closeMultiVariantPopup();
      callback({ success: false, cancelled: true });
    };

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
      checkbox.closest('.multi-variant-item').classList.add('selected');
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
      
      /* Scrollbar personnalisée */
      .multi-variants-container::-webkit-scrollbar {
        width: 8px;
      }
      
      .multi-variants-container::-webkit-scrollbar-track {
        background: #191b25;
        border-radius: 10px;
      }
      
      .multi-variants-container::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 10px;
      }
      
      .multi-variants-container::-webkit-scrollbar-thumb:hover {
        background: #555;
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .multi-variant-popup .popup-content {
          min-width: 90vw;
          max-width: 90vw;
          max-height: 90vh;
          margin: 0 20px;
        }
        
        .variant-details-multi {
          flex-direction: column;
          gap: 6px;
        }
        
        .info-row {
          flex-direction: column;
          gap: 8px;
          text-align: center;
        }
        
        .multi-variant-popup .popup-btns {
          flex-direction: column;
          gap: 10px;
        }
        
        .multi-variant-popup .popup-btns button {
          width: 100%;
        }
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

// Fonction d'entrée principale - à utiliser au lieu de Popup.askModVariant pour les mods modulaires
window.showModVariantSelector = function(modPath, variants, callback) {
  const manager = window.MultiVariantManager;
  
  if (manager.isModularMod(variants)) {
    console.log('🎭 Mod modulaire détecté - Interface multi-sélection');
    manager.showMultiVariantSelector(modPath, variants, callback);
  } else {
    console.log('🎯 Mod standard - Interface sélection unique');
    // Utilise l'ancien système pour les mods simples
    if (window.Popup && window.Popup.askModVariant) {
      window.Popup.askModVariant(modPath, variants, callback);
    } else {
      callback({ success: false, error: 'Interface de sélection non disponible' });
    }
  }
};

console.log('✅ Multi-Variant Manager initialisé');