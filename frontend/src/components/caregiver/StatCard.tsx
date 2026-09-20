import type { ReactNode } from 'react'
import { Icon, type IconName } from '@/components/ui/Icon'

type Tone = 'glow' | 'sage' | 'lilac' | 'clay' | 'dusk'

interface StatCardProps {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon: IconName
  tone?: Tone
  onClick?: () => void
}

const tileClass: Record<Tone, string> = {
  glow: 'bg-glow-100 text-glow-700',
  sage: 'bg-sage-100 text-sage-700',
  lilac: 'bg-lilac-100 text-lilac-700',
  clay: 'bg-clay-100 text-clay-700',
  dusk: 'bg-dusk-100 text-dusk-700',
}

/** A compact "today at a glance" tile — one number, one colour, one tap. */
export function StatCard({ label, value, sub, icon, tone = 'glow', onClick }: StatCardProps) {
  const body = (
    <div className="flex items-start gap-3.5">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tileClass[tone]}`}>
        <Icon name={icon} size={20} />
      </span>
      <span className="min-w-0">
        <span className="label-eyebrow block">{label}</span>
        <span className="mt-0.5 block font-display text-[1.6rem] leading-tight text-ink" aria-live="polite">
          {value}
        </span>
        {sub && <span className="mt-0.5 block text-xs leading-snug text-ink-soft">{sub}</span>}
      </span>
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="card card-pad w-full p-4 text-left transition duration-200 ease-calm hover:-translate-y-0.5 hover:border-glow-300 hover:shadow-lift"
      >
        {body}
      </button>
    )
  }

  return <div className="card card-pad p-4">{body}</div>
}