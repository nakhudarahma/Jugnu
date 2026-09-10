import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '@/components/caregiver/Page'
import { CompleteProfilePrompt } from '@/components/caregiver/CompleteProfilePrompt'
import { Button, IconButton } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Field, Select, TextInput } from '@/components/ui/Form'
import { Portrait } from '@/components/ui/Portrait'
import type { FacilityResident, ResidentStatus } from '@/data/facility'
import { addResident, attendance7, getFacilityName, getResidents, getWorkerName, priorityRoster, signalFor, statusFor, statusLabel, weeklyCompletion } from '@/data/facility'
import { languageLabel } from '@/lib/i18n'
import { relativeDayLabel, today, weekDates } from '@/lib/date'
import { allTrends, directionGlyph, domainLabel } from '@/lib/trends'
import type { LanguageCode, MoodValue, TrendDirection } from '@/types'

type Filter = 'all' | ResidentStatus

const HW_MOOD_KEY = 'jugnu_hw_moods_v2'

const moodFace: Record<MoodValue, string> = { good: '😊', ok: '😐', low: '😞' }

const seedMoodCycle: MoodValue[] = ['good', 'ok', 'good', 'good', 'ok', 'low']

/** Demo week: filled check-ins for every past day, so a fresh install starts full. */
function seedMoods(): Record<string, MoodValue> {
  const seeded: Record<string, MoodValue> = {}
  weekDates().forEach((date, i) => {
    if (date < today()) seeded[date] = seedMoodCycle[i % seedMoodCycle.length]
  })
  return seeded
}

function loadMoods(): Record<string, MoodValue> {
  try {
    const raw = localStorage.getItem(HW_MOOD_KEY)
    return raw ? (JSON.parse(raw) as Record<string, MoodValue>) : seedMoods()
  } catch {
    return seedMoods()
  }
}

function saveMoods(moods: Record<string, MoodValue>): void {
  try {
    localStorage.setItem(HW_MOOD_KEY, JSON.stringify(moods))
  } catch {
    /* storage unavailable — keep in memory only */
  }
}

/**
 * Health Worker Mode — Centralized Care. The whole facility on one calm screen:
 * who needs attention first, search, filter, and a tap through to the patient.
 * No maps, no routes, no clinical scores — just urgency, in the patient's favour.
 */
