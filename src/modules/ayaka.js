window.loadAyakaWebview = function() {
  const ayakaDiv = document.getElementById('ayaka-webview');
  ayakaDiv.innerHTML = '';
  const webview = document.createElement('webview');
  webview.src = 'https://ayakamods.cc/games/stellar-blade.6/';
  webview.style.width = '100%';
  webview.style.height = '700px';
  webview.setAttribute('allowpopups', '');
  webview.setAttribute('webpreferences', 'nativeWindowOpen=yes');
  ayakaDiv.appendChild(webview);
};
if(document.querySelector('#tab-ayaka').classList.contains('active')) {
  window.loadAyakaWebview();
}
