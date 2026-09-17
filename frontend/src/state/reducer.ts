import type { AppState, AppUser, Memory, MoodEntry, MoodValue, PatientProfile, Person, Reminder, SessionRecord } from '@/types'
import { today } from '@/lib/date'
import { uid } from '@/lib/id'
import { seedState } from '@/data/seed'

export type Action =
  | { type: 'signIn'; userId: string; user?: Partial<AppUser> }
  | { type: 'signOut' }
  | { type: 'requestMoodCheckIn' }
  | { type: 'dismissMoodCheckIn' }
  | { type: 'addMood'; mood: MoodValue; userId: string; note?: string }
  | { type: 'toggleReminder'; id: string }
  | { type: 'addReminder'; reminder: Omit<Reminder, 'id' | 'completed'> }
  | { type: 'updateReminder'; id: string; patch: Partial<Reminder> }
  | { type: 'deleteReminder'; id: string }
  | { type: 'addMemory'; memory: Omit<Memory, 'id' | 'createdAt'> }
  | { type: 'updateMemory'; id: string; patch: Partial<Memory> }
  | { type: 'deleteMemory'; id: string }
  | { type: 'addPerson'; person: Omit<Person, 'id'> & { id?: string } }
  | { type: 'updatePerson'; id: string; patch: Partial<Person> }
  | { type: 'updatePatient'; patch: Partial<PatientProfile> }
  | { type: 'updateUser'; id: string; patch: Partial<AppUser> }
  | { type: 'recordSession'; session: Omit<SessionRecord, 'id' | 'date'> }
  | { type: 'invite'; name: string; contact: string; layer: 2 | 3 }
  | { type: 'revokeInvite'; id: string }
  | { type: 'resetDemo' }
  | { type: 'createNewSpace'; userId: string; user?: Partial<AppUser> }

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'signIn': {
      let users = [...state.users]
      const existing = users.find((u) => u.id === action.userId)
      if (action.user) {
        if (existing) {
          users = users.map((u) => (u.id === action.userId ? { ...u, ...action.user } : u))
        } else {
          const newUser: AppUser = {
            id: action.userId,
            name: action.user.name || 'Caregiver',
            relationship: action.user.relationship || 'Primary Caregiver',
            layer: action.user.layer ?? 1,
            portraitTone: 'amber',
            canSeeTrends: true,
            ...action.user,
          }
          users.push(newUser)
        }
      }
      return { ...state, users, currentUserId: action.userId }
    }

    case 'signOut':
      return { ...state, currentUserId: null, pendingMoodCheckIn: false }

    case 'requestMoodCheckIn':
      return { ...state, pendingMoodCheckIn: true }

    case 'dismissMoodCheckIn':
      return { ...state, pendingMoodCheckIn: false }

    case 'addMood': {
      const date = today()
      const entry: MoodEntry = { id: uid('mo'), date, userId: action.userId, mood: action.mood, note: action.note }
      const others = state.moods.filter((m) => !(m.userId === action.userId && m.date === date))
      return { ...state, moods: [...others, entry], pendingMoodCheckIn: false }
    }

    case 'toggleReminder':
      return {
        ...state,
        reminders: state.reminders.map((r) => (r.id === action.id ? { ...r, completed: !r.completed } : r)),
      }

    case 'addReminder':
      return { ...state, reminders: [...state.reminders, { ...action.reminder, id: uid('r'), completed: false }] }

    case 'updateReminder':
      return {
        ...state,
        reminders: state.reminders.map((r) => (r.id === action.id ? { ...r, ...action.patch } : r)),
      }

    case 'deleteReminder':
      return { ...state, reminders: state.reminders.filter((r) => r.id !== action.id) }

    case 'addMemory':
      return {
        ...state,
        memories: [{ ...action.memory, id: uid('m'), createdAt: today() }, ...state.memories],
      }

    case 'updateMemory':
      return {
        ...state,
        memories: state.memories.map((m) => (m.id === action.id ? { ...m, ...action.patch } : m)),
      }

    case 'deleteMemory':
      return { ...state, memories: state.memories.filter((m) => m.id !== action.id) }

    case 'addPerson':
      return { ...state, people: [...state.people, { ...action.person, id: action.person.id ?? uid('p') }] }

    case 'updatePerson':
      return {
        ...state,
        people: state.people.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)),
      }

    case 'updatePatient':
      return { ...state, patient: { ...state.patient, ...action.patch } }

    case 'updateUser':
      return {
        ...state,
        users: state.users.map((u) => (u.id === action.id ? { ...u, ...action.patch } : u)),
      }

    case 'recordSession': {
      const date = today()
      const record: SessionRecord = { ...action.session, id: uid('s'), date }
      const withoutCurrent = state.sessions.filter((s) => s.id !== record.id)
      return { ...state, sessions: [...withoutCurrent, record] }
    }

    case 'invite':
      return {
        ...state,
        invites: [
          ...state.invites,
          { id: uid('inv'), name: action.name, contact: action.contact, layer: action.layer, sentAt: today(), status: 'pending' },
        ],
      }

    case 'revokeInvite':
      return { ...state, invites: state.invites.filter((i) => i.id !== action.id) }

    case 'resetDemo':
      return { ...seedState, currentUserId: state.currentUserId }

    case 'createNewSpace': {
      const newUser: AppUser = {
        id: action.userId,
        name: action.user?.name || 'Caregiver',
        relationship: action.user?.relationship || 'Primary Caregiver',
        layer: action.user?.layer ?? 1,
        portraitTone: 'amber',
        canSeeTrends: true,
        ...action.user,
      }
      return {
        ...state,
        patient: {
          id: uid('p'),
          name: 'My Loved One',
          displayName: `${newUser.name}’s Care`,
          age: 70,
          relationshipToCaregiver: 'Family',
          region: 'India',
          language: 'hi',
          personalizationLevel: 1,
          morningRoutine: ['wake', 'brush', 'tea', 'medicine', 'breakfast'],
          voiceEnabled: true,
          speechRate: 0.85,
          portraitTone: 'amber',
        },
        users: [newUser],
        currentUserId: action.userId,
        people: [],
        memories: [],
        reminders: [],
        sessions: [],
        moods: [],
        invites: [],
        pendingMoodCheckIn: false,
      }
    }

    default:
      return state
  }
}
