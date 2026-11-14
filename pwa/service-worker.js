const CACHE_NAME = 'cuaderno-de-notas-shell-v3';
const CORE_FILES = ['./index.html','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
const SUPABASE_SCRIPT = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_FILES);
    try {
      const request = new Request(SUPABASE_SCRIPT, { mode: 'no-cors', cache: 'reload' });
      const response = await fetch(request);
      await cache.put(request, response);
    } catch (_) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('cuaderno-de-notas-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.href.startsWith(SUPABASE_SCRIPT)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request) || await cache.match(SUPABASE_SCRIPT);
      if (cached) {
        fetch(request).then(response => {
          if (response.ok || response.type === 'opaque') cache.put(request, response.clone()).catch(() => {});
        }).catch(() => {});
        return cached;
      }
      try {
        const response = await fetch(request);
        if (response.ok || response.type === 'opaque') cache.put(request, response.clone()).catch(() => {});
        return response;
      } catch (_) {
        return new Response('La biblioteca en línea no está disponible sin conexión.', {status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
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
      if (request.mode === 'navigate') return await cache.match('./index.html') || new Response('Abre Cuaderno de notas con conexión al menos una vez para instalar sus archivos.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
      return new Response('',{status:503});
    }
  })());
});