// Service worker: guarda a app inteira na instalação para funcionar sem Internet.
// A versão e a lista de ficheiros são geradas em cada publicação (build.mjs): não é preciso mudar nada à mão.
const VERSION = 'sos72h-dev'; // gerado pelo build.mjs
const FILES = ['./', './index.html']; // a lista completa é gerada pelo build.mjs

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Alertas: nunca da cache (a app guarda a última verificação por conta própria).
  if (new URL(req.url).pathname.endsWith('/alerts.json')) return;
  // Páginas: se falhar a rede e não houver cópia, devolve a app. Outros ficheiros: só da cache.
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then(hit => hit || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  })));
});
