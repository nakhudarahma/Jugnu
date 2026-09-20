import type { LanguageCode, MoodValue, PersonalizationLevel, Person, Reminder, SessionRecord } from '@/types'
import { daysAgo, today } from '@/lib/date'
import { allTrends, changeSignal } from '@/lib/trends'

/**
 * Health-worker mode — Centralized Care. ASHA/ANM workers or facility staff managing
 * many elderly residents in one building (old-age home, hospital, care facility).
 *
 * There is deliberately no village routing, no maps and no travel planning here:
 * everyone is in the same building, so the only thing that matters is urgency.
 *
 * Language is kept neutral and never diagnostic — "Change signal detected",
 * "Review suggested", "No current flag raised" — never a diagnosis.
 */
export type ResidentStatus = 'red' | 'amber' | 'green'

export const statusLabel: Record<ResidentStatus, string> = {
  red: 'Needs Attention',
  amber: 'Review Suggested',
  green: 'Stable',
}

export const statusOrder: Record<ResidentStatus, number> = { red: 0, amber: 1, green: 2 }

export const levelBlurb: Record<PersonalizationLevel, { label: string; description: string }> = {
  1: {
    label: 'Level 1 — Generic (Zero setup)',
    description: 'Object match, routine sequencing and pattern recall. Regionally familiar imagery, no personal data.',
  },
  2: {
    label: 'Level 2 — Personalized',
    description: "Who's Calling (recorded family voices), Remember When (real memories) and My Daily Routine, built from their own mornings.",
  },
  0: {
    label: 'Level 1 — Generic (Zero setup)',
    description: 'Object match, routine sequencing and pattern recall. Regionally familiar imagery, no personal data.',
  },
}

export interface ResidentGame {
  name: string
  /** Gentle, non-clinical completion like "5 of 5". */
  rounds: string
}

export type MemoryGame = 'whos_calling' | 'memory_recall'

export interface FacilityMemory {
  id: string
  title: string
  description?: string
  usableInActivities: boolean
  game?: MemoryGame
  audioUrl?: string
  transcript?: string
  /** Family member the memory is about — links a story to Who's-Calling/Remember-When options. */
  personId?: string
}

/** A family member connected to a resident — their circle on the health-worker side. */
export interface FacilityFamilyMember {
  id: string
  name: string
  relationship: string
  portraitTone: Person['portraitTone']
  /** Optional real photo, when one has been uploaded for this person. */
  photoUrl?: string
  /** Contact/voice linked for games such as Who's Calling. */
  voiceNote?: { transcript?: string; audioUrl?: string }
}

/** A family invitation sent by email that has not been accepted yet. */
export interface FacilityInvite {
  id: string
  name: string
  email: string
  relationship: string
  sentAt: string
}

export interface FacilityResident {
  id: string
  name: string
  age: number
  ward: string
  room: string
  portraitTone: Person['portraitTone']
  /** Optional real photo, when one has been uploaded for this resident. */
  photoUrl?: string
  language: LanguageCode
  personalizationLevel: PersonalizationLevel
  /** ISO date of their most recent session. */
  lastSessionDate: string
  /** e.g. "10:30 AM" — displayed next to the date. */
  lastSessionTime: string
  /** Missed sessions over the recent period — a contribution to RED/AMBER. */
  missedSessions: number
  /** Brand-new resident still building their first baseline. */
  calibrating?: boolean
  /** Most recent relevant event used to order patients inside a status group. */
  alertAt: string
  sessions: SessionRecord[]
  reminders: Reminder[]
  /** Caregiver / family notes passed along to the facility. */
  notes: string[]
  games: ResidentGame[]
  /** Voice clips and stories for their personalized games. */
  memories: FacilityMemory[]
  /** Family members connected into this resident's circle. */
  family: FacilityFamilyMember[]
  /** Email invitations that have been sent but not yet accepted. */
  invites: FacilityInvite[]
  todaySession: 'done' | 'scheduled' | 'pending'
  scheduledTime?: string
}

/** Sessions attended in the last 7 days, out of 7. */
export function attendance7(resident: FacilityResident): { attended: number; of: number } {
  const cutoff = daysAgo(7)
  const attended = resident.sessions.filter((s) => s.completed && s.date >= cutoff).length
  return { attended, of: 7 }
}

