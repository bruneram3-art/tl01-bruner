// Service Worker básico para permitir instalação PWA
self.addEventListener('install', (event) => {
    console.log('SW instalado');
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    // Apenas passa as requisições, necessário para o PWA ser válido
    event.respondWith(fetch(event.request));
});
