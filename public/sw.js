/* MistEra SMP service worker: shows system notifications (this is what makes them work on phones) and opens the right page when one is tapped. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Ready for server-sent push messages too (JSON: { title, body, url, tag }).
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { title: 'MistEra SMP', body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.title || 'MistEra SMP', {
    body: d.body || '', icon: '/favicon-192x192.png', badge: '/favicon-48x48.png', tag: d.tag || undefined, data: { url: d.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = (event.notification.data && event.notification.data.url) || '/';
  // same-site paths only
  const url = typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if (new URL(c.url).origin === self.location.origin) {
        await c.focus();
        if ('navigate' in c) { try { await c.navigate(url); } catch (e) { /* ignore */ } }
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
