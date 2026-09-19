import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import type { AppState, AppUser } from '@/types'
import { seedState } from '@/data/seed'
import { loadState, saveState } from '@/lib/storage'
import { capabilitiesFor, type Capabilities } from '@/lib/capabilities'
import { languageLabel } from '@/lib/i18n'
import { voice } from '@/lib/voice'
import { checkBackend, setTokens, clearTokens, flushQueue } from '@/lib/api'
import { reducer, type Action } from './reducer'
import * as authApi from '@/api/auth'
import * as remindersApi from '@/api/reminders'
import * as memoriesApi from '@/api/memories'
import * as peopleApi from '@/api/people'
import * as moodEntriesApi from '@/api/moodEntries'
import * as invitesApi from '@/api/invites'
import * as sessionsApi from '@/api/sessions'
import * as insightsApi from '@/api/insights'

interface AppContextValue {
  state: AppState
  dispatch: (action: Action) => void
  currentUser: AppUser | null
  can: Capabilities
  backendAvailable: boolean
  queueLength: number
  api: {
    login: (identifier: string, password: string) => Promise<void>
    register: (data: { name: string; email?: string; phone?: string; password: string; role?: string }) => Promise<void>
    logout: () => Promise<void>
    googleLogin: (
      accessToken: string,
      opts?: { role?: string; createIfMissing?: boolean },
    ) => Promise<authApi.GoogleLoginResponse>
    syncFromBackend: () => Promise<void>
    addReminder: (patientId: string, data: Record<string, unknown>) => Promise<void>
    updateReminder: (id: string, data: Record<string, unknown>) => Promise<void>
    deleteReminder: (id: string) => Promise<void>
    toggleReminder: (id: string, completed: boolean) => Promise<void>
    addMemory: (data: Record<string, unknown>) => Promise<void>
    updateMemory: (id: string, data: Record<string, unknown>) => Promise<void>
    deleteMemory: (id: string) => Promise<void>
    approveMemory: (id: string) => Promise<void>
    declineMemory: (id: string) => Promise<void>
    addPerson: (data: Record<string, unknown>) => Promise<void>
    updatePerson: (id: string, data: Record<string, unknown>) => Promise<void>
    addMood: (patientId: string, mood: string, note?: string) => Promise<void>
    invite: (data: Record<string, unknown>) => Promise<void>
    revokeInvite: (id: string) => Promise<void>
    updateUser: (id: string, data: Record<string, unknown>) => Promise<void>
    updatePatient: (id: string, data: Record<string, unknown>) => Promise<void>
    recordSession: (patientId: string, gameId: string) => Promise<string | null>
    endSession: (sessionId: string, status: string) => Promise<void>
    getInsights: (patientId: string) => Promise<unknown[]>
    flushPendingSync: () => Promise<void>
  }
}

const AppContext = createContext<AppContextValue | null>(null)

