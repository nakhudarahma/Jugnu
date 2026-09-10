import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Page, ScreenHeader } from '@/components/caregiver/Page'
import { Button, IconButton } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Bits'
import { Field, Segmented, Select, TextArea, TextInput } from '@/components/ui/Form'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Portrait } from '@/components/ui/Portrait'
import type { ResidentStatus } from '@/data/facility'
import { attendance7, deleteResident, getResidents, getWorkerPin, levelBlurb, markMemoryDeleted, saveResidents, signalFor, statusFor, statusLabel, suggestedAction, type FacilityFamilyMember, type FacilityInvite, type FacilityMemory, type MemoryGame } from '@/data/facility'
import { relationshipWord } from '@/lib/lexicon'
import { timeLabel } from '@/lib/date'
import { voice } from '@/lib/voice'
import { allTrends, directionGlyph, directionLabel, domainLabel } from '@/lib/trends'
import type { Reminder, ReminderRepeat, PersonalizationLevel, LanguageCode } from '@/types'

const toneMap: Record<ResidentStatus, { chip: string; banner: string; text: string }> = {
  red: { chip: 'bg-clay-100 text-clay-700', banner: 'border-clay-200 bg-clay-50/60', text: 'text-clay-800' },
  amber: { chip: 'bg-glow-100 text-glow-700', banner: 'border-glow-200 bg-glow-50/60', text: 'text-glow-900' },
  green: { chip: 'bg-sage-100 text-sage-700', banner: 'border-sage-200 bg-sage-50/60', text: 'text-sage-800' },
}

const repeatLabel: Record<ReminderRepeat, string> = {
  daily: 'Every day',
  weekdays: 'Weekdays',
  weekly: 'Once a week',
  once: 'Just once',
}

interface Draft {
  id?: string
  title: string
  time: string
  repeat: ReminderRepeat
  priority: Reminder['priority']
  note: string
}

const emptyDraft: Draft = { title: '', time: '09:00', repeat: 'daily', priority: 'normal', note: '' }

interface GameItem {
  id: string
  num: string
  name: string
  icon: IconName
  desc: string
  domain: string
  /** Faces for person-based games (Who's Calling / Remember When). */
  people?: Pick<FacilityFamilyMember, 'name' | 'portraitTone' | 'photoUrl'>[]
}

const level1Games: GameItem[] = [
  { id: 'object_match', num: '1', name: 'Object Match', icon: 'sparkle', desc: 'Identify familiar items (kettle, basket, mango)', domain: 'Attention' },
  { id: 'routine_sequencing', num: '2', name: 'Routine Sequencing', icon: 'clock', desc: 'Arrange making tea steps in order', domain: 'Memory' },
  { id: 'pattern_recall', num: '3', name: 'Pattern Recall', icon: 'shield', desc: 'Visual sequence completion & recall', domain: 'Pattern Recognition' },
]

const level2Games: GameItem[] = [
  { id: 'whos_calling', num: '1', name: "Who's Calling?", icon: 'volume', desc: 'Identify familiar recorded family voices', domain: 'Voice Recognition' },
  { id: 'memory_recall', num: '2', name: 'Remember When', icon: 'heart', desc: 'A real memory story, then who was there', domain: 'Memory' },
  { id: 'routine_sequencing', num: '3', name: 'My Daily Routine', icon: 'clock', desc: 'Sequence their own morning routine', domain: 'Memory' },
]

let nextReminderId = 100

const familyRelationships = ['son', 'daughter', 'husband', 'wife', 'brother', 'sister', 'grandson', 'granddaughter', 'nephew', 'neighbour']

interface RecorderState {
  recording: boolean
  seconds: number
  audioUrl?: string
  error: string | null
}

function useRecorder() {
  const [s, setS] = useState<RecorderState>({ recording: false, seconds: 0, error: null })
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const ticker = useRef<number | null>(null)

  const stop = useCallback(() => {
    recorder.current?.stop()
    recorder.current?.stream.getTracks().forEach((t) => t.stop())
    recorder.current = null
    if (ticker.current !== null) window.clearInterval(ticker.current)
    ticker.current = null
    setS((prev) => ({ ...prev, recording: false }))
  }, [])

  useEffect(() => () => stop(), [stop])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setS((prev) => ({ ...prev, error: 'Recording is not available on this device — you can type the message instead.' }))
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunks.current = []
      mr.ondataavailable = (e) => chunks.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' })
        setS((prev) => ({ ...prev, audioUrl: URL.createObjectURL(blob) }))
      }
      mr.start()
      recorder.current = mr
      setS((prev) => ({ ...prev, recording: true, seconds: 0, error: null }))
      ticker.current = window.setInterval(() => setS((prev) => ({ ...prev, seconds: prev.seconds + 1 })), 1000)
    } catch {
      setS((prev) => ({ ...prev, error: 'ot could not reach the microphone — you can type the message instead.' }))
    }
  }, [])

  const reset = useCallback(() => setS({ recording: false, seconds: 0, error: null }), [])

  return { ...s, start, stop, reset }
}

function playMemory(memory: FacilityMemory, language: LanguageCode) {
  if (memory.audioUrl) {
    const audio = new Audio(memory.audioUrl)
    void audio.play().catch(() => {
      if (memory.transcript) voice.speak(memory.transcript, { lang: language, rate: 0.85 })
    })
    return
  }
  if (memory.transcript) voice.speak(memory.transcript, { lang: language, rate: 0.85 })
}

