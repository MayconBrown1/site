let deferredPrompt;
const installButton = document.createElement('button');

// Estilo do botão flutuante
installButton.innerText = '📲 Instalar App';
installButton.style.position = 'fixed';
installButton.style.bottom = '20px';
installButton.style.right = '20px';
installButton.style.padding = '12px 18px';
installButton.style.background = 'linear-gradient(45deg, #9a4dff, #ff2ebd)';
installButton.style.color = '#fff';
installButton.style.border = 'none';
installButton.style.borderRadius = '50px';
installButton.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
installButton.style.fontWeight = '600';
installButton.style.cursor = 'pointer';
installButton.style.zIndex = '9999';
installButton.style.display = 'none';

document.body.appendChild(installButton);

// Detecta quando o PWA pode ser instalado
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installButton.style.display = 'block';
});

// Ao clicar no botão, mostra o prompt de instalação
installButton.addEventListener('click', async () => {
  installButton.style.display = 'none';
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('Usuário instalou o app');
    } else {
      console.log('Usuário cancelou a instalação');
    }
    deferredPrompt = null;
  }
});

// Oculta o botão se o app já estiver instalado
window.addEventListener('appinstalled', () => {
  installButton.style.display = 'none';
  console.log('App já instalado');
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('Service Worker registrado com sucesso!'))
    .catch(err => console.log('Erro ao registrar o Service Worker:', err));
}
