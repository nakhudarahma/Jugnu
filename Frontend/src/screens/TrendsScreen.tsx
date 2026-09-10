import { Page, ScreenHeader } from '@/components/caregiver/Page'
import { ChangeSignal } from '@/components/caregiver/ChangeSignal'
import { Card, SectionCard } from '@/components/ui/Card'
import { Chip, EmptyState } from '@/components/ui/Bits'
import { relativeDayLabel } from '@/lib/date'
import { patientLabel } from '@/lib/patientName'
import { allTrends, changeSignal, directionGlyph, directionLabel, domainLabel } from '@/lib/trends'
import type { TrendDirection } from '@/types'
import { useApp } from '@/state/AppContext'

const tone: Record<TrendDirection, 'sage' | 'dusk' | 'clay'> = {
  improving: 'sage',
  stable: 'dusk',
  declining: 'clay',
}

const meaning: Record<TrendDirection, string> = {
  improving: 'They are finding these activities easier than a few weeks ago.',
  stable: 'This is holding steady against their own earlier sessions.',
  declining: 'These activities are taking more support than they used to.',
}

/** The "see what changed" view. Still no scores, still only her own baseline. */
export function TrendsScreen() {
  const { state, can, currentUser } = useApp()
  const patientName = patientLabel(state.patient, currentUser)
  const trends = allTrends(state.sessions)
  const recent = [...state.sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)

  return (
    <Page>
      <ScreenHeader title="What has changed" subtitle={`${patientName}, compared with their own earlier sessions`} />

      <div className="space-y-4">
        {can.viewChangeSignal && <ChangeSignal signal={changeSignal(state.sessions)} />}

        <div className="space-y-3">
          {trends.map((trend) => (
            <Card key={trend.domain} className="card-pad">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-display text-lg text-ink">{domainLabel[trend.domain]}</h2>
                  <p className="mt-1 text-sm text-ink-soft">{meaning[trend.direction]}</p>
                </div>
                <Chip tone={tone[trend.direction]}>
                  <span aria-hidden="true">{directionGlyph[trend.direction]}</span>
                  {directionLabel[trend.direction]}
                </Chip>
              </div>
              <p className="mt-3 text-xs text-ink-faint">
                Based on their last {trend.sessionsCompared} {trend.sessionsCompared === 1 ? 'session' : 'sessions'}.
              </p>
            </Card>
          ))}
        </div>

        <SectionCard eyebrow="Recent sessions" title="How the days went">
          {recent.length ? (
            <ul className="divide-y divide-line">
              {recent.map((session) => {
                const by = state.users.find((u) => u.id === session.startedByUserId)
                return (
                  <li key={session.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{relativeDayLabel(session.date)}</p>
                      <p className="text-xs text-ink-soft">
                        {session.activityCount} {session.activityCount === 1 ? 'activity' : 'activities'}
                        {by ? ` · with ${by.name}` : ''}
                        {session.gentleCorrections
                          ? ` · ${session.gentleCorrections} ${session.gentleCorrections === 1 ? 'answer' : 'answers'} we helped with`
                          : ''}
                      </p>
                    </div>
                    <Chip tone={session.completed ? 'sage' : 'neutral'}>{session.completed ? 'Finished' : 'Paused'}</Chip>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState icon="sparkle" title="No sessions yet" body="Start today’s activity and this will fill in on its own." />
          )}
        </SectionCard>

        <p className="px-1 text-xs leading-relaxed text-ink-faint">
          Jugnu never shows scores or percentages, and never compares {patientName} with anyone else. Direction
          is measured only against their own baseline. {currentUser?.layer === 2 ? 'Ask the primary caregiver if a change worries you.' : 'If something concerns you, this is a good page to take to a doctor.'}
        </p>
      </div>
    </Page>
  )
}
