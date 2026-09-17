import type { CognitiveDomain, MoodEntry, SessionRecord, TrendDirection } from '@/types'

export const DOMAINS: CognitiveDomain[] = ['memory', 'attention', 'recognition']

export const domainLabel: Record<CognitiveDomain, string> = {
  memory: 'Memory',
  attention: 'Attention',
  recognition: 'Recognition',
}

export const directionLabel: Record<TrendDirection, string> = {
  improving: 'Improving',
  stable: 'Stable',
  declining: 'Declining',
}

export const directionGlyph: Record<TrendDirection, string> = {
  improving: '↑',
  stable: '→',
  declining: '↓',
}

const BASELINE_WINDOW = 5
const RECENT_WINDOW = 3
const THRESHOLD = 4

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

function completed(sessions: SessionRecord[]): SessionRecord[] {
  return sessions.filter((s) => s.completed).sort((a, b) => a.date.localeCompare(b.date))
}

export interface DomainTrend {
  domain: CognitiveDomain
  direction: TrendDirection
  /** Deltas against the patient's own baseline — never rendered as a number. */
  relativeSeries: number[]
  sessionsCompared: number
}

/**
 * Trends are always relative to this patient's own baseline. Jugnu never compares
 * one person with another and never surfaces the underlying values.
 */
export function domainTrend(sessions: SessionRecord[], domain: CognitiveDomain): DomainTrend {
  const done = completed(sessions)
  const series = done.map((s) => s.domainScores[domain])
  if (series.length < 2) {
    return { domain, direction: 'stable', relativeSeries: series.map(() => 0), sessionsCompared: series.length }
  }
  const baseline = mean(series.slice(0, Math.min(BASELINE_WINDOW, Math.max(2, series.length - RECENT_WINDOW))))
  const recent = mean(series.slice(-RECENT_WINDOW))
  const delta = recent - baseline
  const direction: TrendDirection = delta > THRESHOLD ? 'improving' : delta < -THRESHOLD ? 'declining' : 'stable'
  return {
    domain,
    direction,
    relativeSeries: series.map((v) => v - baseline),
    sessionsCompared: Math.min(RECENT_WINDOW, series.length),
  }
}

export function allTrends(sessions: SessionRecord[]): DomainTrend[] {
  return DOMAINS.map((d) => domainTrend(sessions, d))
}

export interface ChangeSignal {
  /** 'none' deliberately does not claim that everything is fine. */
  level: 'none' | 'watch'
  headline: string
  detail?: string
  action?: string
}

/**
 * Describes a change in activity trend. It never names or grades a condition.
 */
export function changeSignal(sessions: SessionRecord[]): ChangeSignal {
  const done = completed(sessions)
  if (done.length < 4) {
    return { level: 'none', headline: 'No current flag raised' }
  }
  const window = 4
  const flagged = DOMAINS.map((domain) => {
    const series = done.map((s) => s.domainScores[domain])
    const before = mean(series.slice(0, Math.max(2, series.length - window)))
    const recent = mean(series.slice(-window))
    return { domain, drop: before - recent }
  })
    .filter((d) => d.drop > THRESHOLD)
    .sort((a, b) => b.drop - a.drop)

  if (!flagged.length) return { level: 'none', headline: 'No current flag raised' }

  return {
    level: 'watch',
    headline: `${domainLabel[flagged[0].domain]} trend declining over last ${window} sessions`,
    detail: 'This describes a change in activity results, not a diagnosis.',
    action: 'Review suggested',
  }
}

export interface CaregiverSupportSignal {
  level: 'none' | 'support'
  headline: string
  detail?: string
}

/** Quiet, non-medical support signal built from the caregiver's own check-ins. */
export function caregiverSupportSignal(moods: MoodEntry[], userId: string): CaregiverSupportSignal {
  const recent = moods
    .filter((m) => m.userId === userId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
  const low = recent.filter((m) => m.mood === 'low').length
  if (recent.length >= 3 && low >= 3) {
    return {
      level: 'support',
      headline: 'Some harder days lately',
      detail: 'Caring is heavy work. Sharing a few tasks with the family can help.',
    }
  }
  return { level: 'none', headline: '' }
}

export interface PaceAnalysis {
  avgResponseSeconds: number
  avgDurationMinutes: number
  hesitationFrequency: number
  paceTrend: 'improving' | 'steady' | 'slower'
  advice: string
}

export function sessionTimeAnalysis(sessions: SessionRecord[]): PaceAnalysis {
  const done = sessions.filter((s) => s.completed)
  if (!done.length) {
    return {
      avgResponseSeconds: 4.2,
      avgDurationMinutes: 4.5,
      hesitationFrequency: 0,
      paceTrend: 'steady',
      advice: 'Response speed and session engagement will calibrate over the next few activities.',
    }
  }

  const times = done.map((s) => s.timeMetrics?.avgResponseTimeMs ?? 3800)
  const durations = done.map((s) => s.timeMetrics?.totalDurationSeconds ?? 280)
  const hesitations = done.map((s) => s.timeMetrics?.hesitationCount ?? 0)

  const avgResponseSeconds = Number((mean(times) / 1000).toFixed(1))
  const avgDurationMinutes = Number((mean(durations) / 60).toFixed(1))
  const hesitationFrequency = Number(mean(hesitations).toFixed(1))

  let paceTrend: 'improving' | 'steady' | 'slower' = 'steady'
  if (times.length >= 3) {
    const recent = mean(times.slice(-2))
    const earlier = mean(times.slice(0, Math.max(1, times.length - 2)))
    if (recent < earlier * 0.88) paceTrend = 'improving'
    else if (recent > earlier * 1.12) paceTrend = 'slower'
  }

  let advice = 'Patient is maintaining a comfortable and consistent response pace.'
  if (paceTrend === 'improving') {
    advice = 'Response speed is increasing smoothly — high familiarity with daily prompts.'
  } else if (paceTrend === 'slower') {
    advice = 'Pace has slowed slightly. Consider keeping sessions under 4 minutes to avoid fatigue.'
  } else if (hesitationFrequency > 1.5) {
    advice = 'Multiple pauses (>10s) detected. High patience and gentle voice prompts recommended.'
  }

  return {
    avgResponseSeconds,
    avgDurationMinutes,
    hesitationFrequency,
    paceTrend,
    advice,
  }
}
