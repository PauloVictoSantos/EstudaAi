// Service Worker: imagens das questões em cache-first (são imutáveis), páginas em stale-while-revalidate,
// demais chamadas de API sempre pela rede.
const CACHE = 'estudaai-v2', IMAGES = 'estudaai-img-v1';
const SHELL = ['/progresso', '/manifest.json'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== IMAGES).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/images/')) {
    e.respondWith(caches.open(IMAGES).then(async c => (await c.match(e.request)) || fetch(e.request).then(res => { if (res.ok) c.put(e.request, res.clone()); return res; })));
    return;
  }
  if (url.pathname.startsWith('/api/')) { e.respondWith(fetch(e.request).catch(() => caches.match(e.request).then(r => r || new Response('{"error":"OFFLINE"}', { status: 503, headers: { 'content-type': 'application/json' } })))); return; }
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then(res => { if (res.ok) c.put(e.request, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
