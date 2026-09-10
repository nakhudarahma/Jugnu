import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import type { AppState, AppUser } from '@/types'
import { seedState } from '@/data/seed'
import { loadState, saveState } from '@/lib/storage'
import { capabilitiesFor, type Capabilities } from '@/lib/capabilities'
import { languageLabel } from '@/lib/i18n'
import { voice } from '@/lib/voice'
import { reducer, type Action } from './reducer'

interface AppContextValue {
  state: AppState
  dispatch: (action: Action) => void
  currentUser: AppUser | null
  can: Capabilities
}

const AppContext = createContext<AppContextValue | null>(null)

function initialState(): AppState {
  const stored = loadState()
  if (!stored) return seedState
  // A previously signed-in user is restored (the device stays on the family's Jugnu),
  // but a fresh install or cleared storage opens on the sign-in screen.
  const merged = { ...seedState, ...stored, currentUserId: stored.currentUserId ?? null, pendingMoodCheckIn: false }
  // Seed photo URLs added after this device was set up would otherwise be lost to the
  // older stored state — merge any newly seeded photos back onto restored people.
  // A stored static path (e.g. an old /people/asha.png) is replaced by the current seed;
  // live uploads are data: URLs and are left untouched.
  const seedPeopleById = new Map(seedState.people.map((p) => [p.id, p]))
  merged.people = merged.people.map((p) => {
    const seeded = seedPeopleById.get(p.id)
    let next = p
    const staleStatic = p.photoUrl && /^(data:|blob:)/.test(p.photoUrl) === false
    if (seeded?.photoUrl && (staleStatic || !p.photoUrl)) next = { ...p, photoUrl: seeded.photoUrl }
    // Seed voice notes added after this device was set up would otherwise be lost to
    // the older stored state — merge them back so Who's Calling has every recording.
    if (seeded?.voiceNote && !next.voiceNote) next = { ...next, voiceNote: seeded.voiceNote }
    return next
  })
  // A device set up before a language was retired would otherwise restore a code that
  // no longer has copy or a label, leaving the Language control with nothing selected.
  if (!(merged.patient.language in languageLabel)) {
    merged.patient = { ...merged.patient, language: seedState.patient.language }
  }
  if (merged.patient.personalizationLevel === 0) {
    merged.patient = { ...merged.patient, personalizationLevel: 1 }
  }
  return merged
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    voice.setEnabled(state.patient.voiceEnabled)
  }, [state.patient.voiceEnabled])

  const value = useMemo<AppContextValue>(() => {
    const currentUser = state.users.find((u) => u.id === state.currentUserId) ?? null
    return { state, dispatch, currentUser, can: capabilitiesFor(currentUser) }
  }, [state])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}

export function usePatient() {
  return useApp().state.patient
}

export function usePeople() {
  return useApp().state.people
}

/** Everyone in the patient's circle except the patient themselves. */
export function useFamilyPeople() {
  return useApp().state.people.filter((p) => !p.isPatient)
}

export function usePersonById(id?: string) {
  const people = usePeople()
  return id ? people.find((p) => p.id === id) : undefined
}
