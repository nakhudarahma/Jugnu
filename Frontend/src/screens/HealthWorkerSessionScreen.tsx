import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PatientShell } from '@/components/patient/PatientShell'
import { Illustration } from '@/components/ui/Illustration'
import { ChoiceTile, type TileState } from '@/components/patient/ChoiceTile'
import { SpeakingIndicator } from '@/components/ui/Bits'
import { Icon } from '@/components/ui/Icon'
import { Portrait } from '@/components/ui/Portrait'
import type { FacilityResident } from '@/data/facility'
import { getResidents, getWorkerPin } from '@/data/facility'
import { t } from '@/lib/i18n'
import { voice } from '@/lib/voice'
import { buildConfirmStep, buildPlan, type ActivityStep } from '@/session/plan'
import type { LanguageCode, Memory, Person } from '@/types'

/**
 * The locked facility session. It reuses the family app's PatientShell verbatim:
 * no header, no navigation, no roster, browser "back" absorbed. The patient only
 * ever sees the activity; the worker gets back by holding the hidden corner for
 * three seconds and entering the facility PIN. Extremely simple on purpose.
 */

const FEEDBACK_HOLD = 1500
const HANDOFF_HOLD = 900

/** The resident's connected circle, shaped like the family app's `Person[]`. */
function residentPeople(resident: FacilityResident): Person[] {
  return resident.family.map((m) => ({
    id: m.id,
    name: m.name,
    relationship: m.relationship,
    portraitTone: m.portraitTone,
    photoUrl: m.photoUrl,
    voiceNote: m.voiceNote
      ? {
          id: `v_${m.id}`,
          audioUrl: m.voiceNote.audioUrl,
          transcript: m.voiceNote.transcript,
          seconds: 0,
          recordedBy: 'worker',
          recordedAt: '',
        }
      : undefined,
  }))
}

/** The resident's memories, shaped like the family app's `Memory[]`. */
function residentMemories(resident: FacilityResident): Memory[] {
  return resident.memories.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description ?? '',
    personId: m.personId,
    photoUrl: undefined,
    createdByUserId: 'worker',
    createdAt: '',
    status: 'approved' as const,
    usableInActivities: m.usableInActivities,
  }))
}

const gridClass: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 [&>:last-child]:col-span-2 [&>:last-child]:mx-auto [&>:last-child]:w-[calc(50%-6px)]',
  4: 'grid-cols-2',
}

type FacilityPhase = 'handoff' | 'activity' | 'complete'

interface FacilityFeedback {
  outcome: 'correct' | 'gentle'
  line: string
}

interface FacilityEngine {
  phase: FacilityPhase
  step: ActivityStep | null
  stepNumber: number
  totalSteps: number
  placedIds: string[]
  selectedId: string | null
  feedback: FacilityFeedback | null
  promptText: string
  answer: (optionId: string) => void
  repeatPrompt: () => void
}

