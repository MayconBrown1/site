const CACHE_NAME = 'pdv-pro-v56';
const APP_SHELL = [
  '/', '/login', '/cadastro', '/admin', '/favicon.svg', '/catalogo/', '/catalogo/catalogo.css', '/catalogo/catalogo.js', '/catalogo-admin.js', '/clientes-financeiro.js', '/operator-admin.js', '/manifest.json', '/pwa-install.js', '/pdv-cloud.js', '/auth.js', '/firebase-config.js',
  '/assets/temas/pet-shop.webp', '/assets/temas/adega.webp', '/assets/temas/conveniencia.webp', '/assets/temas/doceria.webp', '/assets/temas/hortifruti.webp',
  '/assets/temas/grafica-tecnologia.webp', '/assets/temas/informatica.webp', '/assets/temas/futurista.webp', '/assets/temas/neon-laranja.webp', '/assets/temas/neon-verde.webp',
  '/assets/temas/borracharia.webp', '/assets/temas/oficina-motos.webp', '/assets/temas/oficina-carros.webp', '/assets/temas/autopecas.webp', '/assets/temas/mercado.webp',
  '/assets/temas/moda.webp', '/assets/temas/beleza.webp', '/assets/temas/material-construcao.webp', '/assets/temas/papelaria.webp', '/assets/temas/farmacia.webp'
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
const ROTAS_CANONICAS = new Map([
  ['/', '/'], ['/index.html', '/'],
  ['/login', '/login'], ['/login.html', '/login'],
  ['/cadastro', '/cadastro'], ['/cadastro.html', '/cadastro'],
  ['/admin', '/admin'], ['/admin.html', '/admin'],
  ['/catalogo', '/catalogo/'], ['/catalogo/', '/catalogo/'], ['/catalogo/index.html', '/catalogo/']
]);

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

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request);
        if (response?.ok) {
          const cache = await caches.open(CACHE_NAME);
          const rotaCanonica = ROTAS_CANONICAS.get(url.pathname) || url.pathname;
          await cache.put(rotaCanonica, response.clone());
        }
        return response;
      } catch (_) {
        const rotaCanonica = ROTAS_CANONICAS.get(url.pathname);
        const cached = await caches.match(event.request)
          || (rotaCanonica ? await caches.match(rotaCanonica) : null)
          || await caches.match('/');
        return cached || new Response('PDV temporariamente indisponível. Conecte-se à internet e tente novamente.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })());
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => {
    if (cached) return cached;
    return fetch(event.request).then((response) => {
      if (response?.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => Response.error());
  }));
});
