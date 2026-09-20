import { SectionCard } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { sessionTimeAnalysis, type PaceAnalysis } from '@/lib/trends'
import type { SessionRecord } from '@/types'

interface SessionPaceAnalysisProps {
  sessions: SessionRecord[]
  onOpen?: () => void
}

const paceBadge: Record<PaceAnalysis['paceTrend'], { label: string; bg: string; text: string }> = {
  improving: { label: 'Smooth Pace', bg: 'bg-sage-100', text: 'text-sage-700' },
  steady: { label: 'Steady Pace', bg: 'bg-dusk-100', text: 'text-dusk-700' },
  slower: { label: 'Gentle Pace', bg: 'bg-amber-100', text: 'text-amber-800' },
}

export function SessionPaceAnalysis({ sessions, onOpen }: SessionPaceAnalysisProps) {
  const pace = sessionTimeAnalysis(sessions)
  const badge = paceBadge[pace.paceTrend]

  return (
    <SectionCard
      eyebrow="Session engagement & pace"
      title="Response speed & optimal activity duration"
      onClick={onOpen}
      ariaLabel="Session time and response pace analysis."
      action={onOpen ? <Icon name="chevronRight" size={18} className="mt-1 text-ink-faint" /> : undefined}
    >
      <div className="grid grid-cols-3 gap-2 text-center py-2.5 bg-cream-50/80 rounded-lg border border-line/40">
        <div>
          <span className="block text-[11px] font-medium text-ink-faint uppercase tracking-wider">Avg Speed</span>
          <span className="text-base font-semibold text-ink">{pace.avgResponseSeconds}s</span>
        </div>
        <div>
          <span className="block text-[11px] font-medium text-ink-faint uppercase tracking-wider">Duration</span>
          <span className="text-base font-semibold text-ink">{pace.avgDurationMinutes}m</span>
        </div>
        <div>
          <span className="block text-[11px] font-medium text-ink-faint uppercase tracking-wider">Pauses (&gt;10s)</span>
          <span className="text-base font-semibold text-ink">{pace.hesitationFrequency}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-ink-muted">Pace Status</span>
        <span className={`chip ${badge.bg} ${badge.text} text-xs font-medium px-2 py-0.5 rounded-full`}>
          {badge.label}
        </span>
      </div>

      <p className="mt-2.5 text-xs text-ink-muted leading-relaxed bg-amber-50/50 p-2.5 rounded-md border border-amber-200/60">
        <strong className="text-ink">Observation:</strong> {pace.advice}
      </p>
    </SectionCard>
  )
}
