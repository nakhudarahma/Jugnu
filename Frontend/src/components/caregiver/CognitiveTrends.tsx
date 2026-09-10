import { SectionCard } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { directionGlyph, directionLabel, domainLabel, type DomainTrend } from '@/lib/trends'
import type { TrendDirection } from '@/types'

const tone: Record<TrendDirection, { text: string; bg: string; line: string }> = {
  improving: { text: 'text-sage-700', bg: 'bg-sage-100', line: '#3F7F6E' },
  stable: { text: 'text-dusk-700', bg: 'bg-dusk-100', line: '#7A8592' },
  declining: { text: 'text-clay-700', bg: 'bg-clay-100', line: '#C4744A' },
}

/** A shape, never a score: the series is drawn relative to the patient's own baseline. */
function BaselineShape({ series, color }: { series: number[]; color: string }) {
  const points = series.slice(-8)
  if (points.length < 2) return null
  const span = Math.max(6, ...points.map((p) => Math.abs(p))) * 2
  const step = 60 / (points.length - 1)
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(11 - (p / span) * 18).toFixed(1)}`)
    .join(' ')
  return (
    <svg width="60" height="22" viewBox="0 0 60 22" aria-hidden="true" className="shrink-0">
      <line x1="0" y1="11" x2="60" y2="11" stroke="#EADFCF" strokeWidth="1" strokeDasharray="2 3" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface CognitiveTrendsProps {
  trends: DomainTrend[]
  onOpen?: () => void
}

export function CognitiveTrends({ trends, onOpen }: CognitiveTrendsProps) {
  return (
    <SectionCard
      eyebrow="Cognitive trends"
      title="Compared with their own baseline"
      onClick={onOpen}
      ariaLabel="Cognitive trends. Open trend detail."
      action={onOpen ? <Icon name="chevronRight" size={18} className="mt-1 text-ink-faint" /> : undefined}
    >
      <ul className="divide-y divide-line/70">
        {trends.map((trend) => {
          const t = tone[trend.direction]
          return (
            <li key={trend.domain} className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-0">
              <span className="text-[15px] font-medium text-ink">{domainLabel[trend.domain]}</span>
              <span className="flex items-center gap-3">
                <BaselineShape series={trend.relativeSeries} color={t.line} />
                <span className={`chip ${t.bg} ${t.text}`}>
                  <span aria-hidden="true" className="text-base leading-none">
                    {directionGlyph[trend.direction]}
                  </span>
                  {directionLabel[trend.direction]}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-xs text-ink-faint">
        Jugnu compares each day with their own earlier sessions. It never compares them with anyone else.
      </p>
    </SectionCard>
  )
}
