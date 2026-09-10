import { Icon } from '@/components/ui/Icon'
import type { ChangeSignal as ChangeSignalData } from '@/lib/trends'

/**
 * Neutral by design. "No current flag raised" is not the same claim as "all good",
 * and a raised signal describes a change in activity results — never a diagnosis.
 */
export function ChangeSignal({ signal, onReview }: { signal: ChangeSignalData; onReview?: () => void }) {
  const watching = signal.level === 'watch'

  return (
    <section
      aria-labelledby="change-signal-heading"
      className={`rounded-card border p-5 sm:p-6 ${
        watching ? 'border-clay-100 bg-clay-100/40' : 'border-line bg-paper'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
            watching ? 'bg-clay-500/15 text-clay-700' : 'bg-sand text-ink-faint'
          }`}
        >
          <Icon name={watching ? 'bell' : 'shield'} size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="label-eyebrow">Change signal</p>
          <h2 id="change-signal-heading" className={`mt-1 font-display text-lg ${watching ? 'text-clay-700' : 'text-ink'}`}>
            {signal.headline}
          </h2>
          {signal.detail && <p className="mt-1.5 text-sm text-ink-soft">{signal.detail}</p>}
          {!watching && (
            <p className="mt-1.5 text-sm text-ink-soft">
              Jugnu will raise a signal here if the activity trend changes. No flag does not mean nothing has changed —
              keep trusting what you notice day to day.
            </p>
          )}
          {watching && signal.action && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="chip bg-clay-100 text-clay-700">
                <Icon name="sparkle" size={13} />
                {signal.action}
              </span>
              {onReview && (
                <button
                  type="button"
                  onClick={onReview}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-clay-700 underline decoration-clay-500/40 underline-offset-4 hover:decoration-clay-700"
                >
                  Look at recent sessions
                  <Icon name="chevronRight" size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
