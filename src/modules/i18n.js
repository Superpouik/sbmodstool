// src/modules/i18n.js - Système de traductions moderne

class I18nManager {
  constructor() {
    this.currentLanguage = 'fr'; // Langue par défaut
    this.translations = {};
    this.loadedLanguages = new Set();
    this.fallbackLanguage = 'en';
    
    // Cache des traductions pour performance
    this.translationCache = new Map();
    
    // Observateurs pour les changements de langue
    this.observers = [];
    
    this.init();
  }

  async init() {
    // Récupère la langue sauvegardée
    const savedLanguage = localStorage.getItem('app_language') || 'fr';
    
    // Charge les langues nécessaires
    await this.loadLanguage(this.fallbackLanguage); // Toujours charger l'anglais
    if (savedLanguage !== this.fallbackLanguage) {
      await this.loadLanguage(savedLanguage);
    }
    
    this.setLanguage(savedLanguage);
    console.log(`🌍 i18n initialisé - Langue: ${savedLanguage}`);
  }

  async loadLanguage(langCode) {
    if (this.loadedLanguages.has(langCode)) {
      return; // Déjà chargé
    }

    try {
      // Dans un vrai projet, on chargerait depuis des fichiers JSON
      // Ici on utilise des objets inline pour simplicité
      const translations = await this.getTranslations(langCode);
      this.translations[langCode] = translations;
      this.loadedLanguages.add(langCode);
      
      console.log(`✅ Langue ${langCode} chargée`);
    } catch (error) {
      console.error(`❌ Erreur chargement langue ${langCode}:`, error);
    }
  }

  async getTranslations(langCode) {
    // Simule le chargement depuis des fichiers JSON
    // Dans une vraie app, ce serait : await fetch(`/locales/${langCode}.json`)
    
    const translations = {
      'en': await this.getEnglishTranslations(),
      'fr': await this.getFrenchTranslations(),
      'es': await this.getSpanishTranslations(),
      'de': await this.getGermanTranslations(),
      'it': await this.getItalianTranslations(),
      'pt': await this.getPortugueseTranslations(),
      'ru': await this.getRussianTranslations(),
      'ja': await this.getJapaneseTranslations(),
      'ko': await this.getKoreanTranslations(),
      'zh': await this.getChineseTranslations()
    };

    return translations[langCode] || translations['en'];
  }

  setLanguage(langCode) {
    this.currentLanguage = langCode;
    localStorage.setItem('app_language', langCode);
    
    // Vide le cache
    this.translationCache.clear();
    
    // Notifie les observateurs
    this.notifyObservers(langCode);
    
    console.log(`🔄 Langue changée vers: ${langCode}`);
  }

  // Fonction principale de traduction
  t(key, params = {}) {
    // Cache lookup
    const cacheKey = `${this.currentLanguage}:${key}:${JSON.stringify(params)}`;
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }

    let translation = this.getTranslation(key, this.currentLanguage);
    
    // Fallback vers l'anglais si pas trouvé
    if (!translation && this.currentLanguage !== this.fallbackLanguage) {
      translation = this.getTranslation(key, this.fallbackLanguage);
    }
    
    // Fallback vers la clé si toujours pas trouvé
    if (!translation) {
      console.warn(`🔍 Traduction manquante: ${key}`);
      translation = key;
    }

    // Interpolation des paramètres
    const result = this.interpolate(translation, params);
    
    // Cache le résultat
    this.translationCache.set(cacheKey, result);
    
