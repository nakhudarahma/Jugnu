import type { AppState } from '@/types'

const KEY = 'jugnu.state.v1'

/** Object URLs from a live recording cannot survive a reload, so they are dropped. */
function sanitize(state: AppState): AppState {
  const stripVoice = <T extends { voiceNote?: { audioUrl?: string } }>(item: T): T =>
    item.voiceNote?.audioUrl ? { ...item, voiceNote: { ...item.voiceNote, audioUrl: undefined } } : item

  return {
    ...state,
    people: state.people.map(stripVoice),
    memories: state.memories.map(stripVoice),
  }
}

export function loadState(): AppState | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as AppState
  } catch {
    return null
  }
}

export function saveState(state: AppState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(sanitize(state)))
  } catch {
    /* quota or private mode — Jugnu keeps working from memory */
  }
}

export function clearState() {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
