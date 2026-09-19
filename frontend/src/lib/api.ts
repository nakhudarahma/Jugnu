/**
 * Offline-first API client.
 *
 * - Reads always hit localStorage first (instant, works offline).
 * - Writes go to localStorage immediately AND are queued for backend sync.
 * - When online, the queue flushes automatically.
 * - When offline, queued writes are retried on next connectivity event.
 */

import { enqueue, getQueue, removeEntry, incrementRetry } from './syncQueue'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const TOKEN_KEY = 'jugnu.access_token'
const REFRESH_KEY = 'jugnu.refresh_token'

// ─── Token helpers ───────────────────────────────────────────────────────────

function getAccessToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
function getRefreshToken(): string | null {
  try { return localStorage.getItem(REFRESH_KEY) } catch { return null }
}
export function setTokens(access: string, refresh: string) {
  try {
    localStorage.setItem(TOKEN_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  } catch { /* private mode */ }
}
export function clearTokens() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
  } catch { /* ignore */ }
}
export function isAuthenticated(): boolean {
  return !!getAccessToken()
}

// ─── Online status ───────────────────────────────────────────────────────────

let _online = typeof navigator !== 'undefined' ? navigator.onLine : true
export function isOnline(): boolean { return _online }

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { _online = true })
  window.addEventListener('offline', () => { _online = false })
}

// ─── Backend health check ────────────────────────────────────────────────────

export async function checkBackend(): Promise<boolean> {
  try {
    const res = await fetch('/health', { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

// ─── API Error ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number
  data: unknown
  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

// ─── Token refresh ───────────────────────────────────────────────────────────

async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh) return false
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    })
    if (!res.ok) return false
    const data = await res.json()
    if (data.success && data.data?.accessToken) {
      setTokens(data.data.accessToken, data.data.refreshToken || refresh)
      return true
    }
    return false
  } catch {
    return false
  }
}

// ─── Core fetch ──────────────────────────────────────────────────────────────

export async function rawFetch<T>(path: string, opts: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...init } = opts
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> || {}),
  }
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  const token = getAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    body: json !== undefined ? JSON.stringify(json) : init.body,
  })

  if (res.status === 401 && token) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      const newToken = getAccessToken()
      if (newToken) headers['Authorization'] = `Bearer ${newToken}`
      const retry = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers,
        body: json !== undefined ? JSON.stringify(json) : init.body,
      })
      if (!retry.ok) {
        const err = await retry.json().catch(() => ({ error: retry.statusText }))
        throw new ApiError(retry.status, err.error || err.message || 'Request failed', err)
      }
      const body = await retry.json()
      return body.data as T
    }
    clearTokens()
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(res.status, err.error || err.message || 'Request failed', err)
  }

  const body = await res.json()
  return body.data as T
}

// ─── Queue flush ─────────────────────────────────────────────────────────────

let _flushing = false

export async function flushQueue(): Promise<void> {
  if (_flushing || !navigator.onLine) return
  _flushing = true
  try {
    const queue = getQueue()
    for (const entry of queue) {
      try {
        await rawFetch(entry.path, {
          method: entry.method,
          json: entry.body,
        })
        removeEntry(entry.id)
      } catch {
        const canRetry = incrementRetry(entry.id)
        if (!canRetry) {
          // dropped after max retries
        }
        break // stop flushing on first error to preserve order
      }
    }
  } finally {
    _flushing = false
  }
}

// Listen for connectivity changes → flush queue
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setTimeout(flushQueue, 500) // small delay to let connection stabilize
  })
}

// ─── Public API ──────────────────────────────────────────────────────────────

interface ApiOptions extends RequestInit {
  json?: unknown
}

/**
 * Online: sends request to backend.
 * Offline: queues for later sync.
 * 
 * For GET requests when offline, returns null (caller should use local data).
 */
export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T | null> {
  const method = (opts.method || 'GET').toUpperCase()

  // GET requests: try backend, fall through to null if offline
  if (method === 'GET') {
    if (!navigator.onLine) return null
    return rawFetch<T>(path, opts)
  }

  // Write operations (POST/PATCH/DELETE): queue and execute
  const entry = enqueue({ method: method as 'POST' | 'PATCH' | 'DELETE', path, body: opts.json })

  if (navigator.onLine) {
    try {
      const result = await rawFetch<T>(path, opts)
      removeEntry(entry.id)
      return result
    } catch {
      // failed but already queued, will retry later
      return null
    }
  }

  // Offline — queued, will sync when online
  return null
}
