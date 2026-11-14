// Service worker: permite usar la app sin internet (red primero, caché como respaldo).
const CACHE = 'faczil-v1';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css',
  'js/utils.js', 'js/db.js', 'js/ui.js', 'js/app.js',
  'js/views/panel.js', 'js/views/vender.js', 'js/views/ventas.js', 'js/views/productos.js',
  'js/views/clientes.js', 'js/views/caja.js', 'js/views/config.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/mascota.svg', 'icons/qr-ejemplo.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
  );
});
