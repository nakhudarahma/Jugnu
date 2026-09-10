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
  onOpenProfile: () => void
  profileName: string
}

export function CaregiverHeader({ title, dateLabel, roleLabel, onOpenProfile, profileName }: CaregiverHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 px-1 pb-5 pt-6">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2">
          <BrandMark size={48} />
          <span className="label-eyebrow">Jugnu</span>
          {roleLabel && (
            <span className="rounded-pill bg-sand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              {roleLabel}
            </span>
          )}
        </div>
        <h1 className="truncate font-display text-[1.75rem] leading-tight text-ink sm:text-[2rem]">{title}</h1>
        <p className="mt-1 text-sm text-ink-soft">{dateLabel}</p>
      </div>

      {/* Deliberately small: settings should never compete with today's activity. */}
      <button
        type="button"
        onClick={onOpenProfile}
        aria-label={`Account and settings — signed in as ${profileName}`}
        className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-paper text-ink-soft shadow-card transition duration-200 ease-calm hover:border-glow-300 hover:text-ink"
      >
        <Icon name="user" size={17} />
      </button>
    </header>
  )
}