/** Whole-facility session completions over the last 7 days. */
export function weeklyCompletion(residents: FacilityResident[]): { attended: number; of: number } {
  const cutoff = daysAgo(7)
  const attended = residents.reduce(
    (sum, r) => sum + r.sessions.filter((s) => s.completed && s.date >= cutoff).length,
    0,
  )
  return { attended, of: residents.length * 7 }
}

/** RED = sustained decline / repeated missed sessions. AMBER = early change or calibrating. GREEN otherwise. */
export function statusFor(resident: FacilityResident): ResidentStatus {
  if ((resident.calibrating || resident.sessions.length < 4) && resident.missedSessions === 0) return 'amber'
  const signal = changeSignal(resident.sessions)
  if (signal.level === 'watch' || resident.missedSessions >= 2) return 'red'
  const declined = allTrends(resident.sessions).some((t) => t.direction === 'declining')
  if (declined || resident.missedSessions >= 1) return 'amber'
  return 'green'
}

export function signalFor(resident: FacilityResident): string {
  switch (statusFor(resident)) {
    case 'red':
      return 'Performance has declined across the last 3 sessions.'
    case 'amber':
      return resident.calibrating
        ? 'Still calibrating — a review is suggested once enough sessions are recorded.'
        : 'An early change has been noted. Watch the next few sessions.'
    case 'green':
      return 'No current flag raised.'
  }
}

export function suggestedAction(resident: FacilityResident): string {
  switch (statusFor(resident)) {
    case 'red':
      return 'Consider a caregiver/clinical review.'
    case 'amber':
      return resident.calibrating
        ? 'Let the resident get comfortable, then re-check next week.'
        : 'Continue with routine check-ins and observe the coming sessions.'
    case 'green':
      return 'No action needed. Continue the daily routine.'
  }
}

/**
 * Priority list: red → amber → green, and inside a group the most recent relevant
 * alert first.
 */
export function priorityRoster(residents: FacilityResident[]): FacilityResident[] {
  return [...residents].sort((a, b) => {
    const byStatus = statusOrder[statusFor(a)] - statusOrder[statusFor(b)]
    if (byStatus !== 0) return byStatus
    return b.alertAt.localeCompare(a.alertAt)
  })
}

const series = (points: [number, number, number, number][]) =>
  points.map(([day, memory, attention, recognition], i) => {
    // Generate deterministic variation based on the day and scores
    const avgResponseTimeMs = Math.max(1500, 4500 + day * 100 - memory * 10)
    const totalDurationSeconds = Math.max(120, 300 + day * 5 - Math.floor(attention / 2))
    const hesitationCount = i % 4 === 0 ? 2 : i % 3 === 0 ? 1 : 0

    return {
      id: `s_${day}`,
      date: daysAgo(day),
      completed: true,
      startedByUserId: 'hw_ward',
      domainScores: { memory, attention, recognition },
      activityCount: 3,
      gentleCorrections: i % 3 === 0 ? 1 : 0,
      timeMetrics: {
        avgResponseTimeMs,
        totalDurationSeconds,
        hesitationCount,
        fatigueRatio: 1.0,
      },
    }
  })

/**
 * The demo health-worker account signs itself in as `u_hw_demo_…` and gets this
 * seeded facility roster, so the demo has residents, trends and reminders to show.
 * A real (non-demo) worker account still starts completely empty.
 */
