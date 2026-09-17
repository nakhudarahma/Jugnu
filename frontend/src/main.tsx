import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AppProvider } from '@/state/AppContext'
import { flushQueue } from '@/lib/api'
import './index.css'

// Service worker: only run in production to prevent stale React chunk caching in dev mode
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister()
      }
    })
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* sw registration failed */ })
    })
  }
}

// Listen for sync messages from service worker
window.addEventListener('message', (event) => {
  if (event.data?.type === 'SYNC_QUEUE') {
    flushQueue()
  }
})

// Flush pending sync queue on startup if online
if (navigator.onLine) {
  flushQueue()
}

const root = document.getElementById('root')
if (!root) throw new Error('Jugnu could not find its root element.')

createRoot(root).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)
