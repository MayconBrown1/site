const CACHE_NAME = "qrcode-app-cache-v1";
const urlsToCache = [
  "./",
  "./index.html",
  "./manifest.json",
  "./app-install.js",
  "./libs/qrcode.min.js",
  "./libs/jspdf.umd.min.js",
  "./libs/tailwind.min.js",
  "./img/gerar-qrcode.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});