const seededResidents: FacilityResident[] = [
  {
    id: 'res_anita',
    name: 'Anita Devi',
    age: 78,
    ward: 'Ward B',
    room: 'Room 204',
    portraitTone: 'amber',
    photoUrl: '/people/anita.jpg',
    language: 'hi',
    personalizationLevel: 2,
    lastSessionDate: daysAgo(0),
    lastSessionTime: '10:30 AM',
    missedSessions: 0,
    alertAt: daysAgo(0),
    sessions: series([
      [12, 72, 70, 71],
      [11, 70, 71, 70],
      [9, 68, 70, 71],
      [8, 66, 69, 69],
      [7, 62, 68, 70],
      [4, 61, 66, 68],
      [2, 59, 64, 67],
      [0, 58, 63, 66],
    ]),
    reminders: [
      { id: 'a_med', title: 'Morning medicine', time: '08:00', repeat: 'daily', priority: 'important', completed: true, note: 'Please confirm with the ward nurse.' },
      { id: 'a_walk', title: 'Evening walk with helper', time: '17:30', repeat: 'daily', priority: 'normal', completed: false },
    ],
    notes: [
      'Son (Rahul) calls every evening at 7. She brightens up right after.',
      'Prefers being addressed as “Anita Devi” by staff.',
    ],
    games: [
      { name: 'Object Match', rounds: '5 of 5' },
      { name: 'Routine Sequencing', rounds: '4 of 5' },
      { name: 'Pattern Recall', rounds: '3 of 5' },
    ],
    memories: [],
    family: [
      { id: 'fa_rahul', name: 'Rahul', relationship: 'son', portraitTone: 'sage', photoUrl: '/people/rahul.jpg', voiceNote: { transcript: 'Hello Anita, this is your son Rahul calling from Guwahati.' } },
      { id: 'fa_meera', name: 'Meera', relationship: 'daughter', portraitTone: 'lilac', photoUrl: '/people/meera.jpg' },
      { id: 'fa_nisha', name: 'Nisha', relationship: 'granddaughter', portraitTone: 'clay', photoUrl: '/people/nisha.jpg' },
    ],
    invites: [{ id: 'inv_a_1', name: 'Ravi', email: 'ravi@example.com', relationship: 'nephew', sentAt: daysAgo(2) }],
    todaySession: 'done',
    scheduledTime: '10:30 AM',
  },
  {
    id: 'res_ramesh',
    name: 'Ramesh Boro',
    age: 81,
    ward: 'Ward A',
    room: 'Room 118',
    portraitTone: 'dusk',
    photoUrl: '/people/ramesh.avif',
    language: 'as',
    personalizationLevel: 1,
    lastSessionDate: daysAgo(2),
    lastSessionTime: '09:15 AM',
    missedSessions: 2,
    alertAt: daysAgo(1),
    sessions: series([
      [12, 60, 58, 61],
      [10, 61, 57, 60],
      [7, 59, 56, 59],
      [3, 58, 55, 57],
    ]),
    reminders: [
      { id: 'r_med', title: 'BP medicine', time: '09:00', repeat: 'daily', priority: 'important', completed: true },
      { id: 'r_water', title: 'Drink water', time: '12:00', repeat: 'daily', priority: 'normal', completed: false },
    ],
    notes: ['Often sleepy after lunch — schedule sessions before noon.'],
    games: [
      { name: 'Object Find', rounds: '4 of 5' },
      { name: 'Tea Routine', rounds: '3 of 5' },
    ],
    memories: [],
    family: [{ id: 'fa_dipak', name: 'Dipak', relationship: 'grandson', portraitTone: 'sage' }],
    invites: [],
    todaySession: 'pending',
  },
  {
    id: 'res_abdul',
    name: 'Abdul Rehman',
    age: 76,
    ward: 'Ward B',
    room: 'Room 205',
    portraitTone: 'clay',
    photoUrl: '/people/abdul_rehman.webp',
    language: 'bn',
    personalizationLevel: 1,
    lastSessionDate: daysAgo(0),
    lastSessionTime: '09:45 AM',
    missedSessions: 1,
    alertAt: daysAgo(0),
    sessions: series([
      [12, 68, 66, 67],
      [10, 69, 65, 66],
      [8, 67, 63, 66],
      [6, 66, 61, 64],
      [4, 64, 60, 62],
      [2, 63, 59, 61],
      [0, 62, 58, 60],
    ]),
    reminders: [{ id: 'n_nap', title: 'Rest after physio', time: '14:00', repeat: 'daily', priority: 'normal', completed: false }],
    notes: ['Missing this week’s Monday session — physio clashed. Reschedule to the afternoon.'],
    games: [
      { name: 'Object Find', rounds: '5 of 5' },
      { name: 'Pattern Recall', rounds: '4 of 5' },
    ],
    memories: [
      { id: 'n_mem_1', title: 'Remember When: Boat race', description: 'The boat race in his village during the festival.', game: 'memory_recall', transcript: 'Remember watching the boat race on the river with the whole village cheering?', usableInActivities: false },
    ],
    family: [{ id: 'fa_imran', name: 'Imran', relationship: 'son', portraitTone: 'clay' }],
    invites: [],
    todaySession: 'done',
    scheduledTime: '09:45 AM',
  },
  {
    id: 'res_purnima',
    name: 'Purnima Gogoi',
    age: 72,
    ward: 'Ward A',
    room: 'Room 101',
    portraitTone: 'lilac',
    photoUrl: '/people/purnima.jpg',
    language: 'mni',
    personalizationLevel: 2,
    lastSessionDate: daysAgo(1),
    lastSessionTime: '11:00 AM',
    missedSessions: 0,
    calibrating: true,
    alertAt: daysAgo(1),
    sessions: series([
      [3, 63, 62, 61],
      [1, 65, 63, 62],
    ]),
    reminders: [{ id: 'p_med', title: 'Evening medicine', time: '19:00', repeat: 'daily', priority: 'important', completed: false }],
    notes: ['New resident — admitted last week. Still getting used to the routine.'],
    games: [
      { name: 'Object Match', rounds: '3 of 5' },
      { name: 'Routine Sequencing', rounds: '2 of 5' },
      { name: 'Pattern Recall', rounds: '1 of 5' },
    ],
    memories: [],
    family: [
      { id: 'fa_geeta', name: 'Geeta', relationship: 'daughter', portraitTone: 'lilac', photoUrl: '/people/geeta.jpg', voiceNote: { transcript: 'Hello Maa, it is Geeta calling from Imphal.' } },
      { id: 'fa_rajkumar', name: 'Rajkumar', relationship: 'husband', portraitTone: 'dusk', photoUrl: '/people/rajkumar.jpg' },
    ],
    invites: [],
    todaySession: 'pending',
    scheduledTime: '11:00 AM',
  },
  {
    id: 'res_lakshmi',
    name: 'Lakshmi Barua',
    age: 74,
    ward: 'Ward C',
    room: 'Room 307',
    portraitTone: 'sage',
    photoUrl: '/people/lakshmi.avif',
    language: 'as',
    personalizationLevel: 1,
    lastSessionDate: daysAgo(0),
    lastSessionTime: '08:30 AM',
    missedSessions: 0,
    alertAt: daysAgo(0),
    sessions: series([
      [12, 64, 62, 63],
      [10, 64, 63, 63],
      [8, 65, 62, 64],
      [6, 64, 63, 64],
      [4, 65, 64, 65],
      [2, 65, 63, 65],
      [0, 66, 64, 66],
    ]),
    reminders: [{ id: 'l_water', title: 'Drink water', time: '11:00', repeat: 'daily', priority: 'normal', completed: true }],
    notes: ['Daughter visits on Sundays and joins the session.'],
    games: [
      { name: 'Object Find', rounds: '5 of 5' },
      { name: 'Tea Routine', rounds: '5 of 5' },
      { name: 'Pattern Recall', rounds: '5 of 5' },
    ],
    memories: [
      { id: 'l_mem_1', title: 'Remember When: Sunday visits', description: 'Daughter visits every Sunday and joins the session.', game: 'memory_recall', transcript: 'Remember how we would make tea together on Sunday mornings?', usableInActivities: true },
    ],
    family: [
      { id: 'fa_priya', name: 'Priya', relationship: 'daughter', portraitTone: 'lilac' },
      { id: 'fa_anil', name: 'Anil', relationship: 'son', portraitTone: 'sage' },
    ],
    invites: [],
    todaySession: 'done',
    scheduledTime: '08:30 AM',
  },
  {
    id: 'res_mohan',
    name: 'Mohan Das',
    age: 83,
    ward: 'Ward B',
    room: 'Room 204',
    portraitTone: 'amber',
    photoUrl: '/people/mohan.webp',
    language: 'hi',
    personalizationLevel: 1,
    lastSessionDate: daysAgo(1),
    lastSessionTime: '11:15 AM',
    missedSessions: 0,
    alertAt: daysAgo(1),
    sessions: series([
      [12, 58, 60, 59],
      [10, 60, 61, 60],
      [8, 63, 62, 62],
      [6, 64, 63, 64],
      [4, 66, 65, 66],
      [2, 67, 66, 68],
      [1, 69, 67, 69],
    ]),
    reminders: [{ id: 'm_tea', title: 'Afternoon chai with the group', time: '16:00', repeat: 'daily', priority: 'normal', completed: false }],
    notes: ['Improving steadily — enjoys the tea routine the most.'],
    games: [
      { name: 'Object Find', rounds: '5 of 5' },
      { name: 'Pattern Recall', rounds: '4 of 5' },
    ],
    memories: [],
    family: [
      { id: 'fa_sunita', name: 'Sunita', relationship: 'wife', portraitTone: 'amber' },
      { id: 'fa_vikram', name: 'Vikram', relationship: 'son', portraitTone: 'clay' },
    ],
    invites: [],
    todaySession: 'pending',
  },
  {
    id: 'res_jitendra',
    name: 'Jitendra Sharma',
    age: 85,
    ward: 'Ward C',
    room: 'Room 312',
    portraitTone: 'dusk',
    photoUrl: '/people/jitendra.jpg',
    language: 'hi',
    personalizationLevel: 1,
    lastSessionDate: daysAgo(0),
    lastSessionTime: '07:45 AM',
    missedSessions: 0,
    alertAt: daysAgo(0),
    sessions: series([
      [12, 61, 60, 62],
      [10, 62, 60, 62],
      [8, 61, 61, 63],
      [6, 62, 61, 63],
      [4, 63, 61, 64],
      [2, 63, 62, 64],
      [0, 64, 62, 65],
    ]),
    reminders: [{ id: 'j_med', title: 'Morning medicine', time: '08:00', repeat: 'daily', priority: 'important', completed: true }],
    notes: ['Prefers a very quiet room; sessions with the door closed.'],
    games: [
      { name: 'Object Find', rounds: '5 of 5' },
      { name: 'Tea Routine', rounds: '5 of 5' },
    ],
    memories: [],
    family: [{ id: 'fa_kavita', name: 'Kavita', relationship: 'daughter', portraitTone: 'lilac' }],
    invites: [],
    todaySession: 'done',
    scheduledTime: '07:45 AM',
  },
]