function useFacilitySessionEngine(resident: FacilityResident): FacilityEngine {
  const [searchParams] = useSearchParams()
  const game = searchParams.get('game')
  const lang = resident.language
  const rate = 0.85

  const plan = useMemo(
    () =>
      buildPlan({
        people: residentPeople(resident),
        memories: residentMemories(resident),
        language: lang,
        level: resident.personalizationLevel,
        morningRoutine: undefined,
        game,
      }),
    // Built once per session — no re-shuffling mid-activity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const [phase, setPhase] = useState<FacilityPhase>('handoff')
  const [index, setIndex] = useState(0)
  const [confirmStep, setConfirmStep] = useState<ActivityStep | null>(null)
  const [placedIds, setPlacedIds] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FacilityFeedback | null>(null)
  const [promptText, setPromptText] = useState('')

  const alive = useRef(true)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (timer.current !== null) window.clearTimeout(timer.current)
      voice.cancel()
    }
  }, [])

  const sayText = useCallback(
    (text: string, onEnd?: () => void) => voice.speak(text, { lang, rate, onEnd }),
    [lang, rate],
  )

  const after = useCallback((ms: number, fn: () => void) => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      if (alive.current) fn()
    }, ms)
  }, [])

  const openStep = useCallback(
    (next: ActivityStep) => {
      setPlacedIds([])
      setSelectedId(null)
      setFeedback(null)
      setPhase('activity')
      setPromptText(next.prompt)
      sayText(next.prompt)
    },
    [sayText],
  )

  const finish = useCallback(() => {
    setPhase('complete')
    setFeedback(null)
    const line = t(lang, 'completion')
    setPromptText(line)
    sayText(line, () => sayText(t(lang, 'completionSub')))
  }, [lang, sayText])

  const advance = useCallback(() => {
    setConfirmStep(null)
    const nextIndex = index + 1
    setIndex(nextIndex)
    const next = plan[nextIndex]
    if (next) openStep(next)
    else finish()
  }, [finish, index, openStep, plan])

  const insertConfirm = useCallback(
    (previous: ActivityStep) => {
      const gentleStep = buildConfirmStep(previous, lang)
      setConfirmStep(gentleStep)
      openStep(gentleStep)
    },
    [lang, openStep],
  )

  const step = confirmStep ?? plan[index] ?? null

  const showFeedback = useCallback(
    (outcome: 'correct' | 'gentle', current: ActivityStep) => {
      const line =
        outcome === 'correct'
          ? t(lang, Math.random() < 0.5 ? 'correct' : 'praise')
          : t(lang, current.answerIsPerson ? 'gentlePerson' : 'gentleThing', { answer: current.answerLabel })
      setPhase('activity')
      setFeedback({ outcome, line })
      setPromptText(line)
      let advanced = false
      const go = () => {
        if (advanced) return
        advanced = true
        after(FEEDBACK_HOLD, () => {
          if (outcome === 'gentle') insertConfirm(current)
          else advance()
        })
      }
      sayText(line, go)
    },
    [advance, after, insertConfirm, lang, sayText],
  )

  const answer = useCallback(
    (optionId: string) => {
      if (phase !== 'activity' || !step) return
      const option = step.options.find((o) => o.id === optionId)
      if (!option) return

      if (step.orderedIds) {
        const expected = step.orderedIds[placedIds.length]
        if (optionId === expected) {
          const placed = [...placedIds, optionId]
          setPlacedIds(placed)
          if (placed.length === step.orderedIds.length) showFeedback('correct', step)
          else {
            const follow = step.followUpPrompt ?? step.prompt
            setPromptText(follow)
            sayText(follow)
          }
          return
        }
        const expectedOption = step.options.find((o) => o.id === expected)
        setSelectedId(optionId)
        showFeedback('gentle', { ...step, answerLabel: expectedOption?.label ?? step.answerLabel })
        return
      }

      setSelectedId(optionId)
      showFeedback(option.correct ? 'correct' : 'gentle', step)
    },
    [phase, placedIds, sayText, showFeedback, step],
  )

  const repeatPrompt = useCallback(() => {
    if (promptText) sayText(promptText)
  }, [promptText, sayText])

  /** Speaking handoff while the worker still holds the device. */
  useEffect(() => {
    const first = plan[0]
    const begin = () =>
      after(HANDOFF_HOLD, () => {
        if (first) openStep(first)
        else finish()
      })
    sayText(t(lang, 'greeting', { name: resident.name }), begin)
    // Runs once at the top of the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    phase,
    step,
    stepNumber: Math.min(index + 1, plan.length),
    totalSteps: plan.length,
    placedIds,
    selectedId,
    feedback,
    promptText,
    answer,
    repeatPrompt,
  }
}

export function HealthWorkerSessionScreen() {
  const { residentId = '' } = useParams()
  const navigate = useNavigate()
  const roster = getResidents()
  const resident = roster.find((r) => r.id === residentId)
  const engine = useFacilitySessionEngine(resident ?? roster[0])
  const [askingPin, setAskingPin] = useState(false)

  if (!resident) {
    return <FacilityNotFound />
  }

  if (askingPin) {
    return (
      <WorkerPinUnlock
        onCancel={() => {
          setAskingPin(false)
          engine.repeatPrompt()
        }}
        onSuccess={() => navigate('/healthworker', { replace: true })}
      />
    )
  }

  return (
    <PatientShell onCaregiverAccess={() => { voice.cancel(); setAskingPin(true) }} label={`Activity for ${resident.name}`}>
      {engine.phase === 'handoff' && <FacilityHandoff name={resident.name} tone={resident.portraitTone} photoUrl={resident.photoUrl} />}
      {engine.phase === 'complete' && <FacilityCompletion />}
      {engine.phase === 'activity' && <FacilityActivityView engine={engine} lang={resident.language} />}
    </PatientShell>
  )
}

