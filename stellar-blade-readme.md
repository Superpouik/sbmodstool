# 🚀 Stellar Blade Mod Manager

**Application Electron moderne pour gérer les mods de Stellar Blade**

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Electron](https://img.shields.io/badge/electron-^30.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-yellow.svg)

## 📋 Table des matières

- [🎯 Présentation](#-présentation)
- [✨ Fonctionnalités](#-fonctionnalités)
- [🏗️ Architecture](#️-architecture)
- [📁 Structure du projet](#-structure-du-projet)
- [🔧 Installation](#-installation)
- [⚙️ Configuration](#️-configuration)
- [📖 Utilisation](#-utilisation)
- [🧩 Modules détaillés](#-modules-détaillés)
- [🎨 Interface utilisateur](#-interface-utilisateur)
- [💾 Stockage des données](#-stockage-des-données)
- [🚀 Prochaines étapes](#-prochaines-étapes)
- [🤝 Contribution](#-contribution)

## 🎯 Présentation

Le **Stellar Blade Mod Manager** est une application desktop développée avec Electron qui permet de gérer facilement les mods du jeu Stellar Blade. L'application offre une interface moderne et intuitive pour télécharger, installer, organiser et configurer les mods.

### 🌟 Points forts
- **Interface moderne** avec design cyberpunk harmonisé
- **Gestion automatique** des téléchargements et extractions
- **Support multi-variants** avec détection intelligente
- **Intégration Nexus Mods** et Ayaka Mods
- **Système de notes** pour organiser ses mods
- **Menu contextuel images** pour télécharger directement
- **Correction automatique** de structure des mods

## ✨ Fonctionnalités

### 🏠 **Page d'accueil**
- **API Nexus Mods** : Affiche les derniers mods ajoutés
- **Téléchargement direct** depuis l'accueil
- **Statistiques** en temps réel
- **Navigation fluide** vers les mods

### 💠 **Navigateur Nexus/Ayaka**
- **Webview intégrée** pour naviguer sur les sites
- **Menu contextuel intelligent** sur les images
- **Téléchargement automatique** en arrière-plan
- **Barre de progression** visible dans la sidebar

### 🗂️ **Gestionnaire de mods**
- **Vue unifiée** des mods actifs/désactivés
- **Activation/désactivation** en un clic
- **Recherche avancée** (noms + notes)
- **Système de notes** personnel pour chaque mod
- **Menu contextuel** avec actions rapides
- **Aperçus/miniatures** automatiques

### 🎭 **Système de variantes intelligent**
- **Détection automatique** des mods modulaires
- **Interface simple** pour mods standards
- **Interface multi-sélection** pour mods complexes
- **Analyse des conflits** et recommandations
- **Installation fusionnée** des composants

### ⚙️ **Configuration complète**
- **Gestion des dossiers** (jeu, mods, téléchargements)
- **Clés API** (Nexus Mods)
- **Sélection de langue** (EN/FR + infrastructure i18n)
- **Interface harmonisée** avec le reste de l'app

### 🖼️ **Menu contextuel images**
- **Clic droit** sur n'importe quelle image web
- **Copie d'URL** vers le presse-papier
- **Téléchargement direct** pour un mod spécifique
- **Sélecteur de mod** avec recherche

### 🎮 **Lanceur de jeu**
- **Bouton de lancement** en bas de sidebar
- **Détection automatique** du statut de configuration
- **Animation et feedback** visuels

## 🏗️ Architecture

### **Stack technique**
- **Frontend** : HTML5, CSS3, JavaScript ES6+
- **Backend** : Node.js (Electron Main Process)
- **UI Framework** : Vanilla JS avec modules ES6
- **Styling** : CSS moderne avec variables et animations
- **Storage** : localStorage + système de fichiers

### **Pattern architectural**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Renderer      │    │   Main Process  │    │   File System   │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Mods/Data)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Modules JS    │    │   IPC Handlers  │    │   Archives      │
│   - home.js     │    │   - folders     │    │   - .zip/.rar   │
│   - mods.js     │    │   - downloads   │    │   - extraction  │
│   - settings.js │    │   - variants    │    │   - structure   │
│   - popup.js    │    │   - images      │    │   - notes       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Communication IPC**
L'application utilise l'IPC (Inter-Process Communication) d'Electron pour la communication entre le processus principal et le renderer :

```javascript
// Renderer → Main
window.electronAPI.methodName(params)

// Main → Renderer  
win.webContents.send('event-name', data)
```

## 📁 Structure du projet

```
stellar-blade-mod-manager/
├── 📄 main.js                 # Point d'entrée Electron
├── 📄 preload.js              # Script de préchargement sécurisé
├── 📄 package.json            # Configuration npm/Electron
├── 📄 package-lock.json       # Lockfile des dépendances
├── 📄 npmstart.bat           # Script de lancement rapide
├── 📄 icon.ico               # Icône de l'application
│
└── 📁 src/                    # Code source principal
    ├── 📄 index.html          # Page principale de l'app
    ├── 📄 index.js            # Logic principale du renderer
    ├── 📄 style.css           # Styles globaux harmonisés
    │
    └── 📁 modules/            # Modules fonctionnels
        ├── 📄 home.js         # Page d'accueil + API Nexus
        ├── 📄 nexus.js        # Webview Nexus + context menu
        ├── 📄 ayaka.js        # Webview Ayaka + context menu  
        ├── 📄 mods.js         # Gestionnaire de mods + notes
        ├── 📄 settings.js     # Configuration + sélection langue
        ├── 📄 popup.js        # Système de popups universel
        ├── 📄 multi-variant.js # Gestion mods modulaires
        ├── 📄 image-context.js # Menu contextuel images
        ├── 📄 launcher.js     # Bouton lancement jeu
        ├── 📄 i18n.js         # Système d'internationalisation
        └── 📄 debug-notes.js  # Outils de debug
```

## 🔧 Installation

### **Prérequis**
- Node.js 16+ 
- npm 8+
- Windows 10/11 (principalement testé)

### **Installation rapide**
```bash
# Cloner le projet
git clone [url-du-repo]
cd stellar-blade-mod-manager

# Installer les dépendances
npm install

# Lancer en mode développement
npm start
# ou utiliser le raccourci
npmstart.bat
```

### **Build pour production**
```bash
# Créer l'exécutable
npm run build
```

### **Dépendances principales**
- `electron` ^30.0.0 - Framework principal
- `extract-zip` ^2.0.1 - Extraction archives ZIP
- `node-7z` ^3.0.0 - Support 7z/RAR
- `rimraf` ^6.0.1 - Suppression de fichiers

## ⚙️ Configuration

### **Premier lancement**
1. **Aller dans Settings** (⚙️)
2. **Configurer les dossiers** :
   - Dossier du jeu (contient SB-Win64-Shipping.exe)
   - Dossier ~mods (mods actifs)
   - Dossier mods désactivés
   - Dossier de téléchargement
3. **Ajouter clé API Nexus** (optionnel pour la page d'accueil)
4. **Choisir la langue** (EN/FR)

### **Structure de dossiers recommandée**
```
📁 StellarBlade/
├── 📁 SB/                    # Installation du jeu
│   └── 📄 SB-Win64-Shipping.exe
├── 📁 ~mods/                 # Mods actifs (nom important !)
│   ├── 📁 ModA/
│   ├── 📁 ModB/
│   └── 📁 ModC/
├── 📁 ModsDisabled/          # Mods désactivés
│   ├── 📁 ModD/
│   └── 📁 ModE/
└── 📁 Downloads/             # Téléchargements
    ├── 📄 mod1.zip
    └── 📄 mod2.rar
```

## 📖 Utilisation

### **🏠 Navigation générale**
- **Sidebar** : Navigation entre les onglets
- **Barre de progression** : Visible sur l'onglet Nexus pendant les téléchargements
- **Notifications** : Coin supérieur droit pour les retours d'actions

### **💾 Téléchargement automatique**
1. Naviguer sur Nexus/Ayaka
2. **Clic droit sur une image** → Menu contextuel
3. "⬬ Télécharger pour un mod" → Sélecteur de mod
4. **Téléchargement + extraction automatiques**

### **🎭 Installation de variantes**
- **Mods simples** : Interface de sélection unique
- **Mods modulaires** : Interface multi-sélection avec :
  - Composants requis (automatiquement sélectionnés)
  - Composants recommandés (présélectionnés)
  - Détection de conflits
  - Installation fusionnée

### **📝 Gestion des notes**
- **Clic droit sur mod** → "📝 Ajouter/Modifier note"
- **Popup dédié** avec conseils et compteur de caractères
- **Recherche** inclut le contenu des notes
- **Sauvegarde automatique** dans localStorage

### **⚙️ Actions sur les mods**
```
Clic droit sur un mod :
├── 📂 Ouvrir le dossier
├── 🖼️ Ajouter miniature
├── 🔧 Corriger la structure
├── 📝 Modifier la note
├── 🗑️ Supprimer la note
└── 🗑️ Supprimer ce mod
```

## 🧩 Modules détaillés

### **🏠 home.js - Page d'accueil**
```javascript
// Fonctionnalités clés
- loadHomeWebview()           // Charge les derniers mods Nexus
- formatDownloads()           // Formatte les compteurs (1.2K, 5.4M)
- setupDownloadButtons()      // Gère les téléchargements directs
- createModCard()             // Génère les cartes de mods
```

### **🗂️ mods.js - Gestionnaire principal**
```javascript
// Classes et fonctions principales
- ModNotesManager             // Gestion complète des notes
  ├── getAllNotes()          // Récupère toutes les notes
  ├── saveNote()             // Sauvegarde une note
  ├── deleteNote()           // Supprime une note
  └── formatNotePreview()    // Formate pour affichage

- loadModsPage()              // Interface principale
- initializeSearch()          // Système de recherche
- filterMods()                // Filtrage en temps réel
- setupContextMenus()         // Menus clic droit
```

### **🎭 multi-variant.js - Système intelligent**
```javascript
// Classe principale
- MultiVariantManager
  ├── isModularMod()         // Détecte si mod modulaire
  ├── analyzeVariants()      // Analyse composants/conflits
  ├── checkConflicts()       // Vérifie sélection valide
  ├── installMultipleVariants() // Installation fusionnée
  └── showMultiVariantSelector() // Interface multi-sélection

// Fonction d'entrée unifiée
- showModVariantSelector()    // Auto-détection du type de mod
```

### **🖼️ image-context.js - Menu contextuel**
```javascript
// Fonctions principales
- openModSelector()           // Popup de sélection de mod
- downloadImageForMod()       // Téléchargement direct
- createModSelectorPopup()    // Interface de sélection
- populateModsList()          // Liste des mods avec recherche
```

### **📋 popup.js - Système universel**
```javascript
// Méthodes du système Popup
- askMiniature()              // Popup ajout miniature
- askNote()                   // Popup édition note (nouveau)
- askModVariant()             // Popup sélection variante simple
- askConfirm()                // Popup confirmation
- close()                     // Fermeture universelle
```

### **⚙️ settings.js - Configuration**
```javascript
// Configuration par sections
- createFolderCard()          // Cartes de configuration dossiers
- createApiCard()             // Carte clé API Nexus
- createLanguageCard()        // Sélecteur de langue
- updateSettingsStats()       // Mise à jour des statistiques
```

## 🎨 Interface utilisateur

### **Design system**
- **Couleur primaire** : `#48ffd3` (Cyan néon)
- **Couleur secondaire** : `#82eefd` (Bleu clair)
- **Couleur accent** : `#ff6b35` (Orange)
- **Couleur succès** : `#28d47b` (Vert)
- **Couleur erreur** : `#ff4343` (Rouge)

### **Composants harmonisés**
- **Headers** : Style uniforme pour tous les onglets
- **Cartes** : Design cohérent avec hover effects
- **Boutons** : Gradients et animations fluides
- **Popups** : Style moderne avec backdrop blur
- **Notifications** : Positionnement et animations uniformes

### **Animations et transitions**
- **Durée standard** : 0.2s - 0.3s
- **Easing** : `ease`, `ease-out`, `ease-in-out`
- **Transforms** : `translateY`, `scale`, `opacity`
- **Hover effects** : Élévation (`translateY(-2px)`)

### **Responsive design**
- **Breakpoints** : 768px (tablette), 480px (mobile)
- **Grid adaptatif** : `auto-fill` avec `minmax()`
- **Flex layouts** : Colonnes → Lignes sur mobile

## 💾 Stockage des données

### **localStorage**
```javascript
// Configuration
'game_path'              // Chemin du jeu
'mods_path'              // Dossier mods actifs
'disabled_mods_path'     // Dossier mods désactivés  
'downloads_path'         // Dossier téléchargements
'nexus_api_key'          // Clé API Nexus Mods
'app_language'           // Langue interface (en/fr)

// Notes des mods
'mod_notes'              // JSON: { "ModName": { text, created, lastUpdated } }
```

### **Système de fichiers**
```
📁 Mod Folder/
├── 📄 preview.jpg           # Miniature (ajoutée par l'app)
├── 📁 ~mods/                # Fichiers du mod (structure corrigée)
│   ├── 📄 file1.pak
│   └── 📄 file2.pak
└── 📄 [autres fichiers]     # Readme, docs, etc.
```

### **Structure des variantes**
```javascript
// Format des données de variantes
{
  name: "Variant Name",
  sizeBytes: 1024000,
  sizeFormatted: "1.0 MB", 
  gameFilesCount: 5,
  files: ["file1.pak", "file2.pak"]
}
```

## 🚀 Prochaines étapes

### **🔥 Priorité haute**
- [ ] **Support drag & drop** pour installation directe
- [ ] **Historique des installations** avec rollback
- [ ] **Système de backup** automatique des mods
- [ ] **Détection de conflits** entre mods actifs
- [ ] **Import/export** de configurations

### **📋 Fonctionnalités moyennes**
- [ ] **Thèmes customisables** (dark/light/cyberpunk)
- [ ] **Raccourcis clavier** pour actions fréquentes
- [ ] **Système de tags** pour organiser les mods
- [ ] **Notifications desktop** pour téléchargements
- [ ] **Auto-updater** pour l'application

### **🔧 Améliorations techniques**
- [ ] **Migration TypeScript** pour meilleure maintenance
- [ ] **Tests automatisés** (Jest/Playwright)
- [ ] **CI/CD pipeline** avec GitHub Actions
- [ ] **Logging système** avec rotation
- [ ] **Performance monitoring**

### **🌍 Internationalisation**
- [ ] **Traductions complètes** ES, DE, IT, PT, RU, JA, KO, ZH
- [ ] **Détection automatique** langue système
- [ ] **RTL support** pour langues arabes/hébraïques
- [ ] **Formats localisés** dates/nombres

### **📱 UX/UI**
- [ ] **Onboarding** pour nouveaux utilisateurs
- [ ] **Tooltips** interactifs pour fonctionnalités
- [ ] **Animations** d'état pour feedback visuel
- [ ] **Mode compact** pour petits écrans
- [ ] **Accessibilité** complète (ARIA, navigation clavier)

### **🔌 Intégrations**
- [ ] **Steam Workshop** support (si disponible)
- [ ] **ModDB** integration
- [ ] **Automatic mod updates** check
- [ ] **Community features** (ratings, comments)
- [ ] **Cloud sync** des configurations

## 🤝 Contribution

### **Architecture modulaire**
Le projet est conçu pour être facilement extensible :

```javascript
// Ajouter un nouveau module
📄 src/modules/nouveau-module.js
├── Export des fonctions principales
├── Gestion des événements
├── Interface utilisateur
└── Communication IPC si nécessaire

// L'inclure dans index.html
<script src="modules/nouveau-module.js"></script>
```

### **Standards de code**
- **Nommage** : camelCase pour JS, kebab-case pour CSS
- **Commentaires** : JSDoc pour fonctions importantes
- **Modularité** : Une fonctionnalité = Un module
- **Async/await** : Privilégier à Promise.then()

### **Workflow recommandé**
1. **Fork** du repository
2. **Branche feature** : `git checkout -b feature/nouvelle-fonctionnalite`
3. **Développement** avec tests locaux
4. **Pull Request** avec description détaillée

### **Architecture IPC**
Pour ajouter une nouvelle fonctionnalité backend :

```javascript
// 1. Dans main.js - Ajouter le handler IPC
ipcMain.handle('nouvelle-fonction', async (event, params) => {
  // Logique métier
  return result;
});

// 2. Dans preload.js - Exposer la fonction
contextBridge.exposeInMainWorld('electronAPI', {
  nouvelleFunction: (params) => ipcRenderer.invoke('nouvelle-fonction', params)
});

// 3. Dans le module JS - Utiliser la fonction
const result = await window.electronAPI.nouvelleFunction(params);
```

---

## 📞 Support

- **Issues** : GitHub Issues pour bugs et suggestions
- **Documentation** : Ce README + commentaires dans le code
- **Architecture** : Patterns Electron + modules ES6

---

**Créé avec ❤️ par Pouik x GPT**

*Version 1.0.0 - Stellar Blade Mod Manager*