/**
 * Health-worker data is scoped per account. Each account's roster, mood history,
 * worker name and facility name live under their own storage keys, so a real,
 * brand-new account starts completely empty — the only seeded data belongs to the
 * demo account (`u_hw_demo_…`), which gets the demo roster so the walkthrough has
 * content. `setActiveWorker()` switches the active account and loads its store;
 * call it whenever a health worker signs in, is created, or switches.
 */

const ACTIVE_WORKER_KEY = 'jugnu_hw_active_worker_v1'

let activeWorkerId: string | null = (() => {
  try {
    return localStorage.getItem(ACTIVE_WORKER_KEY)
  } catch {
    return null
  }
})()

/** Switch the active health-worker account and load its data (fresh/empty for a new one). */
export function setActiveWorker(workerId: string | null): void {
  activeWorkerId = workerId
  try {
    if (workerId) localStorage.setItem(ACTIVE_WORKER_KEY, workerId)
    else localStorage.removeItem(ACTIVE_WORKER_KEY)
  } catch {
    /* storage unavailable — in-memory only */
  }
  residentStore = loadResidents()
  workerName = loadWorkerName()
  facilityName = loadFacilityName()
}

const residentsKey = () => (activeWorkerId ? `jugnu_hw_residents_v3_${activeWorkerId}` : 'jugnu_hw_residents_v3')
const moodsKey = () => (activeWorkerId ? `jugnu_hw_moods_v3_${activeWorkerId}` : 'jugnu_hw_moods_v3')
const workerNameKey = () => (activeWorkerId ? `jugnu_hw_worker_name_v2_${activeWorkerId}` : 'jugnu_hw_worker_name_v2')
const facilityNameKey = () => (activeWorkerId ? `jugnu_hw_facility_name_v2_${activeWorkerId}` : 'jugnu_hw_facility_name_v2')