function MemoryRow({ memory, onToggle, onDelete, onPlay }: { memory: FacilityMemory; onToggle?: () => void; onDelete?: () => void; onPlay?: () => void }) {
  const hasVoice = Boolean(memory.audioUrl || memory.transcript)
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-line bg-sand text-ink-faint">
          <Icon name={memory.game === 'whos_calling' ? 'volume' : 'heart'} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink">{memory.title}</p>
          {memory.description && <p className="mt-0.5 text-sm text-ink-soft">{memory.description}</p>}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
            {memory.game === 'whos_calling' && <Chip tone="glow">Who's Calling?</Chip>}
            {memory.game === 'memory_recall' && <Chip tone="sage">Remember When</Chip>}
            {memory.usableInActivities ? <Chip tone="sage">In activities</Chip> : <Chip tone="dusk">Shelf only</Chip>}
          </p>
        </div>
        {hasVoice && onPlay && <IconButton icon="volume" label={`Hear the voice for ${memory.title}`} size={18} onClick={onPlay} />}
        {onDelete && <IconButton icon="trash" label={`Remove ${memory.title}`} size={17} onClick={onDelete} />}
      </div>
      {onToggle && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-xs text-ink-soft">{memory.usableInActivities ? 'Used in activities' : 'On the shelf only'}</p>
          <button
            type="button"
            role="switch"
            aria-checked={memory.usableInActivities}
            aria-label={`Use ${memory.title} in activities`}
            onClick={onToggle}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${memory.usableInActivities ? 'bg-sage-500' : 'bg-dusk-200'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${memory.usableInActivities ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
      )}
    </div>
  )
}

export function HealthWorkerPatientScreen() {
  const { residentId = '' } = useParams()
  const navigate = useNavigate()
  const resident = getResidents().find((r) => r.id === residentId)

  const [reminders, setReminders] = useState<Reminder[]>(() => [...(resident?.reminders ?? [])])
  const [personalizationLevel, setPersonalizationLevel] = useState<PersonalizationLevel>(() => resident?.personalizationLevel ?? 1)
  const [showGamePicker, setShowGamePicker] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Reminder | null>(null)
  const [memories, setMemories] = useState<FacilityMemory[]>(() => [...(resident?.memories ?? [])])
  const [recordOpen, setRecordOpen] = useState(false)
  const [composer, setComposer] = useState<MemoryGame | null>(null)
  const [memoryTitle, setMemoryTitle] = useState('')
  const [memoryDescription, setMemoryDescription] = useState('')
  const [transcript, setTranscript] = useState('')
  const [useInActivities, setUseInActivities] = useState(true)
  const rec = useRecorder()
  const [confirmDeleteMemory, setConfirmDeleteMemory] = useState<FacilityMemory | null>(null)
  const [justSaved, setJustSaved] = useState<FacilityMemory | null>(null)
  const [deleteRecordOpen, setDeleteRecordOpen] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)
  const [levelBlocked, setLevelBlocked] = useState(false)
  const [family, setFamily] = useState<FacilityFamilyMember[]>(() => [...(resident?.family ?? [])])
  const [invites, setInvites] = useState<FacilityInvite[]>(() => [...(resident?.invites ?? [])])
  const [familyModal, setFamilyModal] = useState(false)
  const [familyName, setFamilyName] = useState('')
  const [familyEmail, setFamilyEmail] = useState('')
  const [familyRelation, setFamilyRelation] = useState('son')
  const [removingMember, setRemovingMember] = useState<FacilityFamilyMember | null>(null)
  const [memberPin, setMemberPin] = useState('')
  const [memberPinError, setMemberPinError] = useState(false)
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false)
  const [photoViewOpen, setPhotoViewOpen] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const done = useMemo(() => reminders.filter((r) => r.completed).length, [reminders])

  const changePhoto = (file?: File) => {
    if (!file || !resident) return
    const reader = new FileReader()
    reader.onload = () => {
      resident.photoUrl = String(reader.result)
      saveResidents()
      setForceRender((n) => n + 1)
    }
    reader.readAsDataURL(file)
  }
  const [forceRender, setForceRender] = useState(0)

  const voiceMemories = memories.filter((m) => m.game === 'whos_calling' && m.usableInActivities)
  const storyMemories = memories.filter((m) => m.game === 'memory_recall' && m.usableInActivities)

  const games: GameItem[] = useMemo(() => {
    const personalizable =
      personalizationLevel === 2 && voiceMemories.length >= 1 && storyMemories.length >= 1
    const base = personalizable ? level2Games : level1Games
    if (!personalizable || family.length === 0) return base
    const voiced = family.filter((m) => m.voiceNote)
    return base.map((g) => {
      if (g.id === 'whos_calling') {
        return {
          ...g,
          people: voiced.map((m) => ({ name: m.name, portraitTone: m.portraitTone, photoUrl: m.photoUrl })),
        }
      }
      if (g.id === 'memory_recall') {
        return {
          ...g,
          people: family.slice(0, 3).map((m) => ({ name: m.name, portraitTone: m.portraitTone, photoUrl: m.photoUrl })),
        }
      }
      return g
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalizationLevel, family, voiceMemories, storyMemories])

  const canPersonalize = voiceMemories.length >= 1 && storyMemories.length >= 1

  // Self-heal: an old stored profile can pin Level 2 with no usable memories (the
  // gate below used to be checked only when the worker actively changed the level).
  // If Level 2 isn't supportable right now, pull the resident back to Level 1 and
  // persist it so the picker, session plan and game grid all agree.
  useEffect(() => {
    if (personalizationLevel !== 2 || canPersonalize || !resident) return
    setPersonalizationLevel(1)
    if (resident.personalizationLevel !== 1) {
      resident.personalizationLevel = 1
      saveResidents()
    }
  }, [personalizationLevel, canPersonalize, resident])

  const handleLevelChange = (level: PersonalizationLevel) => {
    if (level === 2 && !canPersonalize) {
      setLevelBlocked(true)
      return
    }
    setPersonalizationLevel(level)
    if (resident && resident.personalizationLevel !== level) {
      resident.personalizationLevel = level
      saveResidents()
    }
  }

  const goToSession = (game?: string) => {
    const base = `/healthworker/${residentId}/session`
    navigate(game ? `${base}?game=${game}` : base)
  }

  const toggleDone = (id: string) =>
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r)))

  const saveDraft = () => {
    if (!draft || !draft.title.trim()) return
    const payload: Omit<Reminder, 'id' | 'completed'> = {
      title: draft.title.trim(),
      time: draft.time,
      repeat: draft.repeat,
      priority: draft.priority,
      note: draft.note.trim() || undefined,
    }
    if (draft.id) {
      setReminders((prev) => prev.map((r) => (r.id === draft.id ? { ...r, ...payload } : r)))
    } else {
      const id = `rem_hw_${++nextReminderId}`
      setReminders((prev) => [...prev, { id, completed: false, ...payload }])
    }
    setDraft(null)
  }

  const deleteDraft = () => {
    if (confirmDelete) setReminders((prev) => prev.filter((r) => r.id !== confirmDelete.id))
    setConfirmDelete(null)
  }

  const deleteMemory = () => {
    if (confirmDeleteMemory && resident) {
      markMemoryDeleted(confirmDeleteMemory.id)
      resident.memories = resident.memories.filter((m) => m.id !== confirmDeleteMemory.id)
      setMemories([...resident.memories])
      saveResidents()
    }
    setConfirmDeleteMemory(null)
  }

  const openDeleteRecord = () => {
    setPinInput('')
    setPinError(false)
    setDeleteRecordOpen(true)
  }

  const confirmDeleteRecord = () => {
    if (!resident) return
    if (pinInput === getWorkerPin()) {
      deleteResident(resident.id)
      navigate('/healthworker')
    } else {
      setPinError(true)
    }
  }

  const toggleMemoryUse = (id: string) => {
    if (!resident) return
    resident.memories = resident.memories.map((m) => (m.id === id ? { ...m, usableInActivities: !m.usableInActivities } : m))
    setMemories([...resident.memories])
    saveResidents()
  }

  const openComposer = (game: MemoryGame) => {
    setRecordOpen(false)
    setComposer(game)
    setMemoryTitle(game === 'whos_calling' ? "Who's Calling: Voice clip" : 'Remember When: A story')
    setMemoryDescription('')
    setTranscript('')
    setUseInActivities(true)
    rec.reset()
  }

  const saveMemory = () => {
    if (!composer || !memoryTitle.trim() || !resident) return
    const memory: FacilityMemory = {
      id: `fm_${Date.now()}`,
      title: memoryTitle.trim(),
      description: memoryDescription.trim() || undefined,
      game: composer,
      audioUrl: rec.audioUrl,
      transcript: transcript.trim() || undefined,
      usableInActivities: useInActivities,
    }
    resident.memories = [memory, ...resident.memories]
    setMemories([...resident.memories])
    saveResidents()
    setJustSaved(memory)
  }

  const familyEmailOk = /^\S+@\S+\.\S+$/.test(familyEmail.trim())

  const sendFamilyInvite = () => {
    if (!resident || !familyName.trim() || !familyEmailOk) return
    const invite: FacilityInvite = {
      id: `inv_${Date.now()}`,
      name: familyName.trim(),
      email: familyEmail.trim(),
      relationship: familyRelation,
      sentAt: 'Just now',
    }
    resident.invites = [invite, ...resident.invites]
    setInvites([...resident.invites])
    saveResidents()
    setFamilyName('')
    setFamilyEmail('')
    setFamilyRelation('son')
    setFamilyModal(false)
  }

  const revokeInvite = (id: string) => {
    if (!resident) return
    resident.invites = resident.invites.filter((i) => i.id !== id)
    setInvites([...resident.invites])
    saveResidents()
  }

  const openRemoveMember = (member: FacilityFamilyMember) => {
    setMemberPin('')
    setMemberPinError(false)
    setRemovingMember(member)
  }

  const confirmRemoveMember = () => {
    if (!resident || !removingMember) return
    if (memberPin !== getWorkerPin()) {
      setMemberPinError(true)
      return
    }
    resident.family = resident.family.filter((m) => m.id !== removingMember.id)
    setFamily([...resident.family])
    saveResidents()
    setRemovingMember(null)
  }

  if (!resident) {
    return (
      <Page>
        <ScreenHeader title="Patient not found" backTo="/healthworker" />
        <p className="text-sm text-ink-soft">This patient is no longer in the roster.</p>
      </Page>
    )
  }

  const status = statusFor(resident)
  const tone = toneMap[status]
  const attended = attendance7(resident)

  if (composer) {
    const isWhosCalling = composer === 'whos_calling'
    const canSave = memoryTitle.trim().length > 1
    return (
      <Page>
        <header className="flex items-start justify-between gap-4 pb-5 pt-6">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={() => { setComposer(null); rec.stop() }}
              aria-label="Back"
              className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-paper text-ink-soft shadow-card transition duration-200 ease-calm hover:border-glow-300 hover:text-ink"
            >
              <Icon name="back" size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-[1.6rem] leading-tight text-ink">Record a memory</h1>
              {<p className="mt-1 text-sm text-ink-soft">{`Something for ${resident.name}. It reaches the shelf as soon as you save it.`}</p>}
            </div>
          </div>
          <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-line shadow-card">
            <Portrait name={resident.name} tone={resident.portraitTone} photoUrl={resident.photoUrl} compact />
          </span>
        </header>

        <div className="space-y-4">
          <div className={`rounded-card border p-4 shadow-card ${isWhosCalling ? 'border-glow-300 bg-glow-50/90' : 'border-sage-300 bg-sage-50/90'}`}>
            <div className="flex items-start gap-3">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${isWhosCalling ? 'bg-glow-200 text-glow-800' : 'bg-sage-200 text-sage-800'}`}>
                <Icon name={isWhosCalling ? 'volume' : 'heart'} size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base text-ink">
                  Recording for "{isWhosCalling ? "Who's Calling?" : 'Remember When'}" Game
                </h3>
                <p className="mt-1 text-xs text-ink-soft leading-relaxed">
                  {isWhosCalling
                    ? 'Record a short, cheerful voice greeting (5–10 seconds) saying who you are and where you are calling from. For example: "Hello, it is your family calling! Just calling to say I love you."'
                    : 'Share a fond memory or story (e.g., "Remember our walk to the temple on the festival morning?"). It helps spark gentle, positive reminiscence during their activities.'}
                </p>
              </div>
            </div>
          </div>

          <div className="card card-pad space-y-4">
            <Field label="What is this memory?" required>
              {(id) => <TextInput id={id} value={memoryTitle} placeholder={isWhosCalling ? 'Who is calling?' : 'A place, a day, a small moment'} onChange={(e) => setMemoryTitle(e.target.value)} />}
            </Field>
            <Field label="The story" hint="A sentence or two, in your own words.">
              {(id) => (
                <TextArea id={id} value={memoryDescription} placeholder="A short, warm line about what happened and why it matters." onChange={(e) => setMemoryDescription(e.target.value)} />
              )}
            </Field>
          </div>

          <div className="card card-pad space-y-4">
            <div>
              <p className="label-eyebrow">{isWhosCalling ? 'The voice' : 'A voice note'}</p>
              <p className="mt-1 text-xs text-ink-faint">
                Record on this device, or type the words and Jugnu will speak them in {resident.name}'s language.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {rec.recording ? (
                <>
                  <button
                    type="button"
                    onClick={rec.stop}
                    className="inline-flex items-center gap-2 rounded-full bg-clay-100 px-4 py-2.5 text-sm font-semibold text-clay-700 transition hover:bg-clay-200"
                  >
                    <Icon name="mic" size={16} />
                    Stop recording {rec.seconds}s
                  </button>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-clay-600">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-clay-500" />
                    Listening…
                  </span>
                </>
              ) : rec.audioUrl ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const audio = new Audio(rec.audioUrl)
                      void audio.play().catch(() => {
                        if (transcript.trim()) voice.speak(transcript, { lang: resident.language, rate: 0.85 })
                      })
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-sage-100 px-4 py-2.5 text-sm font-semibold text-sage-700 transition hover:bg-sage-200"
                  >
                    <Icon name="volume" size={16} />
                    Play recording
                  </button>
                  <Button variant="ghost" icon="trash" onClick={rec.reset}>
                    Re-record
                  </Button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={rec.start}
                  className="inline-flex items-center gap-2 rounded-full bg-glow-100 px-4 py-2.5 text-sm font-semibold text-glow-800 transition hover:bg-glow-200"
                >
                  <Icon name="mic" size={16} />
                  Record a voice note
                </button>
              )}
            </div>

            {rec.error && <p className="text-xs text-clay-600">{rec.error}</p>}

            <Field label="Or type what was said" hint="Fallback when the microphone is unavailable.">
              {(id) => (
                <TextArea id={id} value={transcript} placeholder="Hello, it is your family calling! Just calling to say I love you." onChange={(e) => setTranscript(e.target.value)} />
              )}
            </Field>
          </div>

          <div className="card card-pad">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">Use in activities</p>
                <p className="mt-0.5 text-xs text-ink-soft">On adds it straight into their games; off keeps it on the shelf only.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={useInActivities}
                aria-label="Use this memory in activities"
                onClick={() => setUseInActivities((prev) => !prev)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${useInActivities ? 'bg-sage-500' : 'bg-dusk-200'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${useInActivities ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          <Button variant="primary" icon="check" block className="text-lg" onClick={saveMemory} disabled={!canSave}>
            Save to {resident.name}'s shelf
          </Button>
        </div>
      </Page>
    )
  }

  if (justSaved) {
    return (
      <Page>
        <header className="flex items-start justify-between gap-4 pb-5 pt-6">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={() => setJustSaved(null)}
              aria-label="Back"
              className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-paper text-ink-soft shadow-card transition duration-200 ease-calm hover:border-glow-300 hover:text-ink"
            >
              <Icon name="back" size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-[1.6rem] leading-tight text-ink">Saved</h1>
            </div>
          </div>
        </header>
        <div className="card card-pad flex flex-col items-center gap-4 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-sage-100 text-sage-700">
            <Icon name="check" size={26} />
          </span>
          <div>
            <h2 className="font-display text-xl text-ink">Memory saved</h2>
            <p className="mt-1.5 text-sm text-ink-soft">
              {justSaved.usableInActivities
                ? `Jugnu can use this in ${resident.name}'s activities from the next session.`
                : 'Kept in the memory shelf. You can switch it on for activities any time.'}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="primary" onClick={() => setJustSaved(null)}>
              View shelf
            </Button>
            <Button
              variant="secondary"
              icon="plus"
              onClick={() => {
                setJustSaved(null)
                setComposer(null)
                setRecordOpen(true)
              }}
            >
              Record another
            </Button>
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <ScreenHeader
        title={resident.name}
        subtitle={`${resident.age} years`}
        backTo="/healthworker"
        action={
          <button
            type="button"
            onClick={() => setPhotoMenuOpen(true)}
            className="relative block h-14 w-14 cursor-pointer overflow-hidden rounded-full border border-line shadow-card transition duration-200 hover:scale-[1.03]"
          >
            <Portrait name={resident.name} tone={resident.portraitTone} photoUrl={resident.photoUrl} compact />
          </button>
        }
      />

      <div key={forceRender} className="space-y-4">
        {/* Status */}
        <section className={`rounded-card border p-5 sm:p-6 ${tone.banner}`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="label-eyebrow">Current status</h2>
            <Chip tone={status === 'red' ? 'clay' : status === 'amber' ? 'glow' : 'sage'}>{statusLabel[status]}</Chip>
          </div>
          <p className={`mt-2 font-display text-xl leading-snug ${tone.text}`}>{signalFor(resident)}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            <span className="font-semibold text-ink">Suggested action: </span>
            {suggestedAction(resident)}
          </p>
        </section>

        {/* Personalization level */}
        <section className="card card-pad">
          <p className="label-eyebrow">Personalization level</p>
          <p className="mt-1 text-xs text-ink-faint">
            {personalizationLevel === 2
              ? "Who's Calling, Remember When and My Daily Routine — using family voices and real memories."
              : 'Object match, routine sequencing and pattern recall. Regionally familiar imagery, no personal data.'}
          </p>
          <div className="mt-3">
            <Segmented
              label="Personalization level"
              value={personalizationLevel}
              onChange={handleLevelChange}
              options={([1, 2] as PersonalizationLevel[]).map((level) => ({
                value: level,
                label: levelBlurb[level].label,
                description: levelBlurb[level].description,
              }))}
            />
          </div>
        </section>

        {/* Today's activity + Game picker (inline like DailyActivityCard) */}
        <section className={`relative overflow-hidden rounded-card border shadow-card transition-all duration-300 ${
          resident.todaySession === 'done' ? 'border-sage-100 bg-sage-100/50' : 'border-glow-200 bg-gradient-to-br from-glow-50 to-glow-100/70'
        }`}>
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="label-eyebrow">Today's Activity</p>
            </div>

            {resident.todaySession === 'done' ? (
              <>
                <h2 className="mt-2 flex items-center gap-2 font-display text-2xl text-sage-700">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-sage-500 text-white">
                    <Icon name="check" size={18} />
                  </span>
                  Completed
                </h2>
                <p className="mt-2 text-sm text-ink-soft">
                  {resident.name} finished {resident.games.length} activities today.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="secondary" icon="play" onClick={() => goToSession()}>
                    Play full session again
                  </Button>
                  <Button variant="ghost" icon="sparkle" onClick={() => setShowGamePicker((prev) => !prev)}>
                    {showGamePicker ? 'Close game picker' : 'Pick a single game'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h2 className="mt-2 font-display text-2xl text-ink">
                  {resident.todaySession === 'scheduled' ? `Scheduled for ${resident.scheduledTime}` : 'Not started yet'}
                </h2>
                <p className="mt-2 max-w-md text-sm text-ink-soft">
                  A gentle set of {games.length} activities. You can start the full session or select an individual game below.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => goToSession()}
                    className="flex flex-1 min-w-[200px] items-center justify-center gap-3 rounded-[22px] bg-glow-500 px-6 py-4 text-base font-semibold text-white shadow-glow transition duration-200 ease-calm hover:bg-glow-600 active:scale-[0.995] sm:text-lg"
                  >
                    <Icon name="play" size={20} />
                    Start Full Session ({games.length} Games)
                  </button>
                  <Button variant="secondary" icon="sparkle" onClick={() => setShowGamePicker((prev) => !prev)} className="px-4 py-4 text-sm">
                    {showGamePicker ? 'Hide Options' : 'Select Game'}
                  </Button>
                </div>
              </>
            )}

            {/* Individual Game Selector Panel */}
            {showGamePicker && (
              <div className="mt-6 pt-5 border-t border-line/60 animate-rise-in space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                    Select an individual game to play:
                  </p>
                  <span className="text-[11px] text-ink-faint">Single activity · Hands over to {resident.name}</span>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {games.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => goToSession(g.id)}
                      className="group flex flex-col justify-between rounded-2xl border border-line bg-paper/90 p-3.5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-glow-300 hover:bg-glow-50/50 hover:shadow-card active:translate-y-0"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-sand/70 text-ink text-xs font-semibold group-hover:bg-glow-200 group-hover:text-glow-800">
                            {g.num}
                          </span>
                          <span className="text-[10px] font-medium text-ink-faint">{g.domain}</span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-ink group-hover:text-glow-900">{g.name}</p>
                        <p className="mt-1 text-xs text-ink-soft leading-relaxed">{g.desc}</p>
                      </div>
                      <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-glow-800">
                        <Icon name="play" size={13} />
                        <span>Play this</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Cognitive-domain trends */}
        <section className="card card-pad">
          <p className="label-eyebrow">Cognitive-domain trends</p>
          <ul className="mt-3 divide-y divide-line">
            {allTrends(resident.sessions).map((trend) => (
              <li key={trend.domain} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm font-medium text-ink">{domainLabel[trend.domain]}</span>
                <span className="inline-flex items-center gap-2 text-sm text-ink-soft">
                  <span className={trend.direction === 'declining' ? 'text-clay-600' : trend.direction === 'improving' ? 'text-sage-600' : 'text-dusk-700'}>
                    {directionGlyph[trend.direction]}
                  </span>
                  {directionLabel[trend.direction]}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Recent game performance */}
        <section className="card card-pad">
          <p className="label-eyebrow">Recent game performance</p>
          <ul className="mt-3 divide-y divide-line">
            {resident.games.length === 0 && <li className="py-2.5 text-sm text-ink-soft">No sessions recorded yet.</li>}
            {resident.games.map((game) => (
              <li key={game.name} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm font-medium text-ink">{game.name}</span>
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-sand px-3 py-1 text-xs font-semibold text-ink-soft">
                  <Icon name="check" size={13} className="text-sage-600" />
                  {game.rounds} rounds
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Attendance */}
        <section className="card card-pad">
          <p className="label-eyebrow">Session attendance</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            <span className="font-display text-2xl text-ink">{attended.attended}</span>
            <span className="text-ink-faint"> of the last {attended.of} days</span>
          </p>
        </section>

        {/* Memory shelf — matches family MemoriesScreen card pattern */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="label-eyebrow mb-0">Memory shelf</p>
              {memories.length > 0 && (
                <span className="rounded-full bg-sand px-2 py-0.5 text-[11px] font-medium text-ink-faint">
                  {memories.length}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setRecordOpen(true)}
              className="inline-flex items-center gap-1 rounded-pill bg-glow-100 px-3 py-1.5 text-xs font-semibold text-glow-800 transition hover:bg-glow-200"
            >
              <Icon name="plus" size={14} />
              Add memory
            </button>
          </div>
          {memories.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 py-8 text-center">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-sand/60 text-ink-faint">
                <Icon name="image" size={18} />
              </span>
              <p className="text-sm text-ink-soft">No memories yet.</p>
              <button
                type="button"
                onClick={() => setRecordOpen(true)}
                className="text-sm font-semibold text-glow-700 hover:text-glow-800"
              >
                Add one
              </button>
            </div>
          ) : (
            memories.map((memory) => (
              <MemoryRow
                key={memory.id}
                memory={memory}
                onPlay={() => playMemory(memory, resident.language)}
                onToggle={() => toggleMemoryUse(memory.id)}
                onDelete={() => setConfirmDeleteMemory(memory)}
              />
            ))
          )}
        </section>

        {/* Family circle */}
        <section className="card card-pad">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-line/70">
            <div className="flex items-center gap-2">
              <p className="label-eyebrow mb-0">Family circle</p>
              <span className="rounded-full bg-sand px-2 py-0.5 text-[11px] font-medium text-ink-faint">
                {family.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => { setFamilyName(''); setFamilyEmail(''); setFamilyRelation('son'); setFamilyModal(true) }}
              className="inline-flex items-center gap-1 rounded-pill bg-glow-100 px-3 py-1.5 text-xs font-semibold text-glow-800 transition hover:bg-glow-200"
            >
              <Icon name="plus" size={14} />
              Add family
            </button>
          </div>
          {family.length === 0 && invites.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-sand/60 text-ink-faint">
                <Icon name="users" size={18} />
              </span>
              <p className="text-sm text-ink-soft">No family connected yet.</p>
              <button
                type="button"
                onClick={() => { setFamilyName(''); setFamilyEmail(''); setFamilyRelation('son'); setFamilyModal(true) }}
                className="text-sm font-semibold text-glow-700 hover:text-glow-800"
              >
                Invite by email
              </button>
            </div>
          ) : (
            <>
              {invites.length > 0 && (
                <div className="pb-2">
                  <p className="pt-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">Waiting to accept</p>
                  <ul className="mt-2 divide-y divide-line/60">
                    {invites.map((invite) => (
                      <li key={invite.id} className="flex items-center gap-3 py-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sand/70 text-ink-faint">
                          <Icon name="users" size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{invite.name}</p>
                          <p className="truncate text-xs text-ink-soft">
                            {invite.email} · {invite.relationship} · {invite.sentAt}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Revoke invite to ${invite.name}`}
                          onClick={() => revokeInvite(invite.id)}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-faint transition hover:bg-clay-50 hover:text-clay-700"
                        >
                          <Icon name="close" size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {family.length > 0 && (
                <>
                  {invites.length > 0 && <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">In the circle</p>}
                  <ul className="divide-y divide-line/60">
                    {family.map((member) => (
                      <li key={member.id} className="flex items-center gap-3 py-3">
                        <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-line">
                          <Portrait name={member.name} tone={member.portraitTone} photoUrl={member.photoUrl} compact />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{member.name}</p>
                          <p className="text-xs text-ink-soft capitalize">{relationshipWord(member.relationship, resident.language)}</p>
                        </div>
                        {member.voiceNote ? (
                          <span className="chip shrink-0 bg-glow-100 text-glow-800">
                            <Icon name="volume" size={12} /> Voice
                          </span>
                        ) : null}
                        <button
                          type="button"
                          aria-label={`Remove ${member.name}`}
                          onClick={() => openRemoveMember(member)}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-faint transition hover:bg-clay-50 hover:text-clay-700"
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
          <p className="mt-3 border-t border-line/70 pt-3 text-xs leading-relaxed text-ink-faint">
            Family members are invited by email. Once they accept, they appear here and their voices can be recorded for games.
          </p>
        </section>

        {/* Reminders */}
        <section className="card card-pad">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-line/70">
            <div className="flex items-center gap-2">
              <p className="label-eyebrow mb-0">Reminders</p>
              {reminders.length > 0 && (
                <span className="rounded-full bg-sand px-2 py-0.5 text-[11px] font-medium text-ink-faint">
                  {done}/{reminders.length}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setDraft(emptyDraft)}
              className="inline-flex items-center gap-1 rounded-pill bg-glow-100 px-3 py-1.5 text-xs font-semibold text-glow-800 transition hover:bg-glow-200"
            >
              <Icon name="plus" size={14} />
              Add
            </button>
          </div>
          {reminders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-sand/60 text-ink-faint">
                <Icon name="bell" size={18} />
              </span>
              <p className="text-sm text-ink-soft">No reminders yet.</p>
              <button
                type="button"
                onClick={() => setDraft(emptyDraft)}
                className="text-sm font-semibold text-glow-700 hover:text-glow-800"
              >
                Add one
              </button>
            </div>
          ) : (
            <ul className="mt-1 divide-y divide-line/60">
              {reminders
                .slice()
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((reminder) => (
                  <li key={reminder.id} className="group flex items-center gap-3 py-2.5">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={reminder.completed}
                      aria-label={`Mark ${reminder.title} as ${reminder.completed ? 'not done' : 'done'}`}
                      onClick={() => toggleDone(reminder.id)}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition ${
                        reminder.completed ? 'border-sage-500 bg-sage-500 text-white' : 'border-dusk-200 bg-paper text-transparent hover:border-glow-400'
                      }`}
                    >
                      <Icon name="check" size={13} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${reminder.completed ? 'text-ink-faint line-through' : 'text-ink'}`}>
                          {reminder.title}
                        </span>
                        {reminder.priority === 'important' && (
                          <span className="rounded bg-clay-50 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-clay-600">Important</span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[12px] text-ink-faint">
                        <Icon name="clock" size={12} className="shrink-0 opacity-50" />
                        <span>{timeLabel(reminder.time)}</span>
                        <span aria-hidden="true" className="opacity-30">·</span>
                        <span>{repeatLabel[reminder.repeat]}</span>
                        {reminder.note && (
                          <>
                            <span aria-hidden="true" className="opacity-30">·</span>
                            <span className="truncate">{reminder.note}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                      <button
                        type="button"
                        aria-label={`Edit ${reminder.title}`}
                        onClick={() => setDraft({ id: reminder.id, title: reminder.title, time: reminder.time, repeat: reminder.repeat, priority: reminder.priority, note: reminder.note ?? '' })}
                        className="grid h-8 w-8 place-items-center rounded-full text-ink-faint transition hover:bg-sand hover:text-ink"
                      >
                        <Icon name="pencil" size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${reminder.title}`}
                        onClick={() => setConfirmDelete(reminder)}
                        className="grid h-8 w-8 place-items-center rounded-full text-ink-faint transition hover:bg-clay-50 hover:text-clay-700"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>

      {/* Delete patient record */}
      <div className="mt-10 border-t border-line pt-8">
        <Button variant="danger" icon="trash" onClick={openDeleteRecord} block>Delete patient record</Button>
        <p className="mt-2 text-center text-xs text-ink-faint">Permanently removes {resident.name}'s profile, memories and session history.</p>
      </div>

      {/* Reminder modals */}
      <Modal open={Boolean(draft)} onClose={() => setDraft(null)} title={draft?.id ? 'Edit reminder' : 'New reminder'} description="Reminders shape their day. Keep the wording simple and familiar."
        footer={<><Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button variant="primary" icon="check" onClick={saveDraft} disabled={!draft?.title.trim()}>{draft?.id ? 'Save changes' : 'Add reminder'}</Button></>}
      >
        {draft && (
          <div className="space-y-4">
            <Field label="What is it?" required>
              {(id) => <TextInput id={id} value={draft.title} placeholder="Morning medicine" onChange={(e) => setDraft({ ...draft, title: e.target.value })} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Time">
                {(id) => <TextInput id={id} type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />}
              </Field>
              <Field label="Repeat">
                {(id) => (
                  <Select id={id} value={draft.repeat} onChange={(e) => setDraft({ ...draft, repeat: e.target.value as ReminderRepeat })}>
                    {(Object.keys(repeatLabel) as ReminderRepeat[]).map((key) => <option key={key} value={key}>{repeatLabel[key]}</option>)}
                  </Select>
                )}
              </Field>
            </div>
            <Field label="Priority">
              {() => (
                <div role="radiogroup" aria-label="Priority" className="grid grid-cols-2 gap-2">
                  {(['normal', 'important'] as const).map((level) => {
                    const selected = draft.priority === level
                    return (
                      <button key={level} type="button" role="radio" aria-checked={selected} onClick={() => setDraft({ ...draft, priority: level })}
                        className={`rounded-2xl border px-4 py-3 text-left transition duration-200 ease-calm ${selected ? 'border-glow-400 bg-glow-50 shadow-card' : 'border-line bg-paper hover:border-glow-200'}`}
                      >
                        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                          <span aria-hidden="true" className={`grid h-4 w-4 place-items-center rounded-full border-2 ${selected ? 'border-glow-500' : 'border-line'}`}>
                            {selected && <span className="h-2 w-2 rounded-full bg-glow-500" />}
                          </span>
                          {level === 'normal' ? 'Normal' : 'Important'}
                        </span>
                        <span className="mt-1 block pl-6 text-xs text-ink-soft">{level === 'normal' ? 'Part of the usual routine' : 'Medicines and appointments'}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </Field>
            <Field label="Note" hint="Optional. Anything the helper should know.">
              {(id) => <TextArea id={id} value={draft.note} placeholder="One white tablet after breakfast" onChange={(e) => setDraft({ ...draft, note: e.target.value })} />}
            </Field>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} size="sm" title="Remove this reminder?"
        description={confirmDelete ? `"${confirmDelete.title}" will no longer appear in the routine.` : undefined}
        footer={<><Button variant="ghost" onClick={() => setConfirmDelete(null)}>Keep it</Button><Button variant="danger" icon="trash" onClick={deleteDraft}>Remove</Button></>}
      >
        <p className="text-sm text-ink-soft">Nothing else changes — past sessions and trends stay as they are.</p>
      </Modal>

      {/* "Record for their games" picker */}
      <Modal
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        title="Record for their games"
        description={`Two of ${resident.name}'s games need your voice and memories. What are you adding?`}
        size="sm"
      >
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => openComposer('whos_calling')}
            className="flex w-full items-start gap-3 rounded-2xl border border-line bg-paper p-4 text-left transition duration-200 ease-calm hover:border-glow-300 hover:bg-glow-50/60"
          >
            <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-glow-50 text-glow-700">
              <Icon name="volume" size={19} />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-ink">Who's Calling?</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
                Record a short voice greeting from a family member for the recognition game.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => openComposer('memory_recall')}
            className="flex w-full items-start gap-3 rounded-2xl border border-line bg-paper p-4 text-left transition duration-200 ease-calm hover:border-sage-300 hover:bg-sage-50/60"
          >
            <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage-50 text-sage-700">
              <Icon name="heart" size={19} />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-ink">Remember When</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
                Share a real memory story — a place, a day, a small moment with {resident.name}.
              </span>
            </span>
          </button>
        </div>
      </Modal>

      <Modal open={Boolean(confirmDeleteMemory)} onClose={() => setConfirmDeleteMemory(null)} size="sm" title="Remove this memory?"
        description={confirmDeleteMemory ? `"${confirmDeleteMemory.title}" will no longer appear in the shelf.` : undefined}
        footer={<><Button variant="ghost" onClick={() => setConfirmDeleteMemory(null)}>Keep it</Button><Button variant="danger" icon="trash" onClick={deleteMemory}>Remove</Button></>}
      >
        <p className="text-sm text-ink-soft">Nothing else changes — past sessions and trends stay as they are.</p>
      </Modal>

      {/* Add family member — via email */}
      <Modal
        open={familyModal}
        onClose={() => setFamilyModal(false)}
        title="Invite family by email"
        description={`An invitation is sent to ${resident.name}'s family member. They join the circle once they accept.`}
        size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setFamilyModal(false)}>Cancel</Button>
          <Button variant="primary" icon="send" onClick={sendFamilyInvite} disabled={!familyName.trim() || !familyEmailOk}>Send invitation</Button>
        </>}
      >
        <div className="space-y-4">
          <Field label="Full name" required>
            {(id) => <TextInput id={id} value={familyName} placeholder="e.g. Rahul" onChange={(e) => setFamilyName(e.target.value)} autoFocus />}
          </Field>
          <Field label="Email address" required hint="Invitations are sent by email only.">
            {(id) => (
              <TextInput
                id={id}
                type="email"
                autoComplete="email"
                inputMode="email"
                value={familyEmail}
                placeholder="rahul@example.com"
                onChange={(e) => setFamilyEmail(e.target.value)}
              />
            )}
          </Field>
          <Field label="Relationship to them">
            {(id) => (
              <Select id={id} value={familyRelation} onChange={(e) => setFamilyRelation(e.target.value)}>
                {familyRelationships.map((rel) => <option key={rel} value={rel}>{relationshipWord(rel, 'en')}</option>)}
              </Select>
            )}
          </Field>
          <p className="text-xs leading-relaxed text-ink-faint">
            This demo keeps everything on this device, so the invitation simply appears in the waiting list until they accept.
          </p>
        </div>
      </Modal>

      {/* Photo menu — clicking the patient portrait opens this */}
      <Modal
        open={photoMenuOpen}
        onClose={() => setPhotoMenuOpen(false)}
        title="Patient photo"
        size="sm"
      >
        <div className="flex flex-col gap-3">
          {resident.photoUrl && (
            <button
              type="button"
              onClick={() => { setPhotoMenuOpen(false); setPhotoViewOpen(true) }}
              className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-4 text-left transition hover:border-sage-200 hover:bg-sage-50/30"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage-50 text-sage-700">
                <Icon name="image" size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">View photo</p>
                <p className="mt-0.5 text-xs text-ink-soft">See the full-size image</p>
              </div>
            </button>
          )}
          <button
            type="button"
            onClick={() => { setPhotoMenuOpen(false); photoInputRef.current?.click() }}
            className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-4 text-left transition hover:border-glow-200 hover:bg-glow-50/30"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-glow-50 text-glow-700">
              <Icon name="image" size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{resident.photoUrl ? 'Change photo' : 'Add a photo'}</p>
              <p className="mt-0.5 text-xs text-ink-soft">Choose a photo from your device</p>
            </div>
          </button>
          {resident.photoUrl && (
            <button
              type="button"
              onClick={() => { setPhotoMenuOpen(false); resident.photoUrl = undefined; saveResidents(); setForceRender((n) => n + 1) }}
              className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-4 text-left transition hover:border-clay-200 hover:bg-clay-50/30"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-clay-50 text-clay-700">
                <Icon name="trash" size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Remove photo</p>
                <p className="mt-0.5 text-xs text-ink-soft">Revert to generated portrait</p>
              </div>
            </button>
          )}
        </div>
      </Modal>

      {/* Full-size photo viewer */}
      <Modal open={photoViewOpen} onClose={() => setPhotoViewOpen(false)} title={resident.name} size="lg">
        {resident.photoUrl ? (
          <img src={resident.photoUrl} alt={resident.name} className="mx-auto max-h-[60vh] rounded-2xl object-contain" />
        ) : (
          <div className="flex items-center justify-center py-8 text-sm text-ink-soft">No photo</div>
        )}
      </Modal>
      <input ref={photoInputRef} type="file" accept="image/*" className="sr-only" onChange={(e) => { changePhoto(e.target.files?.[0]); if (photoInputRef.current) photoInputRef.current.value = '' }} />

      {/* Level 2 blocked — not enough memories */}
      <Modal
        open={levelBlocked}
        onClose={() => setLevelBlocked(false)}
        title="Personalized games aren't ready yet"
        description={`Level 2 uses Who's Calling (a recorded family voice) and Remember When (a real memory story).`}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink">Readiness</span>
              <span className="font-medium text-ink-soft">{Math.min(voiceMemories.length, 1) + Math.min(storyMemories.length, 1)} of 2</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand">
              <div
                className="h-full rounded-full bg-gradient-to-r from-glow-400 to-sage-400 transition-all duration-500 ease-calm"
                style={{ width: `${((Math.min(voiceMemories.length, 1) + Math.min(storyMemories.length, 1)) / 2) * 100}%` }}
              />
            </div>
          </div>

          {/* Who's Calling card */}
          <div className={`rounded-2xl border p-4 transition duration-200 ease-calm ${voiceMemories.length >= 1 ? 'border-sage-200 bg-sage-50/50' : 'border-line bg-paper'}`}>
            <div className="flex items-start gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${voiceMemories.length >= 1 ? 'bg-sage-100 text-sage-700' : 'bg-glow-50 text-glow-700'}`}>
                <Icon name="volume" size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Who's Calling?</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                  {voiceMemories.length >= 1
                    ? 'A family voice is recorded and ready for play.'
                    : 'Record a short voice greeting from a family member for recognition.'}
                </p>
              </div>
              {voiceMemories.length >= 1 ? (
                <span className="chip shrink-0 bg-sage-100 text-sage-700">
                  <Icon name="check" size={12} /> Ready
                </span>
              ) : (
                <Button variant="ghost" icon="plus" onClick={() => { setLevelBlocked(false); openComposer('whos_calling') }}>
                  Add
                </Button>
              )}
            </div>
          </div>

          {/* Remember When card */}
          <div className={`rounded-2xl border p-4 transition duration-200 ease-calm ${storyMemories.length >= 1 ? 'border-sage-200 bg-sage-50/50' : 'border-line bg-paper'}`}>
            <div className="flex items-start gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${storyMemories.length >= 1 ? 'bg-sage-100 text-sage-700' : 'bg-sage-50 text-sage-700'}`}>
                <Icon name="heart" size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Remember When</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                  {storyMemories.length >= 1
                    ? 'A real memory story is saved and ready for play.'
                    : 'Share a real memory story — a place, a day, a small moment.'}
                </p>
              </div>
              {storyMemories.length >= 1 ? (
                <span className="chip shrink-0 bg-sage-100 text-sage-700">
                  <Icon name="check" size={12} /> Ready
                </span>
              ) : (
                <Button variant="ghost" icon="plus" onClick={() => { setLevelBlocked(false); openComposer('memory_recall') }}>
                  Add
                </Button>
              )}
            </div>
          </div>

          <p className="text-xs leading-relaxed text-ink-faint">
            Add at least one of each and switch them on in the memory shelf — then Level 2 unlocks for {resident.name}.
          </p>
        </div>
      </Modal>

      {/* Delete patient record — PIN required */}
      <Modal
        open={deleteRecordOpen}
        onClose={() => setDeleteRecordOpen(false)}
        title="Delete patient record?"
        description={resident ? `${resident.name}'s entire record will be permanently removed — memories, sessions and reminders included. This cannot be undone.` : undefined}
        size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setDeleteRecordOpen(false)}>Cancel</Button>
          <Button variant="danger" icon="trash" onClick={confirmDeleteRecord} disabled={!pinInput}>Delete record</Button>
        </>}
      >
        <div className="space-y-3">
          <Field label="Enter your worker PIN" hint="Only a verified worker can delete a patient record.">
            {(id) => (
              <TextInput
                id={id}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pinInput}
                onChange={(e) => { setPinInput(e.target.value); setPinError(false) }}
                placeholder="••••"
                className={pinError ? 'border-clay-400' : undefined}
              />
            )}
          </Field>
          {pinError && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-clay-700">
              <Icon name="lock" size={14} /> That PIN is not correct. Try again.
            </p>
          )}
        </div>
      </Modal>

      {/* Remove family member — PIN required */}
      <Modal
        open={Boolean(removingMember)}
        onClose={() => setRemovingMember(null)}
        title="Remove family member?"
        description={removingMember ? `${removingMember.name} will be removed from ${resident.name}'s circle. Their recorded voices and stories stay in the memory shelf.` : undefined}
        size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setRemovingMember(null)}>Cancel</Button>
          <Button variant="danger" icon="trash" onClick={confirmRemoveMember} disabled={!memberPin}>Remove member</Button>
        </>}
      >
        <div className="space-y-3">
          <Field label="Enter your worker PIN" hint="Only a verified worker can change the family circle.">
            {(id) => (
              <TextInput
                id={id}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={memberPin}
                onChange={(e) => { setMemberPin(e.target.value); setMemberPinError(false) }}
                placeholder="••••"
                className={memberPinError ? 'border-clay-400' : undefined}
              />
            )}
          </Field>
          {memberPinError && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-clay-700">
              <Icon name="lock" size={14} /> That PIN is not correct. Try again.
            </p>
          )}
        </div>
      </Modal>
    </Page>
  )
}