    return result;
  }

  getTranslation(key, langCode) {
    const translations = this.translations[langCode];
    if (!translations) return null;

    // Support des clés imbriquées (ex: "settings.folders.title")
    return key.split('.').reduce((obj, k) => obj && obj[k], translations);
  }

  interpolate(text, params) {
    if (typeof text !== 'string') return text;
    
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  // Système d'observateurs pour les changements de langue
  subscribe(callback) {
    this.observers.push(callback);
    return () => {
      this.observers = this.observers.filter(obs => obs !== callback);
    };
  }

  notifyObservers(newLanguage) {
    this.observers.forEach(callback => {
      try {
        callback(newLanguage);
      } catch (error) {
        console.error('Erreur observateur i18n:', error);
      }
    });
  }

  // Utilitaires
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  getAvailableLanguages() {
    return [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'fr', name: 'Français', flag: '🇫🇷' },
      { code: 'es', name: 'Español', flag: '🇪🇸' },
      { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
      { code: 'it', name: 'Italiano', flag: '🇮🇹' },
      { code: 'pt', name: 'Português', flag: '🇵🇹' },
      { code: 'ru', name: 'Русский', flag: '🇷🇺' },
      { code: 'ja', name: '日本語', flag: '🇯🇵' },
      { code: 'ko', name: '한국어', flag: '🇰🇷' },
      { code: 'zh', name: '中文', flag: '🇨🇳' }
    ];
  }

  // ===== TRADUCTIONS ANGLAISES =====
  async getEnglishTranslations() {
    return {
      // Navigation
      nav: {
        home: "Home",
        nexus: "Nexus",
        mods: "Mods",
        ayaka: "Ayaka",
        settings: "Settings"
      },

      // Page d'accueil
      home: {
        title: "Home – Latest Nexus Mods",
        loading: "Loading latest mods…",
        noApiKey: "⚠️ Nexus API key missing.<br>Go to Settings to configure it!",
        noMods: "No mods found 😢",
        downloads: "Downloads",
        downloadBtn: "⬇️ Download"
      },

      // Nexus
      nexus: {
        title: "Nexus Mods"
      },

      // Ayaka
      ayaka: {
        title: "Ayaka Mods"
      },

      // Mods
      mods: {
        title: "Installed Mods",
        loading: "Loading mods...",
        searchPlaceholder: "🔍 Search a mod...",
        activeMods: "🟢 Active mods",
        disabledMods: "🔴 Disabled mods",
        active: "active",
        disabled: "disabled",
        enable: "Enable",
        disable: "Disable",
        noResults: "No mods found",
        noResultsFor: 'for "{{query}}"',
        searchNote: "(search in names and notes)",
        
        // Statistiques
        stats: {
          configured: "{{count}} active • {{disabled}} disabled"
        },

        // Menu contextuel
        contextMenu: {
          openFolder: "📂 Open folder",
          addPreview: "🖼️ Add thumbnail",
          fixStructure: "🔧 Fix structure",
          editNote: "📝 Edit note",
          addNote: "📝 Add note",
          deleteNote: "🗑️ Delete note",
          deleteMod: "🗑️ Delete this mod"
        },

        // Notes
        notes: {
          title: "📝 Note for<br><span>{{modName}}</span>",
          description: "Add your personal comments about this mod",
          placeholder: `Type your note here...
Examples:
• Excellent mod, very well made
• Bug with textures sometimes
• Preferred version: HD
• Compatible with XYZ mod`,
          charCount: "{{count}}/500 characters",
          tips: {
            title: "💡 <strong>Tips:</strong>",
            items: [
              "Rate the mod quality (⭐⭐⭐⭐⭐)",
              "Report bugs or issues",
              "Mention compatibilities",
              "Your preferred version if variants"
            ]
          },
          buttons: {
            cancel: "❌ Cancel",
            clear: "🗑️ Clear",
            save: "💾 Save"
          }
        },

        // Messages
        messages: {
          modEnabled: "Mod enabled!",
          modDisabled: "Mod disabled!",
          moveError: "Error moving mod!",
          noteAdded: "📝 Note saved!",
          noteDeleted: "🗑️ Note deleted!",
          noteError: "❌ Error saving note",
          deleteError: "❌ Error deleting note",
          previewAdded: "Thumbnail added!",
          previewError: "Error adding thumbnail",
          previewDownloaded: "Thumbnail downloaded!",
          previewDownloadError: "Error downloading thumbnail",
          modDeleted: "Mod deleted!",
          structureFixed: "✅ Structure fixed for \"{{modName}}\"!",
          structureOk: "ℹ️ Structure already correct for \"{{modName}}\"",
          structureAnalyzing: "🔧 Analyzing structure...",
          structureError: "❌ Error: {{error}}"
        }
      },

      // Settings
      settings: {
        title: "⚙️ Configuration",
        description: "Configure your folders, API keys and preferences",
        
        // Statistiques
        stats: {
          folders: "{{configured}} of {{total}} folders configured"
        },

        // Sections
        sections: {
          folders: {
            title: "📁 Folders",
            description: "Configuration of paths to your game and mods folders"
          },
          api: {
            title: "🔗 API & Connection",
            description: "Configuration of API keys for external services"
          },
          interface: {
            title: "🎨 Interface",
            description: "User interface customization"
          }
        },

        // Dossiers
        folders: {
          gamePath: {
            title: "Game folder (SB-Win64-Shipping.exe)",
            placeholder: "Select the game folder…"
          },
          modsPath: {
            title: "~mods folder (active mods)",
            placeholder: "Select the ~mods folder…"
          },
          disabledModsPath: {
            title: "Disabled mods folder",
            placeholder: "Select the disabled mods folder…"
          },
          downloadsPath: {
            title: "Mods download folder",
            placeholder: "Select where to download mods…"
          }
        },

        // API
        api: {
          nexusKey: {
            title: "Nexus Mods API Key",
            placeholder: "Paste your Nexus Mods API key here...",
            help: "💡 <a href=\"https://www.nexusmods.com/users/myaccount?tab=api\" target=\"_blank\">Get your Nexus Mods API key</a>"
          }
        },

        // Interface
        interface: {
          language: {
            title: "Interface language",
            info: "💡 The selected language will be applied on the next application restart"
          }
        },

        // Boutons
        buttons: {
          browse: "📂 Browse…",
          clear: "🗑️ Clear",
          save: "💾 Save",
          apply: "🔄 Apply",
          applyChange: "⚠️ Apply change",
          applied: "✅ Applied",
          restart: "🚀 Restart"
        },

        // Messages
        messages: {
          folderConfigured: "✅ {{folder}} folder configured!",
          folderCleared: "🗑️ {{folder}} folder cleared",
          apiKeySaved: "🔑 Nexus API key saved!",
          apiKeyCleared: "🗑️ Nexus API key cleared",
          apiKeyInvalid: "⚠️ Please enter a valid API key",
          languageChanged: "🌍 Language changed to {{language}}!",
          restartInfo: "🔄 <strong>Restart the application to see changes</strong>",
          restartFeature: "🚀 Restart feature to be implemented",
          restartConfirm: "Would you like to reload the application now?"
        },

        // Statuts
        status: {
          configured: "✅",
          notConfigured: "⚠️"
        }
      },

      // Launcher
      launcher: {
        launch: "Launch Stellar Blade",
        configure: "Configure game",
        launching: "Launching",
        notConfigured: "⚠️ Game path not configured! Go to Settings.",
        launched: "🎮 Stellar Blade launched successfully!",
        error: "❌ Cannot launch game. Check path in settings.",
        launchError: "❌ Error launching game."
      },

      // Popups
      popups: {
        // Miniature
        thumbnail: {
          title: "🖼️ Thumbnail for<br><span>{{modName}}</span>",
          chooseFile: "Choose image file",
          or: "OR",
          urlPlaceholder: "Paste image URL (jpg/png/webp)",
          validate: "Validate",
          cancel: "Cancel"
        },

        // Confirmation
        confirm: {
          yes: "Yes",
          no: "No"
        },

        // Variantes
        variants: {
          title: "🎭 Mod variants detected",
          description: "This mod contains multiple variants. Choose the one you want to install:",
          tip: "💡 <strong>Tip:</strong> The largest variant is usually the complete version of the mod.",
          install: "✅ Install variant",
          cancel: "❌ Cancel"
        }
      },

      // Menu contextuel images
      imageMenu: {
        copyUrl: "📋 Copy image URL",
        downloadForMod: "⬬ Download for a mod",
        openInBrowser: "🔗 Open image in browser",
        urlCopied: "📋 URL copied to clipboard!",
        selectMod: "📂 Select a mod",
        selectModDescription: "Choose the mod to download this image for:",
        search: "🔍 Search a mod...",
        downloading: "📥 Downloading for \"{{modName}}\"...",
        downloadSuccess: "✅ Image downloaded successfully for \"{{modName}}\"",
        downloadError: "❌ Error: {{error}}",
        downloadErrorGeneric: "❌ Error downloading image",
        noMods: "❌ No mods found in your configured folders",
        loadError: "❌ Error loading mods"
      },

      // Notifications générales
      notifications: {
        error: "Error",
        success: "Success",
        warning: "Warning",
        info: "Information"
      },

      // Erreurs communes
      errors: {
        generic: "An error occurred",
        notFound: "Not found",
        networkError: "Network error",
        fileError: "File error",
        permissionError: "Permission error"
      },

      // Formats de dates et nombres
      formats: {
        dateShort: "MM/DD/YYYY",
        dateLong: "MMMM D, YYYY",
        timeShort: "h:mm A",
        number: "1,234.56"
      }
    };
  }

  // ===== TRADUCTIONS FRANÇAISES =====
  async getFrenchTranslations() {
    return {
      // Navigation
      nav: {
        home: "Accueil",
        nexus: "Nexus",
        mods: "Mods",
        ayaka: "Ayaka",
        settings: "Paramètres"
      },

      // Page d'accueil
      home: {
        title: "🏡 Accueil – Derniers Mods Nexus",
        loading: "Chargement des derniers mods…",
        noApiKey: "⚠️ Clé API Nexus manquante.<br>Va dans Paramètres pour la renseigner !",
        noMods: "Aucun mod trouvé 😢",
        downloads: "Téléchargements",
        downloadBtn: "⬇️ Télécharger"
      },

      // Nexus
      nexus: {
        title: "🏠 Nexus Mods"
      },

      // Ayaka
      ayaka: {
        title: "💠 Ayaka Mods"
      },

      // Mods
      mods: {
        title: "🗂️ Mods Installés",
        loading: "Chargement des mods...",
        searchPlaceholder: "🔍 Rechercher un mod...",
        activeMods: "🟢 Mods activés",
        disabledMods: "🔴 Mods désactivés",
        active: "actifs",
        disabled: "désactivés",
        enable: "Activer",
        disable: "Désactiver",
        noResults: "Aucun mod trouvé",
        noResultsFor: 'pour "{{query}}"',
        searchNote: "(recherche dans les noms et les notes)",
        
        // Statistiques
        stats: {
          configured: "{{count}} actifs • {{disabled}} désactivés"
        },

        // Menu contextuel
        contextMenu: {
          openFolder: "📂 Ouvrir le dossier",
          addPreview: "🖼️ Ajouter une miniature",
          fixStructure: "🔧 Corriger la structure",
          editNote: "📝 Modifier la note",
          addNote: "📝 Ajouter une note",
          deleteNote: "🗑️ Supprimer la note",
          deleteMod: "🗑️ Supprimer ce mod"
        },

        // Notes
        notes: {
          title: "📝 Note pour<br><span>{{modName}}</span>",
          description: "Ajoutez vos commentaires personnels sur ce mod",
          placeholder: `Tapez votre note ici...
Exemples :
• Excellent mod, très bien fait
• Bug avec les textures parfois
• Version préférée : HD
• Compatible avec le mod XYZ`,
          charCount: "{{count}}/500 caractères",
          tips: {
            title: "💡 <strong>Astuces :</strong>",
            items: [
              "Notez la qualité du mod (⭐⭐⭐⭐⭐)",
              "Signalez les bugs ou problèmes",
              "Mentionnez les compatibilités",
              "Votre version préférée si variantes"
            ]
          },
          buttons: {
            cancel: "❌ Annuler",
            clear: "🗑️ Effacer",
            save: "💾 Sauvegarder"
          }
        },

        // Messages
        messages: {
          modEnabled: "Mod activé !",
          modDisabled: "Mod désactivé !",
          moveError: "Erreur lors du déplacement du mod !",
          noteAdded: "📝 Note sauvegardée !",
          noteDeleted: "🗑️ Note supprimée !",
          noteError: "❌ Erreur lors de la sauvegarde de la note",
          deleteError: "❌ Erreur lors de la suppression de la note",
          previewAdded: "Miniature ajoutée !",
          previewError: "Erreur lors de l'ajout",
          previewDownloaded: "Miniature téléchargée !",
          previewDownloadError: "Erreur lors du téléchargement",
          modDeleted: "Mod supprimé !",
          structureFixed: "✅ Structure corrigée pour \"{{modName}}\" !",
          structureOk: "ℹ️ Structure déjà correcte pour \"{{modName}}\"",
          structureAnalyzing: "🔧 Analyse de la structure en cours...",
          structureError: "❌ Erreur : {{error}}"
        }
      },

      // Settings
      settings: {
        title: "⚙️ Configuration",
        description: "Configurez vos dossiers, clés API et préférences",
        
        // Statistiques
        stats: {
          folders: "{{configured}} sur {{total}} dossiers configurés"
        },

        // Sections
        sections: {
          folders: {
            title: "📁 Dossiers",
            description: "Configuration des chemins vers vos dossiers de jeu et mods"
          },
          api: {
            title: "🔗 API & Connexion",
            description: "Configuration des clés API pour les services externes"
          },
          interface: {
            title: "🎨 Interface",
            description: "Personnalisation de l'interface utilisateur"
          }
        },

        // Dossiers
        folders: {
          gamePath: {
            title: "Dossier du jeu (SB-Win64-Shipping.exe)",
            placeholder: "Sélectionne le dossier du jeu…"
          },
          modsPath: {
            title: "Dossier ~mods (mods actifs)",
            placeholder: "Sélectionne le dossier ~mods…"
          },
          disabledModsPath: {
            title: "Dossier Mods désactivés",
            placeholder: "Sélectionne le dossier des mods désactivés…"
          },
          downloadsPath: {
            title: "Dossier de téléchargement des mods",
            placeholder: "Sélectionne où télécharger les mods…"
          }
        },

        // API
        api: {
          nexusKey: {
            title: "Clé API Nexus Mods",
            placeholder: "Collez votre clé API Nexus Mods ici...",
            help: "💡 <a href=\"https://www.nexusmods.com/users/myaccount?tab=api\" target=\"_blank\">Obtenir votre clé API Nexus Mods</a>"
          }
        },

        // Interface
        interface: {
          language: {
            title: "Langue de l'interface",
            info: "💡 La langue sélectionnée sera appliquée au prochain redémarrage de l'application"
          }
        },

        // Boutons
        buttons: {
          browse: "📂 Parcourir…",
          clear: "🗑️ Effacer",
          save: "💾 Sauvegarder",
          apply: "🔄 Appliquer",
          applyChange: "⚠️ Appliquer changement",
          applied: "✅ Appliqué",
          restart: "🚀 Redémarrer"
        },

        // Messages
        messages: {
          folderConfigured: "✅ Dossier {{folder}} configuré !",
          folderCleared: "🗑️ Dossier {{folder}} effacé",
          apiKeySaved: "🔑 Clé API Nexus sauvegardée !",
          apiKeyCleared: "🗑️ Clé API Nexus effacée",
          apiKeyInvalid: "⚠️ Veuillez saisir une clé API valide",
          languageChanged: "🌍 Langue changée vers {{language}} !",
          restartInfo: "🔄 <strong>Redémarrez l'application pour voir les changements</strong>",
          restartFeature: "🚀 Fonctionnalité de redémarrage à implémenter",
          restartConfirm: "Voulez-vous recharger l'application maintenant ?"
        },

        // Statuts
        status: {
          configured: "✅",
          notConfigured: "⚠️"
        }
      },

      // Launcher
      launcher: {
        launch: "Launch Stellar Blade",
        configure: "Configurer le jeu",
        launching: "Lancement",
        notConfigured: "⚠️ Chemin du jeu non configuré ! Allez dans Paramètres.",
        launched: "🎮 Stellar Blade lancé avec succès !",
        error: "❌ Impossible de lancer le jeu. Vérifiez le chemin dans les paramètres.",
        launchError: "❌ Erreur lors du lancement du jeu."
      },

      // Popups
      popups: {
        // Miniature
        thumbnail: {
          title: "🖼️ Miniature pour<br><span>{{modName}}</span>",
          chooseFile: "Choisir un fichier image",
          or: "OU",
          urlPlaceholder: "Colle l'URL d'une image (jpg/png/webp)",
          validate: "Valider",
          cancel: "Annuler"
        },

        // Confirmation
        confirm: {
          yes: "Oui",
          no: "Non"
        },

        // Variantes
        variants: {
          title: "🎭 Variantes de mod détectées",
          description: "Ce mod contient plusieurs variantes. Choisissez celle que vous souhaitez installer :",
          tip: "💡 <strong>Conseil :</strong> La variante la plus volumineuse est généralement la version complète du mod.",
          install: "✅ Installer la variante",
          cancel: "❌ Annuler"
        }
      },

      // Menu contextuel images
      imageMenu: {
        copyUrl: "📋 Copier l'URL de l'image",
        downloadForMod: "⬬ Télécharger pour un mod",
        openInBrowser: "🔗 Ouvrir l'image dans le navigateur",
        urlCopied: "📋 URL copiée dans le presse-papier !",
        selectMod: "📂 Sélectionner un mod",
        selectModDescription: "Choisissez le mod pour lequel télécharger cette image :",
        search: "🔍 Rechercher un mod...",
        downloading: "📥 Téléchargement en cours pour \"{{modName}}\"...",
        downloadSuccess: "✅ Image téléchargée avec succès pour \"{{modName}}\"",
        downloadError: "❌ Erreur : {{error}}",
        downloadErrorGeneric: "❌ Erreur lors du téléchargement de l'image",
        noMods: "❌ Aucun mod trouvé dans vos dossiers configurés",
        loadError: "❌ Erreur lors du chargement des mods"
      },

      // Notifications générales
      notifications: {
        error: "Erreur",
        success: "Succès",
        warning: "Attention",
        info: "Information"
      },

      // Erreurs communes
      errors: {
        generic: "Une erreur s'est produite",
        notFound: "Non trouvé",
        networkError: "Erreur réseau",
        fileError: "Erreur de fichier",
        permissionError: "Erreur de permission"
      },

      // Formats de dates et nombres
      formats: {
        dateShort: "DD/MM/YYYY",
        dateLong: "D MMMM YYYY",
        timeShort: "HH:mm",
        number: "1 234,56"
      }
    };
  }

  // Placeholder pour les autres langues (à implémenter)
  async getSpanishTranslations() { return this.getEnglishTranslations(); }
  async getGermanTranslations() { return this.getEnglishTranslations(); }
  async getItalianTranslations() { return this.getEnglishTranslations(); }
  async getPortugueseTranslations() { return this.getEnglishTranslations(); }
  async getRussianTranslations() { return this.getEnglishTranslations(); }
  async getJapaneseTranslations() { return this.getEnglishTranslations(); }
  async getKoreanTranslations() { return this.getEnglishTranslations(); }
  async getChineseTranslations() { return this.getEnglishTranslations(); }
}

// Instance globale
window.i18n = new I18nManager();

// Helper function pour simplifier l'usage
window.t = (key, params) => window.i18n.t(key, params);

// Export pour modules
window.I18nManager = I18nManager;