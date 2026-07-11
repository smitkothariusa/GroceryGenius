// Kill switch: this file replaces the old cache-first-forever service
// worker. Any browser that still has that old worker installed will fetch
// this file directly (service worker script fetches are never intercepted
// by the worker's own fetch handler, so this always reaches the network),
// see it differs byte-for-byte, and install it as an update.
//
// Its only job is to remove itself: clear every cache, unregister, and
// force open tabs to reload for real. Once every client has picked this
// up, no service worker controls the origin anymore — safe to delete
// this file in a future release.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      await self.registration.unregister();
      const clientsList = await self.clients.matchAll({ type: 'window' });
      clientsList.forEach((client) => client.navigate(client.url));
    })()
  );
});