/** The bridge while the device is handed over — a voice is already speaking. */
function FacilityHandoff({ name, tone, photoUrl }: { name: string; tone: FacilityResident['portraitTone']; photoUrl?: string }) {
  return (
    <main className="patient-screen grid place-items-center px-6 py-16" aria-live="polite">
      <div className="flex max-w-md flex-col items-center text-center animate-fade-in">
        <span className="h-24 w-24 overflow-hidden rounded-full border-4 border-paper shadow-lift">
          <Portrait name={name} tone={tone} photoUrl={photoUrl} />
        </span>
        <h1 className="mt-6 font-display text-3xl leading-snug text-ink">Handing over to {name}…</h1>
        <p className="mt-3 text-base text-ink-soft">
          Jugnu is starting to speak. Pass the device across — everything from here is for {name}.
        </p>
        <div className="mt-8 flex items-center gap-3 rounded-pill border border-line bg-paper/80 px-5 py-3">
          <span className="h-5 w-5 overflow-hidden rounded-full">
            <Portrait name={name} tone={tone} photoUrl={photoUrl} compact />
          </span>
          <SpeakingIndicator force />
        </div>
      </div>
    </main>
  )
}

function FacilityNotFound() {
  return (
    <main className="patient-screen grid min-h-[100dvh] place-items-center px-6 text-center">
      <div>
        <h1 className="patient-prompt">This activity is no longer available</h1>
      </div>
    </main>
  )
}

