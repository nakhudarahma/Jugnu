import type { ReactNode } from 'react'
import { Icon, type IconName } from '@/components/ui/Icon'

interface QuickActionCardProps {
  icon: IconName
  title: string
  description: string
  onClick: () => void
  disabled?: boolean
  disabledNote?: string
  /** Extra content rendered under the description, e.g. a small status breakdown. */
  footer?: ReactNode
}

export function QuickActionCard({ icon, title, description, onClick, disabled, disabledNote, footer }: QuickActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledNote : undefined}
      className={`flex h-full items-start gap-3 rounded-card border border-line bg-paper p-4 text-left shadow-card transition duration-200 ease-calm ${
        disabled ? 'cursor-not-allowed opacity-55' : 'hover:-translate-y-0.5 hover:border-glow-200 hover:shadow-lift'
      }`}
    >
      <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-glow-50 text-glow-600">
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
