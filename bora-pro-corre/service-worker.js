// =====================================================
// BORA PRO CORRE — Service Worker
// Cacheia o app shell (HTML/CSS/JS estáticos) para abrir rápido
// e funcionar minimamente offline. Dados do Firestore NUNCA são
// cacheados aqui — eles sempre vêm em tempo real da rede.
// =====================================================

const CACHE_NOME = "bpc-shell-v1";

const ARQUIVOS_SHELL = [
  "/index.html",
  "/login.html",
  "/cadastro-loja.html",
  "/cadastro-entregador.html",
  "/manifest.json",
  "/css/style.css",
  "/css/responsive.css",
  "/js/firebase-config.js",
  "/js/auth.js",
  "/js/permissions.js",
  "/js/utils.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NOME).then((cache) => cache.addAll(ARQUIVOS_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(
        chaves
          .filter((chave) => chave !== CACHE_NOME)
          .map((chave) => caches.delete(chave))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Nunca interceptar chamadas ao Firebase (Auth/Firestore/Storage) —
  // essas precisam sempre ir direto pra rede, nunca cache.
  if (
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("firebasestorage.app") ||
    url.hostname.includes("gstatic.com")
  ) {
    return;
  }

  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((respostaCache) => {
      return (
        respostaCache ||
        fetch(event.request)
          .then((respostaRede) => {
            const clone = respostaRede.clone();
            caches.open(CACHE_NOME).then((cache) => cache.put(event.request, clone));
            return respostaRede;
          })
          .catch(() => caches.match("/index.html"))
      );
    })
  );
});
