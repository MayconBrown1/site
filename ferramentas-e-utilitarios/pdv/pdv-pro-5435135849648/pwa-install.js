(() => {
  let deferredPrompt = null;
  const installId = 'btn-instalar-pdv-pro';

  function criarBotao() {
    if (document.getElementById(installId)) return;
    const style = document.createElement('style');
    style.textContent = `#${installId}{position:fixed;right:18px;bottom:18px;z-index:9999;border:1px solid #f3d778;border-radius:999px;background:#d4af37;color:#111;padding:12px 16px;font:700 14px Arial,sans-serif;box-shadow:0 8px 24px #0008;cursor:pointer;display:none}#${installId}:hover{filter:brightness(1.08);transform:translateY(-1px)}@media(max-width:640px){#${installId}{right:13px;bottom:13px;padding:11px 14px}}`;
    document.head.append(style);
    const button = document.createElement('button');
    button.id = installId;
    button.type = 'button';
    button.textContent = '⬇ Instalar PDV';
    button.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        button.style.display = 'none';
      } else {
        alert('No iPhone/iPad, toque em Compartilhar e escolha “Adicionar à Tela de Início”. Em outros navegadores, use a opção “Instalar aplicativo” do menu do navegador.');
      }
    });
    document.body.append(button);
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    criarBotao();
    document.getElementById(installId).style.display = 'block';
  });
  window.addEventListener('appinstalled', () => document.getElementById(installId)?.remove());
  window.addEventListener('DOMContentLoaded', () => {
    criarBotao();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.error);
    const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (isiOS && !standalone) document.getElementById(installId).style.display = 'block';
  });
})();