function loadResidents(): FacilityResident[] {
  try {
    const raw = localStorage.getItem(residentsKey())
    if (raw) {
      const parsed = JSON.parse(raw) as FacilityResident[]
      if (Array.isArray(parsed)) {
        return parsed.map((r) => ({ ...r, invites: r.invites ?? [], family: r.family ?? [], memories: r.memories ?? [] }))
      }
    }
  } catch {
    /* stale or unreadable storage — start fresh */
  }
  // The demo health-worker account gets the seeded facility roster so the demo
  // walkthrough has residents, trends and reminders to show. Any real account
  // starts completely empty.
  if (activeWorkerId?.startsWith('u_hw_demo_')) {
    const seeds = seededResidents.map((r) => ({ ...r, sessions: [...r.sessions], reminders: [...r.reminders], games: [...r.games], notes: [...r.notes], memories: [...r.memories], family: [...r.family], invites: [...r.invites] }))
    try {
      localStorage.setItem(residentsKey(), JSON.stringify(seeds))
    } catch {
      /* storage unavailable — keep it in memory only */
    }
    return seeds
  }
  return []
}

function persistResidents(): void {
  try {
    localStorage.setItem(residentsKey(), JSON.stringify(residentStore))
  } catch {
    /* storage unavailable — in-memory only */
  }
}

