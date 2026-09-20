import type { ReactNode } from 'react'
import { Icon, type IconName } from '@/components/ui/Icon'

type Tone = 'glow' | 'sage' | 'lilac' | 'clay' | 'dusk'

interface QuickActionCardProps {
  icon: IconName
  title: string
  description: string
  onClick: () => void
  disabled?: boolean
  disabledNote?: string
  /** Accent colour for the icon tile and hover state. */
  tone?: Tone
  /** Extra content rendered under the description, e.g. a small status breakdown. */
  footer?: ReactNode
}

const tones: Record<Tone, { tile: string; hover: string }> = {
  glow: { tile: 'bg-glow-100 text-glow-700', hover: 'hover:border-glow-300 hover:bg-glow-50/70' },
  sage: { tile: 'bg-sage-100 text-sage-700', hover: 'hover:border-sage-500/70 hover:bg-sage-100/60' },
  lilac: { tile: 'bg-lilac-100 text-lilac-700', hover: 'hover:border-lilac-500/70 hover:bg-lilac-100/60' },
  clay: { tile: 'bg-clay-100 text-clay-700', hover: 'hover:border-clay-500/70 hover:bg-clay-100/60' },
  dusk: { tile: 'bg-dusk-100 text-dusk-700', hover: 'hover:border-dusk-500/70 hover:bg-dusk-100/60' },
}

export function QuickActionCard({ icon, title, description, onClick, disabled, disabledNote, tone = 'glow', footer }: QuickActionCardProps) {
  const t = tones[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledNote : undefined}
      className={`flex h-full items-start gap-3 rounded-card border border-line/50 bg-paper p-4 text-left shadow-card transition duration-200 ease-calm ${
        disabled ? 'cursor-not-allowed opacity-55' : `${t.hover} hover:-translate-y-0.5 hover:shadow-lift`
      }`}
    >
      <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full ${disabled ? 'bg-sand text-ink-faint' : t.tile}`}>
        <Icon name={disabled ? 'lock' : icon} size={19} />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
          {disabled ? (disabledNote ?? 'Not available for your role') : description}
        </span>
        {footer}
      </span>
    </button>
  )
}