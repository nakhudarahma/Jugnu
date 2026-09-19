import type { AppState } from '@/types'

/**
 * Jugnu is device-local. Each account owns its own space (patient profile,
 * memories, circle, routines) stored under its own key, and a tiny session
 * record says who is currently signed in. Accounts never share a space.
 */
const SESSION_KEY = 'jugnu.session.v1'
const LEGACY_KEY = 'jugnu.state.v1'
const spaceKey = (userId: string) => `jugnu.space.v1.${userId}`

export interface Session {
  currentUserId: string | null
}

export type SpaceSnapshot = Pick<
  AppState,
  'spaceId' | 'patient' | 'users' | 'people' | 'memories' | 'reminders' | 'sessions' | 'moods' | 'invites'
>

/** Object URLs from a live recording cannot survive a reload, so they are dropped. */
function sanitize(space: SpaceSnapshot): SpaceSnapshot {
  const stripVoice = <T extends { voiceNote?: { audioUrl?: string } }>(item: T): T =>
    item.voiceNote?.audioUrl ? { ...item, voiceNote: { ...item.voiceNote, audioUrl: undefined } } : item

  return {
    ...space,
    people: space.people.map(stripVoice),
    memories: space.memories.map(stripVoice),
  }
}

export function loadSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function saveSession(session: Session) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    /* quota or private mode — Jugnu keeps working from memory */
  }
}

export function loadSpace(userId: string): SpaceSnapshot | null {
  try {
    const raw = window.localStorage.getItem(spaceKey(userId))
    if (!raw) return null
    return JSON.parse(raw) as SpaceSnapshot
  } catch {
    return null
  }
}

export function saveSpace(userId: string, space: SpaceSnapshot) {
  try {
    window.localStorage.setItem(spaceKey(userId), JSON.stringify(sanitize(space)))
  } catch {
    /* quota or private mode — Jugnu keeps working from memory */
  }
}

/**
 * Before spaces were split per account, everything lived in one shared blob.
 * There is no clean way to un-mix accounts, so keep whoever was signed in as
 * the session and let their next sign-in create their own fresh space.
 */
export function readLegacySession(): Session | null {
  const raw = window.localStorage.getItem(LEGACY_KEY)
  if (!raw) return null
  try {
    window.localStorage.removeItem(LEGACY_KEY)
    const old = JSON.parse(raw) as AppState
    return { currentUserId: typeof old?.currentUserId === 'string' ? old.currentUserId : null }
  } catch {
    return null
  }
}