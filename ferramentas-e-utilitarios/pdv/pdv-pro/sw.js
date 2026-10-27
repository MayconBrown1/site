const CACHE_NAME = 'pdv-pro-v64';
const CATALOG_ICON_CACHE = 'pdv-catalog-icons-v1';
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

function corManifestoCatalogo(valor, padrao) {
  return /^#[0-9a-f]{6}$/i.test(String(valor || '')) ? String(valor).toLowerCase() : padrao;
}

function criarManifestoCatalogo(url) {
  const slug = String(url.searchParams.get('loja') || '');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 50) return null;
  const nome = String(url.searchParams.get('nome') || 'Catálogo')
    .replace(/[\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'Catálogo';
  const caminhoInicial = `/catalogo/?loja=${encodeURIComponent(slug)}`;
  const baseIcone = `/catalogo/icones/${slug}`;
  return {
    id: caminhoInicial,
    name: nome,
    short_name: nome.slice(0, 30),
    description: `Catálogo online de ${nome}`,
    lang: 'pt-BR',
    start_url: caminhoInicial,
    scope: '/catalogo/',
    display: 'standalone',
    orientation: 'portrait-primary',
    theme_color: corManifestoCatalogo(url.searchParams.get('cor'), '#0f4c81'),
    background_color: corManifestoCatalogo(url.searchParams.get('fundo'), '#ffffff'),
    icons: [
      { src: `${baseIcone}-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: `${baseIcone}-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ]
  };
}

function responderManifestoCatalogo(url) {
  const manifesto = criarManifestoCatalogo(url);
  if (!manifesto) return new Response('Catálogo inválido.', { status: 400 });
  return new Response(JSON.stringify(manifesto), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(async (cache) => {
    await cache.addAll(APP_SHELL);
    // Um CDN temporariamente indisponível não pode impedir a instalação do PDV.
    await Promise.allSettled(REMOTE_SHELL.map((url) => cache.add(url)));
  }));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const cachesPreservados = new Set([CACHE_NAME, CATALOG_ICON_CACHE]);
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => !cachesPreservados.has(key)).map((key) => caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin && !TRUSTED_REMOTE_ORIGINS.has(url.origin)) return;

  if (url.origin === self.location.origin && url.pathname === '/catalogo/manifest.webmanifest') {
    event.respondWith(Promise.resolve(responderManifestoCatalogo(url)));
    return;
  }

  if (url.origin === self.location.origin && /^\/catalogo\/icones\/[a-z0-9-]+-(?:192|512)\.png$/.test(url.pathname)) {
    event.respondWith(caches.open(CATALOG_ICON_CACHE).then(async cache => {
      const icone = await cache.match(url.pathname);
      return icone || fetch(event.request);
    }));
    return;
  }

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
