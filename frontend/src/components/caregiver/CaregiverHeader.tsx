import { Icon } from '@/components/ui/Icon'

export function BrandMark({ size = 26, withWord = false }: { size?: number; withWord?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <img
        src="/logoo.png"
        alt="Jugnu"
        style={{ height: size, width: size, objectFit: 'contain' }}
      />
      {withWord && <span className="font-display text-lg tracking-wide text-ink">Jugnu</span>}
    </span>
  )
}

interface CaregiverHeaderProps {
  /** The headline for this person — always "What you call them" + Progress/Day. */
  title: string
  dateLabel: string
  roleLabel?: string
}

/** Colorful hero greeting. The warm glow is the firefly of the logo, sunrise side. */
export function CaregiverHeader({ title, dateLabel, roleLabel }: CaregiverHeaderProps) {
  return (
    <header className="relative mt-2 overflow-hidden rounded-card border border-glow-200/80 bg-gradient-to-br from-glow-100 via-cream to-sage-100/70 px-5 py-5 shadow-card sm:px-6 sm:py-6">
      {/* Soft glow orbs — sunlight falling through ocean water. */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full bg-glow-200/60 blur-2xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-sage-500/15 blur-2xl" />
      <div aria-hidden="true" className="pointer-events-none absolute right-8 top-6 h-20 w-20 rounded-full bg-clay-500/15 blur-xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2.5 flex items-center gap-2">
            <BrandMark size={40} />
            <span className="label-eyebrow">Jugnu</span>
            {roleLabel && (
              <span className="rounded-pill border border-glow-200 bg-paper/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-glow-700">
                {roleLabel}
              </span>
            )}
          </div>
          <h1 className="truncate font-display text-[1.9rem] leading-tight text-ink sm:text-[2.1rem]">{title}</h1>
          <div className="mt-1.5 flex items-center gap-2 text-sm text-ink-soft">
            <Icon name="clock" size={14} className="shrink-0 text-glow-600" />
            {dateLabel}
          </div>
        </div>
      </div>
    </header>
  )
}