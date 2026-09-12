const CACHE_NAME = 'pdv-pro-v32';
const APP_SHELL = [
  './', './index.html', './login.html', './cadastro.html', './admin.html', './favicon.svg', './catalogo/', './catalogo/index.html', './catalogo/catalogo.css', './catalogo/catalogo.js', './catalogo-admin.js', './clientes-financeiro.js', './operator-admin.js', './manifest.json', './pwa-install.js', './pdv-cloud.js', './auth.js', './firebase-config.js',
  './assets/temas/pet-shop.webp', './assets/temas/adega.webp', './assets/temas/conveniencia.webp', './assets/temas/doceria.webp', './assets/temas/hortifruti.webp',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
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
  if (url.origin !== self.location.origin && !APP_SHELL.includes(url.href)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
