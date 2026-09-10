/** Domain model for Jugnu. Frontend-only: every one of these lives in local state. */

export type LayerId = 0 | 1 | 2 | 3

/** 1 = gentle start (generic content, zero setup), 2 = her own people (real photos + names + family voices). */
export type PersonalizationLevel = 1 | 2 | 0

export type LanguageCode = 'en' | 'hi' | 'mni' | 'as' | 'bn'

export type TrendDirection = 'improving' | 'stable' | 'declining'

export type CognitiveDomain = 'memory' | 'attention' | 'recognition'

export type MoodValue = 'good' | 'ok' | 'low'

export interface VoiceNote {
  id: string
  /** Object URL when the caregiver really recorded audio in this browser. */
  audioUrl?: string
  /** Spoken stand-in used when microphone capture is unavailable. */
  transcript?: string
  seconds: number
  recordedBy: string
  recordedAt: string
}

export interface Person {
  id: string
  name: string
  relationship: string
  /** Data URL if a photo was added, otherwise a generated portrait is drawn. */
  photoUrl?: string
  /** Two-tone token used by the generated portrait placeholder. */
  portraitTone: 'amber' | 'sage' | 'lilac' | 'clay' | 'dusk'
  voiceNote?: VoiceNote
  isPatient?: boolean
}

export interface Memory {
  id: string
  title: string
  description: string
  personId?: string
  photoUrl?: string
  voiceNote?: VoiceNote
  createdByUserId: string
  createdAt: string
  status: 'approved' | 'pending'
  /** Memories a caregiver has marked as usable inside patient activities. */
  usableInActivities: boolean
}

export type ReminderRepeat = 'daily' | 'weekdays' | 'weekly' | 'once'

export interface Reminder {
  id: string
  title: string
  /** 24h "HH:MM". */
  time: string
  repeat: ReminderRepeat
  priority: 'normal' | 'important'
  completed: boolean
  note?: string
  /** Layer 2 helpers may only act on reminders assigned to them. */
  assignedToUserId?: string
}

export interface SessionRecord {
  id: string
  /** ISO date, "YYYY-MM-DD". */
  date: string
  completed: boolean
  startedByUserId: string
  /** Internal, never shown as a number to any user. */
  domainScores: Record<CognitiveDomain, number>
  activityCount: number
  gentleCorrections: number
}

export interface MoodEntry {
  id: string
  date: string
  userId: string
  mood: MoodValue
  note?: string
}

export interface AppUser {
  id: string
  name: string
  relationship: string
  layer: LayerId
  pin?: string
  portraitTone: Person['portraitTone']
  /** Layer 2 helpers see only these memories; empty means "all approved". */
  visibleMemoryIds?: string[]
  canSeeTrends?: boolean
  /** What this person calls the patient, e.g. "Maa". Falls back to PatientProfile.displayName. */
  callsPatient?: string
}

export interface PatientProfile {
  id: string
  name: string
  /** How the primary caregiver refers to the patient, e.g. "Maa". */
  displayName: string
  age: number
  relationshipToCaregiver: string
  region: string
  language: LanguageCode
  personalizationLevel: PersonalizationLevel
  /** Ordered slugs from the lexicon routine set — the patient's own morning routine, recorded by the caregiver. Powers "My Daily Routine". */
  morningRoutine?: string[]
  voiceEnabled: boolean
  speechRate: number
  portraitTone: Person['portraitTone']
}

export interface AppState {
  patient: PatientProfile
  users: AppUser[]
  currentUserId: string | null
  people: Person[]
  memories: Memory[]
  reminders: Reminder[]
  sessions: SessionRecord[]
  moods: MoodEntry[]
  /** Set when a caregiver re-enters through the PIN screen; drives the mood check-in. */
  pendingMoodCheckIn: boolean
  invites: { id: string; name: string; contact: string; layer: LayerId; sentAt: string; status: 'pending' }[]
}
