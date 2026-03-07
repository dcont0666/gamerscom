// GamersCom Service Worker v7
// Estrategia: Network First para app, Cache First para assets estáticos

const CACHE_NAME = 'gamerscom-v7';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './terminos.html',
  './privacidad.html'
];

// ===== INSTALL =====
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ===== ACTIVATE — limpiar caches viejas =====
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ===== FETCH — Network First con fallback a cache =====
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // No interceptar Firebase, CDNs ni APIs externas
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('firebaseio') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('dicebear') ||
    url.hostname.includes('fonts.googleapis') ||
    url.protocol === 'chrome-extension:'
  ) return;

  // Solo GET
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Cache respuestas exitosas de nuestro dominio
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Sin red — servir desde cache
        return caches.match(e.request)
          .then(cached => cached || caches.match('./index.html'));
      })
  );
});

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', e => {
  let data = { title: 'GamersCom', body: 'Tienes un nuevo mensaje 🎮', icon: './icon-192.png' };
  try { data = { ...data, ...e.data.json() }; } catch(_) {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || './icon-192.png',
      badge: './icon-192.png',
      vibrate: [100, 50, 100],
      data: { url: data.url || './' },
      actions: [
        { action: 'open', title: '📨 Ver mensaje' },
        { action: 'close', title: 'Cerrar' }
      ]
    })
  );
});

// ===== NOTIFICATION CLICK =====
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'close') return;
  const url = e.notification.data?.url || './';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        const existing = windowClients.find(c => c.url.includes('gamerscom') && 'focus' in c);
        if (existing) return existing.focus();
        return clients.openWindow(url);
      })
  );
});

// ===== BACKGROUND SYNC (para cuando vuelva la conexión) =====
self.addEventListener('sync', e => {
  if (e.tag === 'sync-messages') {
    // Mensajes pendientes se enviarán cuando regrese la conexión
    e.waitUntil(Promise.resolve());
  }
});
