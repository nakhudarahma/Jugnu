import type { AppState, Memory, MoodEntry, Person, Reminder, SessionRecord } from '@/types'
import { daysAgo } from '@/lib/date'

const people: Person[] = [
  { id: 'p_asha', name: 'Asha Devi', relationship: 'patient', portraitTone: 'amber', isPatient: true, photoUrl: '/people/asha.jpg' },
  {
    id: 'p_rahul',
    name: 'Rahul',
    relationship: 'son',
    portraitTone: 'sage',
    photoUrl: '/people/rahul.jpg',
    voiceNote: {
      id: 'v_rahul',
      transcript: 'Maa, this is Rahul. I will call you tonight after dinner.',
      seconds: 6,
      recordedBy: 'u_rahul',
      recordedAt: daysAgo(9),
    },
  },
  {
    id: 'p_meena',
    name: 'Meena',
    relationship: 'daughter',
    portraitTone: 'lilac',
    photoUrl: '/people/meena.jpg',
    voiceNote: {
      id: 'v_meena',
      transcript: 'Maa, it is Meena. Remember we planted tulsi together?',
      seconds: 5,
      recordedBy: 'u_meena',
      recordedAt: daysAgo(6),
    },
  },
  { id: 'p_arun', name: 'Arun', relationship: 'brother', portraitTone: 'clay', photoUrl: '/people/arun.jpg', voiceNote: { id: 'v_arun', transcript: 'Maa, this is Arun. Remember when we used to sit on the veranda in the evenings?', seconds: 6, recordedBy: 'u_arun', recordedAt: daysAgo(11) } },
  { id: 'p_nita', name: 'Nita', relationship: 'granddaughter', portraitTone: 'dusk', photoUrl: '/people/nita.jpg', voiceNote: { id: 'v_nita', transcript: 'Grandma, it is Nita! I am coming to visit you this weekend.', seconds: 5, recordedBy: 'u_nita', recordedAt: daysAgo(3) } },
  { id: 'p_bhupen', name: 'Bhupen', relationship: 'brother', portraitTone: 'sage', photoUrl: '/people/bhupen.jpg', voiceNote: { id: 'v_bhupen', transcript: 'Didi, it is Bhupen. Are you free to talk after lunch?', seconds: 5, recordedBy: 'u_bhupen', recordedAt: daysAgo(7) } },
]

const memories: Memory[] = [
  {
    id: 'm_tulsi',
    title: 'Planting tulsi on the veranda',
    description: 'Maa and Meena planted tulsi in the blue pot after the first rain in Guwahati.',
    personId: 'p_meena',
    createdByUserId: 'u_meena',
    createdAt: daysAgo(20),
    status: 'approved',
    usableInActivities: true,
  },
  {
    id: 'm_rahul_school',
    title: 'Rahul’s first day at school',
    description: 'She walked him to the gate near the tea garden and waited until the bell rang.',
    personId: 'p_rahul',
    createdByUserId: 'u_meena',
    createdAt: daysAgo(18),
    status: 'approved',
    usableInActivities: true,
  },
  {
    id: 'm_bihu',
    title: 'Bihu dance in the courtyard',
    description: 'Every spring the whole family gathered and Arun played the dhol.',
    personId: 'p_arun',
    createdByUserId: 'u_meena',
    createdAt: daysAgo(14),
    status: 'approved',
    usableInActivities: true,
  },
  {
    id: 'm_nita_letter',
    title: 'Nita’s drawing of the river',
    description: 'Nita drew the Brahmaputra with seven boats and gave it to her grandmother.',
    personId: 'p_nita',
    createdByUserId: 'u_rahul',
    createdAt: daysAgo(4),
    status: 'approved',
    usableInActivities: true,
  },
  {
    id: 'm_bhupen_rupee',
    title: 'Bhupen and the market run',
    description: 'Bhupen carried the cloth bag to the market and bought fresh vegetables every Sunday.',
    personId: 'p_bhupen',
    createdByUserId: 'u_meena',
    createdAt: daysAgo(6),
    status: 'approved',
    usableInActivities: true,
  },
  {
    id: 'm_rahul_voice',
    title: 'A message from Rahul',
    description: 'Rahul recorded a short message from Bengaluru.',
    personId: 'p_rahul',
    createdByUserId: 'u_rahul',
    createdAt: daysAgo(9),
    status: 'approved',
    usableInActivities: true,
    voiceNote: {
      id: 'v_msg_rahul',
      transcript: 'Maa, this is Rahul. I will call you tonight after dinner.',
      seconds: 6,
      recordedBy: 'u_rahul',
      recordedAt: daysAgo(9),
    },
  },
]

