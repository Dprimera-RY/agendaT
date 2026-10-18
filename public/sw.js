// Service Worker de AgendaT — notificaciones push
self.addEventListener('push', (event) => {
  let data = { title: 'AgendaT', body: 'Tienes una notificación', url: '#/' }
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
  event.waitUntil(self.registration.showNotification(data.title || 'AgendaT', options))
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

// ===== PWA: caché de la app (offline) y estáticos =====
const CACHE = 'agenda-v1'

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  let url
  try {
    url = new URL(req.url)
  } catch (e) {
    return
  }
  if (url.origin !== self.location.origin) return

  // Navegaciones (app SPA): red primero, caché como respaldo sin conexión
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/', copy)).catch(() => {})
          return res
        })
        .catch(() =>
          caches.match('/').then((cached) => cached || Response.error())
        )
    )
    return
  }

  // Estáticos del bundle, uploads e iconos: caché con actualización en background
  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/uploads/') ||
    url.pathname.startsWith('/icon-') ||
    url.pathname === '/apple-touch-icon.png' ||
    url.pathname === '/logo.png' ||
    url.pathname === '/logo.svg' ||
    url.pathname === '/manifest.json'

  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
            }
            return res
          })
          .catch(() => cached || Response.error())
        return cached || network
      })
    )
  }
})

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