export function HealthWorkerScreen() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [moodOpen, setMoodOpen] = useState(false)
  const [moodDone, setMoodDone] = useState(false)
  const [moods, setMoods] = useState<Record<string, MoodValue>>(loadMoods)

  const roster = useMemo(() => getResidents(), [refresh])

  const [submittedMood, setSubmittedMood] = useState<MoodValue | null>(null)

  // One gentle check-in per day, before the roster. Purely local to this device.
  useEffect(() => {
    if (moodDone) return
    if (moods[today()]) {
      setMoodDone(true)
      return
    }
    setMoodOpen(true)
  }, [moodDone, moods])

  const recordMood = (mood: MoodValue) => {
    const next = { ...moods, [today()]: mood }
    setMoods(next)
    saveMoods(next)
    setSubmittedMood(mood)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return priorityRoster(roster).filter(
      (r) =>
        (filter === 'all' || statusFor(r) === filter) &&
        (!q || `${r.name} ${r.ward} ${r.room}`.toLowerCase().includes(q)),
    )
  }, [filter, query, roster])

  const counts = useMemo(
    () => ({
      red: roster.filter((r) => statusFor(r) === 'red').length,
      amber: roster.filter((r) => statusFor(r) === 'amber').length,
      green: roster.filter((r) => statusFor(r) === 'green').length,
    }),
    [roster],
  )

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <Page>
      <header className="flex flex-col gap-3 pb-4 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logoo.png" alt="Jugnu" className="h-12 w-12 shrink-0 sm:h-14 sm:w-14" style={{ objectFit: 'contain' }} />
            <div className="min-w-0">
              <p className="label-eyebrow truncate">{getFacilityName()}</p>
              <h1 className="mt-0.5 truncate font-display text-[1.35rem] leading-snug text-ink sm:text-[1.6rem]">
                Today’s Patient Check-in
              </h1>
            </div>
          </div>
          <IconButton
            icon="user"
            label="Health worker settings"
            onClick={() => navigate('/healthworker/settings')}
            className="shrink-0"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-ink-soft">
            {greeting}{getWorkerName() ? `, ${getWorkerName()}.` : '.'} Patients who may need your attention today.
          </p>
          <Button variant="primary" icon="plus" className="px-3.5 py-2.5 text-xs" onClick={() => setAddOpen(true)}>
            Add patient
          </Button>
        </div>
      </header>

      <div className="space-y-4">
        {/* Summary — three numbers, calm tints, nothing alarming. */}
        <div className="grid grid-cols-3 gap-2.5">
          <SummaryCard tone="red" label={statusLabel.red} count={counts.red} hint="Sustained decline or missed sessions" />
          <SummaryCard tone="amber" label={statusLabel.amber} count={counts.amber} hint="Early change or still calibrating" />
          <SummaryCard tone="green" label={statusLabel.green} count={counts.green} hint="Steady against their own baseline" />
        </div>

        {/* This week's progress — whole-facility view, no individual numbers. */}
        <WeeklyProgressCard roster={roster} />

        {/* The worker's own week — a quiet record of how the days have felt. */}
        <MoodWeek moods={moods} onOpenCheckIn={() => { setSubmittedMood(null); setMoodOpen(true) }} />

        {/* Search + status filters */}
        <div className="space-y-2.5">
          <label className="relative block">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint">
              <MagnifierIcon />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patient…"
              className="input pl-11"
              aria-label="Search patients"
            />
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>
              All
            </FilterPill>
            <FilterPill active={filter === 'red'} onClick={() => setFilter('red')}>
              Needs Attention
            </FilterPill>
            <FilterPill active={filter === 'amber'} onClick={() => setFilter('amber')}>
              Review Suggested
            </FilterPill>
            <FilterPill active={filter === 'green'} onClick={() => setFilter('green')}>
              Stable
            </FilterPill>
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-faint">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-clay-500" aria-hidden="true" /> Needs attention</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-glow-500" aria-hidden="true" /> Review suggested</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sage-500" aria-hidden="true" /> Stable</span>
          </p>
        </div>

        {/* Roster */}
        {filtered.length === 0 ? (
          <div className="card card-pad text-center text-sm text-ink-soft">No patients match this filter.</div>
        ) : (
          <div className="space-y-3 pb-2">
            {filtered.map((resident) => (
              <ResidentCard key={resident.id} resident={resident} onClick={() => navigate(`/healthworker/${resident.id}`)} />
            ))}
          </div>
        )}
      </div>

      <AddPatientModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(resident) => {
          setAddOpen(false)
          setRefresh((v) => v + 1)
          navigate(`/healthworker/${resident.id}`)
        }}
      />

      {/* One-time nudge after the very first sign-in. */}
      <CompleteProfilePrompt
        storageKey="jugnu_hw_profile_prompt_v1"
        description="Tell Jugnu the facility's name and who's on duty today — it makes check-ins feel like your own."
        onGoToSettings={() => navigate('/healthworker/settings')}
      />

      {/* Daily mood check-in — a calm moment before the roster loads. */}
      <Modal
        open={moodOpen}
        onClose={() => { setMoodOpen(false); setMoodDone(true); setSubmittedMood(null) }}
        size="sm"
        title={submittedMood ? (submittedMood === 'low' ? 'Take it gently today' : submittedMood === 'good' ? 'Doing well today' : 'Holding steady') : `${greeting}${getWorkerName() ? `, ${getWorkerName()}.` : '.'}`}
        description={submittedMood ? undefined : "Before you begin today's patient check-ins, how are you feeling?"}
      >
        {submittedMood ? (
          <div className="flex flex-col items-center text-center py-2 animate-fade-in">
            <span className="text-4xl leading-none" aria-hidden="true">
              {moodFace[submittedMood]}
            </span>
            <p className="mt-3 text-sm leading-relaxed text-ink font-medium max-w-xs">
              {submittedMood === 'low'
                ? 'You seem tired or stressed today — please take a rest when you can, pace yourself, and don’t carry it all alone.'
                : submittedMood === 'good'
                ? "Doing well today! Glad you're feeling good — carry this warm, steady energy into your patient visits."
                : 'Steady pace today — remember to take gentle breathers between rounds and stay hydrated.'}
            </p>
            <button
              type="button"
              onClick={() => { setMoodOpen(false); setMoodDone(true); setSubmittedMood(null) }}
              className="btn-primary mt-5 w-full text-sm"
            >
              Continue to roster
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: 'good', face: '😊', word: 'Good' },
              { value: 'ok', face: '😐', word: 'Okay' },
              { value: 'low', face: '😞', word: 'Stressed' },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => recordMood(option.value)}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-paper py-4 transition duration-200 ease-calm hover:border-glow-300 hover:bg-glow-50"
              >
                <span className="text-3xl leading-none" aria-hidden="true">
                  {option.face}
                </span>
                <span className="text-xs font-semibold text-ink-soft">{option.word}</span>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </Page>
  )
}

