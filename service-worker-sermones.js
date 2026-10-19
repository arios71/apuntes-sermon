const CACHE_NAME = 'apuntes-sermones-offline-v2';
const CORE_FILES = [
  './plantilla_apuntes_sermon_biblioteca_en_linea.html',
  './manifest-sermones-offline.webmanifest',
  './icono-sermones-offline.svg'
];
const SUPABASE_SCRIPT = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_FILES);
    try {
      const request = new Request(SUPABASE_SCRIPT, { mode: 'no-cors', cache: 'reload' });
      const response = await fetch(request);
      await cache.put(request, response);
    } catch (_) {
      // La plantilla y el guardado local siguen disponibles aunque el CDN falle.
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('apuntes-sermones-offline-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.href.startsWith('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request) || await cache.match(SUPABASE_SCRIPT);
      if (cached) {
        if (self.navigator && self.navigator.onLine) {
          fetch(request).then(response => {
            if (response.ok || response.type === 'opaque') cache.put(request, response.clone()).catch(() => {});
          }).catch(() => {});
        }
        return cached;
      }
      try {
        const response = await fetch(request);
        if (response.ok || response.type === 'opaque') cache.put(request, response.clone()).catch(() => {});
        return response;
      } catch (_) {
        return new Response('Supabase no está disponible sin conexión.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
      return response;
    } catch (_) {
      if (request.mode === 'navigate') {
        return await cache.match('./plantilla_apuntes_sermon_biblioteca_en_linea.html') ||
          new Response('Sin conexión. Abre la aplicación instalada después de haberla cargado al menos una vez con internet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
      return new Response('', { status: 503 });
    }
  })());
});