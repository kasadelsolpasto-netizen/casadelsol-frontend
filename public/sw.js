// ============================================================
// KASA DEL SOL — Service Worker para Web Push Notifications
// Este archivo DEBE estar en /public/sw.js para que funcione.
// ============================================================

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: 'Kasa del Sol',
      body: event.data.text(),
    };
  }

  const title = payload.title || 'Kasa del Sol';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/api/brand/icon?v=1',
    badge: payload.badge || '/api/brand/icon?v=1',
    tag: payload.tag || 'kasa-notification',
    // Vibración intensa para urgencia (solo Android)
    vibrate: payload.urgency === 'high'
      ? [300, 100, 300, 100, 300, 100, 600]  // patrón urgente
      : [200, 100, 200],                        // patrón normal
    // Datos para el click handler
    data: {
      url: payload.url || '/',
    },
    // Acciones del botón (solo Android / algunos navegadores)
    actions: payload.url
      ? [{ action: 'open', title: '👉 Abrir' }]
      : [],
    requireInteraction: payload.urgency === 'high', // No desaparece hasta que el user interactúa
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Al hacer click en la notificación → abrir/enfocar la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';
  const fullUrl = self.location.origin + targetUrl;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta con la app, enfocamos esa
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(fullUrl);
          return client.focus();
        }
      }
      // Si no hay ninguna ventana abierta, abrimos una nueva
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});

// Instalación y activación del SW
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
