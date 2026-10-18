// Service Worker de AgendaPro — notificaciones push
self.addEventListener('push', (event) => {
  let data = { title: 'AgendaPro', body: 'Tienes una notificación', url: '#/' }
  try {
    if (event.data) {
      data = Object.assign(data, event.data.json())
    }
  } catch (e) {
    // payload no JSON: usar texto plano
    try {
      data.body = event.data ? event.data.text() : data.body
    } catch (e2) {}
  }
  const options = {
    body: data.body,
    icon: '/logo.svg',
    badge: '/logo.svg',
    data: { url: data.url || '#/' },
    vibrate: [100, 50, 100],
  }
  event.waitUntil(self.registration.showNotification(data.title || 'AgendaPro', options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '#/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una pestaña abierta, enfocarla y navegar
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client && url.startsWith('/')) {
            // URL interna: recargar la app con el hash destino
            client.navigate(self.location.origin + '/' + url)
          }
          return
        }
      }
      // Si no hay pestaña abierta, abrir una nueva
      const target = url.startsWith('#') || url.startsWith('/') ? self.location.origin + '/' + url : url
      return self.clients.openWindow(target)
    })
  )
})

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
