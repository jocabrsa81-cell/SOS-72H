// Service worker: guarda a app inteira na instalação para funcionar sem Internet.
// Ao publicar uma nova versão, muda VERSION — a app avisa e atualiza com um toque.
const VERSION = 'sos72h-1.4.0';
const FILES = [
  './', './index.html', './manifest.webmanifest', './app.css',
  './app.js', './store.js', './i18n.js', './ui.js', './content.js', './maps.js',
  './screen-home.js', './screen-kit.js', './screen-family.js', './screen-guides.js',
  './screen-tools.js', './screen-vault.js', './screen-settings.js',
  './icon.svg', './icon-192.png', './icon-512.png', './icon-maskable-512.png',
];

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
