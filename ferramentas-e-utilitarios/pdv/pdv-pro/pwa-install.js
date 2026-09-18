(() => {
  let deferredPrompt = null;
  const installId = 'btn-instalar-pdv-pro';
  const statusId = 'pdv-conexao-status';

  function atualizarStatus({ pending = false, message = '' } = {}) {
    const status = document.getElementById(statusId);
    if (!status) return;
    const offline = !navigator.onLine;
    status.dataset.state = offline ? 'offline' : (pending ? 'pending' : 'online');
    status.textContent = message || (offline
      ? '● Sem internet · dados salvos neste aparelho'
      : pending ? '↻ Online · sincronizando dados…' : '● Online · dados sincronizados');
    status.title = offline
      ? 'Continue usando o PDV normalmente. As alterações serão enviadas quando a internet voltar.'
      : 'Situação da conexão e da sincronização com o Firebase.';
  }

  function criarBotao() {
    if (document.getElementById(installId)) return;
    const style = document.createElement('style');
    style.textContent = `#${installId}{position:fixed;right:18px;bottom:18px;z-index:9999;border:1px solid #f3d778;border-radius:999px;background:#d4af37;color:#111;padding:12px 16px;font:700 14px Arial,sans-serif;box-shadow:0 8px 24px #0008;cursor:pointer;display:none}#${installId}:hover{filter:brightness(1.08);transform:translateY(-1px)}#${statusId}{position:fixed;left:18px;bottom:18px;z-index:9998;border:1px solid #86efac;border-radius:999px;background:#ecfdf5;color:#166534;padding:9px 13px;font:700 12px Arial,sans-serif;box-shadow:0 6px 18px #0003;pointer-events:none}#${statusId}[data-state="offline"]{border-color:#fbbf24;background:#fffbeb;color:#92400e}#${statusId}[data-state="pending"]{border-color:#7dd3fc;background:#f0f9ff;color:#075985}@media(max-width:640px){#${installId}{right:13px;bottom:13px;padding:11px 14px}#${statusId}{left:13px;bottom:13px;max-width:calc(100vw - 150px);padding:8px 10px}}`;
    document.head.append(style);
    const status = document.createElement('div');
    status.id = statusId;
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    document.body.append(status);
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
    atualizarStatus();
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    criarBotao();
    document.getElementById(installId).style.display = 'block';
  });
  window.addEventListener('appinstalled', () => document.getElementById(installId)?.remove());
  window.addEventListener('online', () => atualizarStatus({ pending: true }));
  window.addEventListener('offline', () => atualizarStatus());
  window.addEventListener('pdv-sync-status', event => atualizarStatus(event.detail || {}));
  window.addEventListener('DOMContentLoaded', () => {
    criarBotao();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.error);
    const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (!standalone) document.getElementById(installId).style.display = 'block';
  });
})();