function initialState(): AppState {
  const stored = loadState()
  if (!stored) return seedState
  const merged = { ...seedState, ...stored, currentUserId: stored.currentUserId ?? null, pendingMoodCheckIn: false }
  const seedPeopleById = new Map(seedState.people.map((p) => [p.id, p]))
  merged.people = merged.people.map((p) => {
    const seeded = seedPeopleById.get(p.id)
    let next = p
    const staleStatic = p.photoUrl && /^(data:|blob:)/.test(p.photoUrl) === false
    if (seeded?.photoUrl && (staleStatic || !p.photoUrl)) next = { ...p, photoUrl: seeded.photoUrl }
    if (seeded?.voiceNote && !next.voiceNote) next = { ...next, voiceNote: seeded.voiceNote }
    return next
  })
  if (!(merged.patient.language in languageLabel)) {
    merged.patient = { ...merged.patient, language: seedState.patient.language }
  }
  if (merged.patient.personalizationLevel === 0) {
    merged.patient = { ...merged.patient, personalizationLevel: 1 }
  }
  // Migration: spaces saved before `spaceId` existed have a real (non-seed) patient
  // profile but no marker. Assign one so a second account joins instead of wiping it.
  if (!merged.spaceId && merged.patient.id !== seedState.patient.id) {
    merged.spaceId = `sp_${Date.now()}`
  }
  return merged
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const [backendAvailable, setBackendAvailable] = useState(false)
  const [queueLength, setQueueLength] = useState(0)

  useEffect(() => { saveState(state) }, [state])
  useEffect(() => { voice.setEnabled(state.patient.voiceEnabled) }, [state.patient.voiceEnabled])

  useEffect(() => {
    checkBackend().then(setBackendAvailable)
    // Check queue length periodically
    const interval = setInterval(() => {
      import('@/lib/syncQueue').then(({ queueLength: len }) => setQueueLength(len()))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Listen for online events to re-check backend
  useEffect(() => {
    const onOnline = () => {
      checkBackend().then(setBackendAvailable)
      flushQueue().then(() => {
        import('@/lib/syncQueue').then(({ queueLength: len }) => setQueueLength(len))
      })
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  const patientId = state.patient.id

  const api = useMemo<AppContextValue['api']>(() => ({
    login: async (identifier: string, password: string) => {
      const res = await authApi.login(identifier, password)
      if (res) {
        setTokens(res.accessToken, res.refreshToken)
        const isWorker = res.user.role === 'HEALTH_WORKER'
        const newUser: AppUser = {
          id: res.user.id,
          name: res.user.name || identifier.split('@')[0],
          relationship: isWorker ? 'Health Worker' : 'Primary Caregiver',
          layer: isWorker ? 2 : 1,
          portraitTone: 'amber',
          canSeeTrends: true,
        }
        dispatch({ type: 'signIn', userId: res.user.id, user: newUser })
      }
    },

    register: async (data: { name: string; email?: string; phone?: string; password: string, role?: string }) => {
      const res = await authApi.register(data)
      if (res) {
        setTokens(res.accessToken, res.refreshToken)
        const isWorker = res.user.role === 'HEALTH_WORKER'
        const newUser: AppUser = {
          id: res.user.id,
          name: res.user.name || data.name,
          relationship: isWorker ? 'Health Worker' : 'Primary Caregiver',
          layer: isWorker ? 2 : 1,
          portraitTone: 'amber',
          canSeeTrends: true,
        }
        dispatch({ type: 'createNewSpace', userId: res.user.id, user: newUser })
      }
    },

    logout: async () => {
      try { await authApi.logout() } catch { /* ignore */ }
      clearTokens()
      dispatch({ type: 'signOut' })
    },

    googleLogin: (accessToken, opts) => authApi.googleLogin(accessToken, opts),

    syncFromBackend: async () => {
      if (!backendAvailable) return
      const [reminders, memories, people, moods, sessions, invites] = await Promise.all([
        remindersApi.getReminders(patientId),
        memoriesApi.getMemories(patientId),
        peopleApi.getPeople(patientId),
        moodEntriesApi.getMoodEntries(patientId),
        sessionsApi.getSessionsByPatient(patientId),
        invitesApi.getInvites(patientId),
      ])
      if (reminders) {
        const existingTitles = new Set(state.reminders.map((r) => r.title + r.time))
        for (const r of reminders) {
          const key = (r.title || '') + (r.time || r.scheduledAt?.slice(11, 16) || '09:00')
          if (existingTitles.has(key)) continue
          dispatch({ type: 'addReminder', reminder: {
            title: r.title,
            time: r.time || r.scheduledAt?.slice(11, 16) || '09:00',
            repeat: (r.repeatRule?.toLowerCase() || 'daily') as any,
            priority: (r.priority?.toLowerCase() || 'normal') as any,
            note: r.note || r.message,
            assignedToUserId: r.assignedToUserId,
          }})
        }
      }
      if (memories) {
        const existingTitles = new Set(state.memories.map((m) => m.title))
        for (const m of memories) {
          if (existingTitles.has(m.title)) continue
          dispatch({ type: 'addMemory', memory: {
            title: m.title,
            description: m.description,
            personId: m.personId,
            photoUrl: m.photoUrl,
            createdByUserId: m.createdByUserId,
            status: m.status?.toLowerCase() as any || 'approved',
            usableInActivities: m.usableInActivities,
          }})
        }
      }
      if (people) {
        const existingIds = new Set(state.people.map((p) => p.id))
        for (const p of people) {
          if (existingIds.has(p.id)) continue
          dispatch({ type: 'addPerson', person: {
            id: p.id,
            name: p.name,
            relationship: p.relationship,
            photoUrl: p.photoUrl,
            portraitTone: p.portraitTone?.toLowerCase() as any || 'sage',
            isPatient: p.isPatient,
          }})
        }
      }
      if (moods) {
        for (const m of moods) {
          dispatch({ type: 'addMood', mood: m.mood as any, userId: m.userId })
        }
      }
      if (sessions) {
        for (const s of sessions) {
          dispatch({ type: 'recordSession', session: {
            completed: s.completionStatus === 'COMPLETED',
            startedByUserId: patientId,
            domainScores: { memory: 70, attention: 70, recognition: 70 },
            activityCount: 3,
            gentleCorrections: 0,
          }})
        }
      }
      if (invites) {
        for (const i of invites) {
          dispatch({ type: 'invite', name: i.name, contact: i.contact, layer: i.layer as 2 | 3 })
        }
      }
    },

    addReminder: async (pid, data) => {
      await remindersApi.createReminder(pid, data as any)
      dispatch({ type: 'addReminder', reminder: {
        title: data.title as string,
        time: (data.time as string) || '09:00',
        repeat: (data.repeatRule as any) || 'daily',
        priority: (data.priority as any) || 'normal',
        note: data.note as string,
        assignedToUserId: data.assignedToUserId as string,
      }})
    },

    updateReminder: async (id, data) => {
      await remindersApi.updateReminder(id, data)
      dispatch({ type: 'updateReminder', id, patch: data as any })
    },

    deleteReminder: async (id) => {
      await remindersApi.deleteReminder(id)
      dispatch({ type: 'deleteReminder', id })
    },

    toggleReminder: async (id, completed) => {
      await remindersApi.updateReminder(id, { completed })
      dispatch({ type: 'updateReminder', id, patch: { completed } })
    },

    addMemory: async (data) => {
      await memoriesApi.createMemory(data as any)
      dispatch({ type: 'addMemory', memory: {
        title: data.title as string,
        description: data.description as string,
        personId: data.personId as string,
        photoUrl: data.photoUrl as string,
        createdByUserId: data.createdByUserId as string,
        status: 'approved',
        usableInActivities: data.usableInActivities as boolean,
      }})
    },

    updateMemory: async (id, data) => {
      await memoriesApi.updateMemory(id, data)
      dispatch({ type: 'updateMemory', id, patch: data as any })
    },

    deleteMemory: async (id) => {
      await memoriesApi.deleteMemory(id)
      dispatch({ type: 'deleteMemory', id })
    },

    approveMemory: async (id) => {
      await memoriesApi.approveMemory(id)
      dispatch({ type: 'updateMemory', id, patch: { status: 'approved' } })
    },

    declineMemory: async (id) => {
      await memoriesApi.declineMemory(id)
      dispatch({ type: 'updateMemory', id, patch: { status: 'pending' } })
    },

    addPerson: async (data) => {
      await peopleApi.createPerson(data as any)
      dispatch({ type: 'addPerson', person: {
        id: data.id as string || `p_${Date.now()}`,
        name: data.name as string,
        relationship: data.relationship as string,
        photoUrl: data.photoUrl as string,
        portraitTone: (data.portraitTone as any) || 'sage',
        isPatient: data.isPatient as boolean,
      }})
    },

    updatePerson: async (id, data) => {
      await peopleApi.updatePerson(id, data)
      dispatch({ type: 'updatePerson', id, patch: data as any })
    },

    addMood: async (pid, mood, note) => {
      await moodEntriesApi.createMoodEntry({ patientId: pid, mood, note })
      dispatch({ type: 'addMood', mood: mood as any, userId: state.currentUserId || '', note })
    },

    invite: async (data) => {
      await invitesApi.createInvite(data as any)
      dispatch({ type: 'invite', name: data.name as string, contact: data.contact as string, layer: data.layer as 2 | 3 })
    },

    revokeInvite: async (id) => {
      await invitesApi.deleteInvite(id)
      dispatch({ type: 'revokeInvite', id })
    },

    updateUser: async (id, data) => {
      await import('@/api/users').then(m => m.updateUser(id, data))
      dispatch({ type: 'updateUser', id, patch: data as any })
    },

    updatePatient: async (id, data) => {
      await import('@/api/patients').then(m => m.updatePatient(id, data))
      dispatch({ type: 'updatePatient', patch: data as any })
    },

    recordSession: async (pid, gameId) => {
      const session = await sessionsApi.createSession({ patientId: pid, gameId })
      return session?.id ?? null
    },

    endSession: async (sessionId, status) => {
      await sessionsApi.endSession(sessionId, status)
    },

    getInsights: async (pid) => {
      const data = await insightsApi.getInsights(pid)
      return data ?? []
    },

    flushPendingSync: async () => {
      await flushQueue()
      const { queueLength: len } = await import('@/lib/syncQueue')
      setQueueLength(len())
    },
  }), [backendAvailable, patientId, state.currentUserId])

  const value = useMemo<AppContextValue>(() => {
    const currentUser = state.users.find((u) => u.id === state.currentUserId) ?? null
    return { state, dispatch, currentUser, can: capabilitiesFor(currentUser), backendAvailable, queueLength, api }
  }, [state, backendAvailable, queueLength, api])

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

export function useFamilyPeople() {
  return useApp().state.people.filter((p) => !p.isPatient)
}

export function usePersonById(id?: string) {
  const people = usePeople()
  return id ? people.find((p) => p.id === id) : undefined
}
