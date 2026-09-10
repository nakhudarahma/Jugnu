import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { CognitiveDomain } from '@/types'
import { useApp, usePatient, usePeople } from '@/state/AppContext'
import { usePersonalization } from '@/state/personalization'
import { voice } from '@/lib/voice'
import { buildConfirmStep, buildPlan, countGames, type ActivityStep } from './plan'

export type SessionPhase = 'handoff' | 'activity' | 'feedback' | 'complete'

export interface FeedbackState {
  outcome: 'correct' | 'gentle'
  line: string
  step: ActivityStep
}

export interface SessionEngine {
  phase: SessionPhase
  step: ActivityStep | null
  /** 1-based position in today's plan; confirm steps do not advance it. */
  stepNumber: number
  totalSteps: number
  /** Sequencing: how many tiles are already placed, and which ones. */
  placedIds: string[]
  selectedId: string | null
  feedback: FeedbackState | null
  answer: (optionId: string) => void
  repeatPrompt: () => void
  playVoiceNote: () => void
  /** Called when a caregiver takes the device back; keeps whatever was done today. */
  close: () => void
  /** The prompt currently on screen (sequencing changes it mid-activity). */
  promptText: string
}

const FEEDBACK_HOLD = 1500
const HANDOFF_HOLD = 900

/**
 * The whole patient session lives here so the screens stay presentational:
 * voice first, one activity at a time, a wrong answer is always followed by a
 * step that cannot be failed, and the session therefore never ends on a failure.
 */