/** Persist current store state to localStorage (call after mutating a resident). */
export function saveResidents(): void {
  persistResidents()
}

let residentStore: FacilityResident[] = loadResidents()

/** Day-stamp key per account, used to count real accounts' missed sessions once per day. */
const reconcileDayKey = () => `${residentsKey()}_day`

/**
 * Real accounts: when a new day rolls over and a resident's session was left
 * undone, count it as one missed session and reset today's session for a fresh
 * day. Demo accounts are untouched — their seeded roster stays exactly as shown.
 */
function reconcileMissedSessions(): void {
  if (activeWorkerId?.startsWith('u_hw_demo_')) return

  let lastDay: string
  try {
    lastDay = localStorage.getItem(reconcileDayKey()) ?? today()
  } catch {
    lastDay = today()
  }
  if (lastDay >= today()) return

  for (const r of residentStore) {
    if (r.todaySession !== 'done') r.missedSessions += 1
    r.todaySession = 'pending'
    delete r.scheduledTime
  }
  persistResidents()
  try {
    localStorage.setItem(reconcileDayKey(), today())
  } catch {
    /* storage unavailable — we'll re-check next load */
  }
}

export function getResidents(): FacilityResident[] {
  reconcileMissedSessions()
  return residentStore
}

type NewResidentInput = Omit<
  FacilityResident,
  | 'id'
  | 'ward'
  | 'room'
  | 'sessions'
  | 'reminders'
  | 'notes'
  | 'games'
  | 'memories'
  | 'family'
  | 'invites'
  | 'alertAt'
  | 'lastSessionDate'
  | 'lastSessionTime'
  | 'missedSessions'
  | 'calibrating'
  | 'todaySession'
> &
  Partial<Pick<FacilityResident, 'ward' | 'room'>>

export function addResident(input: NewResidentInput): FacilityResident {
  const resident: FacilityResident = {
    ...input,
    ward: input.ward ?? 'Ward —',
    room: input.room ?? 'Room —',
    id: `res_${Date.now()}`,
    alertAt: daysAgo(0),
    lastSessionDate: daysAgo(0),
    lastSessionTime: '—',
    missedSessions: 0,
    calibrating: true,
    sessions: [],
    reminders: [],
    notes: [],
    games: [],
    memories: [],
    family: [],
    invites: [],
    todaySession: 'pending',
  }
  residentStore.push(resident)
  persistResidents()
  return resident
}

export function deleteResident(id: string): void {
  const index = residentStore.findIndex((r) => r.id === id)
  if (index !== -1) {
    residentStore.splice(index, 1)
    persistResidents()
  }
}

/** Health worker's daily mood history — scoped per account, empty until they check in. */
export function loadMoods(): Record<string, MoodValue> {
  try {
    const raw = localStorage.getItem(moodsKey())
    if (raw) return JSON.parse(raw) as Record<string, MoodValue>
  } catch {
    /* stale or unreadable storage — start fresh */
  }
  return {}
}

export function saveMoods(moods: Record<string, MoodValue>): void {
  try {
    localStorage.setItem(moodsKey(), JSON.stringify(moods))
  } catch {
    /* storage unavailable — keep in memory only */
  }
}

/**
 * Worker PIN that unlocks the locked patient session back to the roster.
 * Kept in a small module store so the worker settings screen can change it
 * and the session lock reads the latest value.
 */
let workerPin = '1234'

export function getWorkerPin(): string {
  return workerPin
}

export function setWorkerPin(pin: string): void {
  workerPin = pin
}

function loadWorkerName(): string {
  try {
    return localStorage.getItem(workerNameKey()) ?? ''
  } catch {
    return ''
  }
}

let workerName = loadWorkerName()

export function getWorkerName(): string {
  return workerName
}

export function setWorkerName(name: string): void {
  workerName = name.trim()
  try {
    localStorage.setItem(workerNameKey(), workerName)
  } catch {
    /* storage unavailable — keep it in memory only */
  }
}

function loadFacilityName(): string {
  try {
    return localStorage.getItem(facilityNameKey()) ?? ''
  } catch {
    return ''
  }
}

let facilityName = loadFacilityName()

export function getFacilityName(): string {
  return facilityName
}

export function setFacilityName(name: string): void {
  facilityName = name.trim()
  try {
    localStorage.setItem(facilityNameKey(), facilityName)
  } catch {
    /* storage unavailable — keep it in memory only */
  }
}