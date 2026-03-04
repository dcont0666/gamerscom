const CACHE_NAME = 'gamerscom-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // Activar inmediatamente sin esperar
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // Tomar control de todas las pestañas
});

self.addEventListener('fetch', e => {
  // Siempre buscar versión nueva en la red primero, caché como respaldo
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Guardar copia nueva en caché
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        return response;
      })
      .catch(() => caches.match(e.request)) // Si no hay internet, usar caché
  );
});

// Notificar a la app cuando hay una nueva versión
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
