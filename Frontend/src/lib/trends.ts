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
