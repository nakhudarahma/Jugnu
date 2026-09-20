/// <reference lib="webworker" />

const CACHE_NAME = 'jugnu-v2'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa.png',
]

// Install — cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch — cache-first for static assets, network-first for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Ignore non-http(s) requests and Vite dev server HMR / JS module requests
  if (!url.protocol.startsWith('http')) return
  if (
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/@react-refresh') ||
    url.pathname.includes('/node_modules/') ||
    url.search.includes('t=') ||
    url.search.includes('v=')
  ) {
    return
  }

  // API requests: network-first, fall back to cache
  if (url.pathname.startsWith('/api/') || url.pathname === '/health') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful GET API responses for offline
          if (event.request.method === 'GET' && response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(event.request)
          return cached || new Response(JSON.stringify({ offline: true, message: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        })
    )
    return
  }

  // Static assets: cache-first, fall back to network, fall back to offline index.html
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request)
        .then((response) => {
          if (response.ok && event.request.method === 'GET') {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(async () => {
          if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
            const indexCache = await caches.match('/index.html')
            if (indexCache) return indexCache
          }
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
        })
    })
  )
})

// Background sync trigger
self.addEventListener('sync', (event) => {
  if (event.tag === 'jugnu-sync') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SYNC_QUEUE' }))
      })
    )
  }
})