interface NewResidentDraft {
  name: string
  age: string
  language: LanguageCode
  photoUrl?: string
}

function AddPatientModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  onAdded: (resident: FacilityResident) => void
}) {
  const [draft, setDraft] = useState<NewResidentDraft>({
    name: '',
    age: '',
    language: 'hi',
  })
  const [error, setError] = useState<string | null>(null)

  const canSave = draft.name.trim().length > 1 && Number(draft.age) > 0

  const onPhoto = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setDraft((d) => ({ ...d, photoUrl: String(reader.result) }))
    reader.readAsDataURL(file)
  }

  const save = () => {
    if (!canSave) {
      setError('Please enter the patient’s name and age.')
      return
    }
    const resident = addResident({
      name: draft.name.trim(),
      age: Number(draft.age),
      portraitTone: 'amber',
      language: draft.language,
      personalizationLevel: 1,
      photoUrl: draft.photoUrl,
    })
    setError(null)
    setDraft({ name: '', age: '', language: 'hi' })
    onAdded(resident)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a patient"
      description="A new resident admitted to the facility. They start in calibration until enough sessions are recorded."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon="check" onClick={save} disabled={!canSave}>
            Add patient
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="rounded-2xl bg-clay-50 px-3 py-2 text-xs font-medium text-clay-600">{error}</p>}
        <Field label="Full name" required>
          {(id) => (
            <TextInput
              id={id}
              value={draft.name}
              placeholder="e.g. Sunita Kalita"
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Age" required>
            {(id) => (
              <TextInput
                id={id}
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                value={draft.age}
                placeholder="78"
                onChange={(e) => setDraft((d) => ({ ...d, age: e.target.value }))}
              />
            )}
          </Field>
          <Field label="Language">
            {(id) => (
              <Select
                id={id}
                value={draft.language}
                onChange={(e) => setDraft((d) => ({ ...d, language: e.target.value as LanguageCode }))}
              >
                {(['hi', 'as', 'bn', 'mni', 'en'] as LanguageCode[]).map((code) => (
                  <option key={code} value={code}>
                    {languageLabel[code]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-line bg-sand">
            {draft.photoUrl ? (
              <Portrait name={draft.name || 'New patient'} tone="amber" photoUrl={draft.photoUrl} />
            ) : (
              <span className="grid h-full w-full place-items-center text-ink-faint">
                <Icon name="image" size={16} />
              </span>
            )}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <label className="btn-secondary cursor-pointer px-3 py-1.5 text-xs">
              <Icon name="image" size={14} />
              {draft.photoUrl ? 'Change photo' : 'Add a photo'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => onPhoto(e.target.files?.[0])}
              />
            </label>
            {draft.photoUrl && (
              <Button variant="ghost" icon="trash" onClick={() => setDraft((d) => ({ ...d, photoUrl: undefined }))} className="px-3 py-1.5 text-xs">
                Remove
              </Button>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-glow-200 bg-glow-50/70 p-4">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
            <Icon name="sparkle" size={15} className="mt-0.5 shrink-0 text-glow-700" />
            <span>
              <span className="font-semibold text-glow-900">You can personalize the games later.</span>{' '}
              After the patient record is created, add memories and family voices from their profile and the games will adapt.
            </span>
          </p>
        </div>
      </div>
    </Modal>
  )
}

const toneStyle: Record<
  ResidentStatus,
  { chip: string; dot: string; bar: string; glyph: string; count: string; hint: string; wash: string }
> = {
  red: {
    chip: 'bg-clay-100 text-clay-700',
    dot: 'bg-clay-500',
    bar: 'bg-clay-500',
    glyph: 'text-clay-600',
    count: 'text-clay-700',
    hint: 'text-clay-800',
    wash: 'bg-clay-50/50',
  },
  amber: {
    chip: 'bg-glow-100 text-glow-700',
    dot: 'bg-glow-500',
    bar: 'bg-glow-500',
    glyph: 'text-glow-700',
    count: 'text-glow-700',
    hint: 'text-glow-800',
    wash: 'bg-glow-50/50',
  },
  green: {
    chip: 'bg-sage-100 text-sage-700',
    dot: 'bg-sage-500',
    bar: 'bg-sage-500',
    glyph: 'text-sage-600',
    count: 'text-sage-700',
    hint: 'text-sage-800',
    wash: 'bg-sage-50/50',
  },
}

function SummaryCard({ tone, label, count, hint }: { tone: ResidentStatus; label: string; count: number; hint: string }) {
  const t = toneStyle[tone]
  return (
    <div className="card p-4 text-center">
      <p className={`text-3xl font-display ${t.count}`}>{count}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1.5 text-[10px] leading-relaxed text-ink-faint">{hint}</p>
    </div>
  )
}

function WeeklyProgressCard({ roster }: { roster: FacilityResident[] }) {
  const week = weeklyCompletion(roster)
  const pct = week.of > 0 ? Math.round((week.attended / week.of) * 100) : 0
  const engaging = roster.filter((r) => r.todaySession === 'done').length
  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="label-eyebrow mb-0">This week</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            <span className="font-semibold text-ink">{week.attended}</span> of {week.of} sessions completed across the facility.
          </p>
        </div>
        <span className="chip shrink-0 bg-sage-100 text-sage-700">
          {engaging} completed today
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sand">
        <div
          className="h-full rounded-full bg-gradient-to-r from-glow-400 to-sage-400 transition-all duration-500 ease-calm"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function MoodWeek({ moods, onOpenCheckIn }: { moods: Record<string, MoodValue>; onOpenCheckIn?: () => void }) {
  const days = weekDates().map((date) => {
    const [y, m, d] = date.split('-').map(Number)
    const weekday = new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short' })
    const isToday = date === today()
    return { date, weekday, mood: moods[date], isToday, inFuture: date > today() }
  })
  const past = days.filter((d) => !d.inFuture)
  const checked = days.filter((d) => d.mood).length
  const counts = { good: 0, ok: 0, low: 0 }
  past.forEach((d) => {
    if (d.mood) counts[d.mood] += 1
  })

  const todayMood = moods[today()]

  let moodLine = ''
  let textTone = 'text-ink-soft'

  if (todayMood === 'low') {
    moodLine = 'You seem tired or stressed today — please take a rest when you can, pace yourself, and don’t carry it all alone.'
    textTone = 'text-clay-700'
  } else if (todayMood === 'good') {
    moodLine = counts.good >= 3
      ? "Doing well this week! Glad you're feeling good today — carry this warm energy into your rounds."
      : "Glad you're feeling good today — carry this steady energy into your patient rounds."
    textTone = 'text-sage-700'
  } else if (todayMood === 'ok') {
    moodLine = 'Holding steady today — remember to take short breathers between rounds and stay hydrated.'
    textTone = 'text-ink'
  } else {
    // Not checked in today
    if (counts.good >= 3) {
      moodLine = 'Doing well this week — most days have been positive. Check in with how you are feeling today.'
      textTone = 'text-sage-700'
    } else if (counts.low >= 2) {
      moodLine = 'A heavier week so far — please remember to build in proper breathers and rest.'
      textTone = 'text-clay-700'
    } else {
      moodLine = 'Take a quiet moment to check in with yourself before starting your patient rounds.'
      textTone = 'text-ink-soft'
    }
  }

  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between gap-3">
        <p className="label-eyebrow mb-0">This week — how you're feeling</p>
        <div className="flex items-center gap-2 shrink-0 pr-2.5 sm:pr-0">
          <span className="chip shrink-0 bg-glow-100 text-glow-800">{checked} check-ins</span>
          {onOpenCheckIn && (
            <button
              type="button"
              onClick={onOpenCheckIn}
              className="text-xs font-semibold text-glow-800 hover:underline px-1 py-0.5 mr-1 sm:mr-0 transition"
            >
              {todayMood ? 'Update' : 'Check in'}
            </button>
          )}
        </div>
      </div>

      {/* Empathetic supportive message line depending on mood */}
      <p className={`mt-3 text-sm font-medium leading-relaxed ${textTone}`}>
        {todayMood && <span className="mr-2 text-base inline-block align-middle" aria-hidden="true">{moodFace[todayMood]}</span>}
        {moodLine}
      </p>

      {/* Weekday indicators */}
      <div className="mt-3.5 flex items-end justify-between gap-1.5">
        {days.map((d) => (
          <div
            key={d.date}
            className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 ${d.isToday ? 'bg-glow-50 ring-1 ring-glow-300' : ''}`}
          >
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${d.isToday ? 'text-glow-800' : 'text-ink-faint'}`}>
              {d.weekday}
            </span>
            <span className={`text-lg leading-none ${d.inFuture ? 'opacity-30' : ''}`} aria-hidden="true">
              {d.mood ? moodFace[d.mood] : d.inFuture ? '' : '·'}
            </span>
            {d.isToday && <span className="text-[10px] font-medium text-glow-800">Today</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-pill border px-3.5 py-1.5 text-xs font-semibold transition duration-200 ease-calm ${
        active ? 'border-glow-400 bg-glow-100 text-glow-900 shadow-sm' : 'border-line bg-paper text-ink-soft hover:border-glow-200 hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

const directionColor: Record<TrendDirection, string> = {
  improving: 'text-sage-600',
  stable: 'text-dusk-700',
  declining: 'text-clay-600',
}

function TrendGlyphs({ resident }: { resident: FacilityResident }) {
  return (
    <div className="flex items-center gap-3" aria-label="Cognitive trend per domain">
      {allTrends(resident.sessions).map(({ domain, direction }) => (
        <span key={domain} className="inline-flex items-center gap-1 text-[11px] font-medium" title={`${domainLabel[domain]}: ${direction}`}>
          <span className={`${directionColor[direction]} text-xs`}>{directionGlyph[direction]}</span>
          <span className="text-ink-faint">{domain.slice(0, 1).toUpperCase()}</span>
        </span>
      ))}
    </div>
  )
}

function ResidentCard({ resident, onClick }: { resident: FacilityResident; onClick: () => void }) {
  const status = statusFor(resident)
  const t = toneStyle[status]
  const attended = attendance7(resident)
  const open = () => {
    onClick()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
      className={`card card-pad relative w-full cursor-pointer overflow-hidden text-left transition duration-200 ease-calm hover:border-glow-200 hover:shadow-lift ${t.wash}`}
    >
      <span className={`absolute bottom-0 left-0 top-0 w-2 ${t.bar}`} aria-hidden="true" />
      <div className="flex items-start gap-3 pl-1">
        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-line">
          <Portrait name={resident.name} tone={resident.portraitTone} photoUrl={resident.photoUrl} compact />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg leading-snug text-ink">
            {resident.name}
            <span className="ml-1.5 font-sans text-xs font-normal text-ink-faint">{resident.age}</span>
          </p>
        </div>
        <span className={`chip shrink-0 ${t.chip}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden="true" />
          {statusLabel[status]}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{signalFor(resident)}</p>

      <div className="mt-3 flex flex-col gap-2 border-t border-line/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] text-ink-faint">
            Last session: <span className="font-medium text-ink-soft">{relativeDayLabel(resident.lastSessionDate)} · {resident.lastSessionTime}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-ink-faint">
            Attendance: <span className="font-medium text-ink-soft">{attended.attended}/{attended.of} sessions</span>
          </p>
        </div>
        <TrendGlyphs resident={resident} />
      </div>

      <div className="mt-3 flex justify-end">
        <span className="inline-flex items-center gap-1 rounded-pill border border-line bg-paper px-3.5 py-2 text-xs font-semibold text-ink shadow-sm transition duration-200 ease-calm">
          View Patient
          <Icon name="chevronRight" size={14} />
        </span>
      </div>
    </div>
  )
}

function MagnifierIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20.5 20.5 16 16" />
    </svg>
  )
}