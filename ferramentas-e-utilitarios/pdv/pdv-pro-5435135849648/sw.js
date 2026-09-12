const CACHE_NAME = 'pdv-pro-v34';
const APP_SHELL = [
  './', './index.html', './login.html', './cadastro.html', './admin.html', './favicon.svg', './catalogo/', './catalogo/index.html', './catalogo/catalogo.css', './catalogo/catalogo.js', './catalogo-admin.js', './clientes-financeiro.js', './operator-admin.js', './manifest.json', './pwa-install.js', './pdv-cloud.js', './auth.js', './firebase-config.js',
  './assets/temas/pet-shop.webp', './assets/temas/adega.webp', './assets/temas/conveniencia.webp', './assets/temas/doceria.webp', './assets/temas/hortifruti.webp',
  './assets/temas/grafica-tecnologia.webp', './assets/temas/informatica.webp', './assets/temas/futurista.webp', './assets/temas/neon-laranja.webp', './assets/temas/neon-verde.webp'
];
const REMOTE_SHELL = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js'
];
const TRUSTED_REMOTE_ORIGINS = new Set(['https://cdn.tailwindcss.com', 'https://cdnjs.cloudflare.com', 'https://www.gstatic.com']);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(async (cache) => {
    await cache.addAll(APP_SHELL);
    // Um CDN temporariamente indisponível não pode impedir a instalação do PDV.
    await Promise.allSettled(REMOTE_SHELL.map((url) => cache.add(url)));
  }));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin && !TRUSTED_REMOTE_ORIGINS.has(url.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
      if (cached) return cached;
      return network.catch(async () => {
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});