const reminders: Reminder[] = [
  {
    id: 'r_med_morning',
    title: 'Morning medicine',
    time: '08:00',
    repeat: 'daily',
    priority: 'important',
    completed: true,
    note: 'One white tablet after breakfast',
  },
  {
    id: 'r_water',
    title: 'Drink water',
    time: '11:30',
    repeat: 'daily',
    priority: 'normal',
    completed: true,
    assignedToUserId: 'u_kamala',
  },
  {
    id: 'r_walk',
    title: 'Evening walk with Kamala',
    time: '17:30',
    repeat: 'daily',
    priority: 'normal',
    completed: false,
    assignedToUserId: 'u_kamala',
  },
]

/**
 * Internal activity results. These numbers are never shown to any user — they only
 * feed direction arrows that are relative to Asha's own baseline.
 */
const history: Array<[number, number, number, number]> = [
  [21, 60, 70, 71],
  [19, 62, 69, 70],
  [18, 61, 71, 73],
  [16, 64, 68, 72],
  [15, 63, 70, 74],
  [13, 66, 66, 73],
  [11, 65, 64, 72],
  [9, 67, 62, 74],
  [7, 68, 60, 73],
  [5, 69, 59, 75],
  [3, 70, 58, 74],
  [1, 71, 57, 75],
]

const sessions: SessionRecord[] = history.map(([ago, memory, attention, recognition], i) => ({
  id: `s_${ago}`,
  date: daysAgo(ago),
  completed: true,
  startedByUserId: i % 4 === 3 ? 'u_kamala' : 'u_meena',
  domainScores: { memory, attention, recognition },
  activityCount: 3,
  gentleCorrections: i % 3 === 0 ? 1 : 0,
}))

const moods: MoodEntry[] = [
  { id: 'mo_5', date: daysAgo(5), userId: 'u_meena', mood: 'good' },
  { id: 'mo_4', date: daysAgo(4), userId: 'u_meena', mood: 'good' },
  { id: 'mo_3', date: daysAgo(3), userId: 'u_meena', mood: 'ok' },
  { id: 'mo_2', date: daysAgo(2), userId: 'u_meena', mood: 'good' },
  { id: 'mo_1', date: daysAgo(1), userId: 'u_meena', mood: 'ok' },
  { id: 'mo_k2', date: daysAgo(2), userId: 'u_kamala', mood: 'good' },
]

export const seedState: AppState = {
  patient: {
    id: 'p_asha',
    name: 'Asha Devi',
    displayName: 'Maa',
    age: 72,
    relationshipToCaregiver: 'Mother',
    region: 'Guwahati, Assam',
    language: 'hi',
    personalizationLevel: 1,
    morningRoutine: ['wake', 'brush', 'tea', 'medicine', 'breakfast'],
    voiceEnabled: true,
    speechRate: 0.85,
    portraitTone: 'amber',
  },
  users: [
    {
      id: 'u_meena',
      name: 'Meena',
      relationship: 'Daughter',
      layer: 1,
      pin: '1234',
      portraitTone: 'lilac',
      canSeeTrends: true,
      callsPatient: 'Maa',
    },
    {
      id: 'u_kamala',
      name: 'Kamala',
      relationship: 'Day helper',
      layer: 2,
      pin: '5678',
      portraitTone: 'sage',
      visibleMemoryIds: ['m_tulsi', 'm_bihu'],
      canSeeTrends: true,
      callsPatient: 'Asha Aunty',
    },
    { id: 'u_rahul', name: 'Rahul', relationship: 'Son', layer: 3, pin: '4321', portraitTone: 'sage', callsPatient: 'Maa' },
  ],
  // No sign-in yet: the app opens on the welcome screen and sets a user when they sign in.
  currentUserId: null,
  people,
  memories,
  reminders,
  sessions,
  moods,
  pendingMoodCheckIn: false,
  invites: [{ id: 'inv_nita', name: 'Nita', contact: 'nita@example.com', layer: 3, sentAt: daysAgo(3), status: 'pending' }],
}
