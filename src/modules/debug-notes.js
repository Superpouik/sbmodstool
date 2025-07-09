// Script de debug pour identifier les problèmes avec le système de notes

console.log('🔧 Script de debug notes chargé');

// Test des fonctions après chargement complet
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 DOM chargé, test des composants...');
  
  setTimeout(() => {
    // Test 1: Popup
    console.log('📝 window.Popup:', window.Popup);
    console.log('📝 Popup.askNote:', window.Popup?.askNote);
    
    // Test 2: Fonction disponible
    if (window.Popup && typeof window.Popup.askNote === 'function') {
      console.log('✅ Popup.askNote est disponible');
    } else {
      console.error('❌ Popup.askNote n\'est PAS disponible');
    }
    
    // Test 3: Élément mods
    const modsContent = document.getElementById('mods-content');
    console.log('🗂️ mods-content trouvé:', !!modsContent);
    
    // Test 4: Event listeners
    const contextMenus = document.querySelectorAll('.context-menu');
    console.log('📋 Menus contextuels trouvés:', contextMenus.length);
    
    // Test 5: Boutons de notes
    const noteButtons = document.querySelectorAll('[data-action="edit-note"]');
    console.log('📝 Boutons notes trouvés:', noteButtons.length);
    
  }, 2000);
});

// Fonction de test manuel
window.testNoteSystem = function() {
  console.log('🧪 Test manuel du système de notes...');
  
  if (window.Popup && window.Popup.askNote) {
    console.log('✅ Tentative d\'ouverture popup note...');
    
    try {
      window.Popup.askNote('Test Mod', 'Note de test existante', (result) => {
        console.log('📊 Résultat test:', result);
      });
      console.log('✅ Popup note ouvert avec succès');
    } catch (error) {
      console.error('❌ Erreur ouverture popup:', error);
    }
  } else {
    console.error('❌ Popup.askNote non disponible pour le test');
  }
};

console.log('💡 Tape "testNoteSystem()" dans la console pour tester manuellement');