export function useSessionEngine(): SessionEngine {
  const [searchParams] = useSearchParams()
  const game = searchParams.get('game')
  const { state, dispatch, currentUser } = useApp()
  const patient = usePatient()
  const people = usePeople()
  const p = usePersonalization()

  const plan = useMemo(
    () =>
      buildPlan({
        people,
        memories: state.memories,
        language: patient.language,
        level: patient.personalizationLevel,
        morningRoutine: patient.morningRoutine,
        game,
      }),
    // Built once per session: re-shuffling mid-session would change the ground under her.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const [phase, setPhase] = useState<SessionPhase>('handoff')
  const [index, setIndex] = useState(0)
  const [confirmStep, setConfirmStep] = useState<ActivityStep | null>(null)
  const [placedIds, setPlacedIds] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [promptText, setPromptText] = useState('')

  const alive = useRef(true)
  const timer = useRef<number | null>(null)
  const results = useRef<{ domain: CognitiveDomain; correct: boolean }[]>([])
  const recorded = useRef(false)

  const step = confirmStep ?? plan[index] ?? null

  const clearTimer = () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }

  const after = useCallback((ms: number, fn: () => void) => {
    clearTimer()
    timer.current = window.setTimeout(() => {
      if (alive.current) fn()
    }, ms)
  }, [])

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      clearTimer()
      voice.cancel()
    }
  }, [])

  /** Internal only — the caregiver never sees these numbers, they only shape trends. */
  const record = useCallback(
    (completed: boolean) => {
      if (recorded.current) return
      recorded.current = true
      const previous = [...state.sessions].sort((a, b) => a.date.localeCompare(b.date)).at(-1)
      const domainScores = { memory: 0, attention: 0, recognition: 0 } as Record<CognitiveDomain, number>
      ;(['memory', 'attention', 'recognition'] as CognitiveDomain[]).forEach((domain) => {
        const rows = results.current.filter((r) => r.domain === domain)
        domainScores[domain] = rows.length
          ? Math.round(rows.reduce((sum, r) => sum + (r.correct ? 92 : 58), 0) / rows.length)
          : (previous?.domainScores[domain] ?? 65)
      })
      dispatch({
        type: 'recordSession',
        session: {
          completed,
          startedByUserId: currentUser?.id ?? 'unknown',
          domainScores,
          activityCount: countGames(plan),
          gentleCorrections: results.current.filter((r) => !r.correct).length,
        },
      })
    },
    [currentUser?.id, dispatch, plan.length, state.sessions],
  )

  const finish = useCallback(() => {
    setPhase('complete')
    setFeedback(null)
    setPromptText(p.text('completion'))
    record(true)
    p.say('completion', undefined, () => p.say('completionSub'))
  }, [p, record])

  /** Handing the tablet back mid-session still counts the activities she did do. */
  const close = useCallback(() => {
    clearTimer()
    voice.cancel()
    if (results.current.length) record(false)
  }, [record])

  /** Speak, then show, the prompt for whichever step is now current. */
  const openStep = useCallback(
    (next: ActivityStep) => {
      setPlacedIds([])
      setSelectedId(null)
      setFeedback(null)
      setPhase('activity')
      setPromptText(next.prompt)
      p.sayText(next.prompt)
    },
    [p],
  )

  const advance = useCallback(() => {
    setConfirmStep(null)
    const nextIndex = index + 1
    setIndex(nextIndex)
    const next = plan[nextIndex]
    if (next) openStep(next)
    else finish()
  }, [finish, index, openStep, plan])

  /** After a wrong answer: one tile, the right one, so she cannot fail twice over. */
  const insertConfirm = useCallback(
    (previous: ActivityStep) => {
      const gentleStep = buildConfirmStep(previous, patient.language)
      setConfirmStep(gentleStep)
      openStep(gentleStep)
    },
    [openStep, patient.language],
  )

  const showFeedback = useCallback(
    (outcome: 'correct' | 'gentle', current: ActivityStep) => {
      const line =
        outcome === 'correct'
          ? p.text(Math.random() < 0.5 ? 'correct' : 'praise')
          : p.text(current.answerIsPerson ? 'gentlePerson' : 'gentleThing', { answer: current.answerLabel })
      setPhase('feedback')
      setFeedback({ outcome, line, step: current })
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
      p.sayText(line, go)
    },
    [advance, after, insertConfirm, p],
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
          if (placed.length === step.orderedIds.length) {
            results.current.push({ domain: step.domain, correct: true })
            showFeedback('correct', step)
          } else {
            const follow = step.followUpPrompt ?? step.prompt
            setPromptText(follow)
            p.sayText(follow)
          }
          return
        }
        const expectedOption = step.options.find((o) => o.id === expected)
        results.current.push({ domain: step.domain, correct: false })
        setSelectedId(optionId)
        showFeedback('gentle', { ...step, answerLabel: expectedOption?.label ?? step.answerLabel })
        return
      }

      setSelectedId(optionId)
      results.current.push({ domain: step.domain, correct: option.correct })
      showFeedback(option.correct ? 'correct' : 'gentle', step)
    },
    [p, phase, placedIds, showFeedback, step],
  )

  const repeatPrompt = useCallback(() => {
    if (promptText) p.sayText(promptText)
  }, [p, promptText])

  const playVoiceNote = useCallback(() => {
    const note = step?.voicePerson?.voiceNote
    if (!note) return
    if (note.audioUrl) {
      const audio = new Audio(note.audioUrl)
      void audio.play().catch(() => p.sayText(note.transcript ?? ''))
      return
    }
    if (note.transcript) p.sayText(note.transcript)
  }, [p, step])

  /** Handoff: the greeting is spoken while the caregiver is still holding the device. */
  useEffect(() => {
    const first = plan[0]
    const begin = () =>
      after(HANDOFF_HOLD, () => {
        if (first) openStep(first)
        else finish()
      })
    p.say('greeting', { name: patient.displayName }, begin)
    // Runs once, at the top of the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Level-2 voice recall plays the recording as soon as the question has been asked. */
  useEffect(() => {
    if (phase !== 'activity' || step?.kind !== 'voiceRecall') return
    const id = window.setTimeout(playVoiceNote, 2600)
    return () => window.clearTimeout(id)
  }, [phase, step, playVoiceNote])

  return {
    phase,
    step,
    stepNumber: Math.min(index + 1, plan.length),
    totalSteps: plan.length,
    placedIds,
    selectedId,
    feedback,
    answer,
    repeatPrompt,
    playVoiceNote,
    close,
    promptText,
  }
}