function FacilityActivityView({ engine, lang }: { engine: FacilityEngine; lang: LanguageCode }) {
  const { step, feedback } = engine
  if (!step) return null

  const answering = feedback === null
  const isGentle = feedback?.outcome === 'gentle'

  const tileState = (id: string, correct: boolean): TileState => {
    if (engine.placedIds.includes(id)) return 'placed'
    if (!feedback) return 'idle'
    if (correct) return 'reveal'
    return id === engine.selectedId ? 'chosen' : 'idle'
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-4xl lg:max-w-5xl flex-col justify-center gap-6 sm:gap-8 px-4 py-6 sm:px-6 safe-bottom">
      <div className="text-center">
        <p className="sr-only">
          Activity {engine.stepNumber} of {engine.totalSteps}
        </p>
        <div className="mb-6 flex justify-center gap-2" aria-hidden="true">
          {Array.from({ length: engine.totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-pill transition-all duration-500 ease-calm ${
                i < engine.stepNumber - 1 ? 'w-2 bg-sage-500/60' : i === engine.stepNumber - 1 ? 'w-8 bg-glow-500' : 'w-2 bg-line'
              }`}
            />
          ))}
        </div>

        <h1 className="patient-prompt" aria-live="polite">
          {engine.promptText}
        </h1>

        <div className="mt-5 flex items-center justify-center gap-4">
          <SpeakingIndicator />
          <button type="button" onClick={engine.repeatPrompt} className="btn-ghost text-base">
            <Icon name="volume" size={18} />
            {t(lang, 'hearAgain')}
          </button>
        </div>
      </div>

      <div className={`mx-auto w-full max-w-[620px] grid gap-3 ${gridClass[step.options.length] ?? 'grid-cols-2'}`}>
        {step.options.map((option) => {
          const placedAt = engine.placedIds.indexOf(option.id)
          return (
            <ChoiceTile
              key={option.id}
              option={option}
              solo={step.options.length === 1}
              compact={step.options.length >= 3}
              state={tileState(option.id, option.correct)}
              placedIndex={placedAt >= 0 ? placedAt + 1 : undefined}
              disabled={!answering || placedAt >= 0}
              onSelect={() => engine.answer(option.id)}
            />
          )
        })}
      </div>

      <div className="min-h-[76px]">
        {feedback && (
          <div
            className={`mx-auto flex max-w-2xl items-center justify-center gap-3 rounded-card border px-6 py-4 text-center animate-rise-in ${
              isGentle ? 'border-lilac-500/30 bg-lilac-100/70' : 'border-sage-500/40 bg-sage-100/70'
            }`}
          >
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-white ${
                isGentle ? 'bg-lilac-500' : 'bg-sage-500 animate-soft-pulse'
              }`}
              aria-hidden="true"
            >
              <Icon name={isGentle ? 'heart' : 'check'} size={22} />
            </span>
            <p className="font-display text-2xl leading-snug text-ink">{feedback.line}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function FacilityCompletion() {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="relative grid h-44 w-44 place-items-center">
        <span className="absolute inset-0 rounded-full bg-glow-200/50 animate-ring-grow" aria-hidden="true" />
        <span className="absolute inset-4 rounded-full bg-glow-100" aria-hidden="true" />
        <Illustration name="sun" drawn className="relative h-28 w-28 animate-soft-pulse" />
      </div>

      <div className="animate-rise-in">
        <h1 className="patient-prompt">Well done. What a lovely session.</h1>
        <p className="mt-4 font-display text-2xl text-ink-soft">See you tomorrow.</p>
      </div>
    </div>
  )
}

/** The worker's door back to the roster: fixed facility PIN, never ever visible to the patient. */
function WorkerPinUnlock({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [digits, setDigits] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(
    (value: string) => {
      if (value === getWorkerPin()) {
        onSuccess()
        return
      }
      setDigits('')
      setError('That PIN did not match. Please try again.')
    },
    [onSuccess],
  )

  const push = useCallback(
    (key: string) => {
      setError(null)
      setDigits((current) => {
        if (current.length >= 4) return current
        const next = current + key
        if (next.length === 4) window.setTimeout(() => submit(next), 160)
        return next
      })
    },
    [submit],
  )

  const back = useCallback(() => {
    setError(null)
    setDigits((current) => current.slice(0, -1))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) push(e.key)
      else if (e.key === 'Backspace') back()
      else if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [back, onCancel, push])

  return (
    <main className="patient-screen grid min-h-[100dvh] place-items-center px-5 py-10">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="h-20 w-20 overflow-hidden rounded-full border-4 border-paper shadow-lift">
            <Portrait name="Care" tone="amber" compact />
          </span>
          <h1 className="mt-4 font-display text-2xl text-ink">Health worker access</h1>
          <p className="mt-1.5 text-sm text-ink-soft">Enter your PIN to return to the roster.</p>
        </div>

        <div className="mb-5 flex justify-center gap-3" role="status" aria-label={`${digits.length} of 4 digits entered`}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-4 w-4 rounded-full border-2 transition duration-200 ease-calm ${
                i < digits.length ? 'border-glow-500 bg-glow-500' : 'border-line bg-paper'
              }`}
            />
          ))}
        </div>

        <p aria-live="polite" className="mb-4 min-h-[20px] text-center text-sm text-clay-700">
          {error}
        </p>

        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
            <button key={key} type="button" onClick={() => push(key)} className="rounded-2xl border border-line bg-paper py-4 font-display text-2xl text-ink shadow-card transition duration-200 ease-calm hover:border-glow-300 hover:bg-glow-50">
              {key}
            </button>
          ))}
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-line bg-sand/60 py-4 text-sm font-semibold text-ink-soft transition duration-200 ease-calm hover:bg-sand"
          >
            Back
          </button>
          <button type="button" onClick={() => push('0')} className="rounded-2xl border border-line bg-paper py-4 font-display text-2xl text-ink shadow-card transition duration-200 ease-calm hover:border-glow-300 hover:bg-glow-50">
            0
          </button>
          <button
            type="button"
            onClick={back}
            aria-label="Delete last digit"
            className="grid place-items-center rounded-2xl border border-line bg-sand/60 py-4 text-ink-soft transition duration-200 ease-calm hover:bg-sand"
          >
            <Icon name="back" size={20} />
          </button>
        </div>
      </div>
    </main>
  )
}