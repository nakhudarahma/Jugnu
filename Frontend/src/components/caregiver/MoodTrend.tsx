import type { MoodEntry, MoodValue } from '@/types'
import { relativeDayLabel } from '@/lib/date'
import type { CaregiverSupportSignal } from '@/lib/trends'

export const moodFace: Record<MoodValue, string> = { good: '😊', ok: '😐', low: '😞' }
export const moodWord: Record<MoodValue, string> = { good: 'Good', ok: 'Okay', low: 'Hard' }

interface MoodTrendProps {
  moods: MoodEntry[]
  support: CaregiverSupportSignal
  onCheckIn: () => void
  checkedInToday: boolean
}

/** Kept deliberately quiet: this is for the caregiver, not another metric to manage. */
export function MoodTrend({ moods, support, onCheckIn, checkedInToday }: MoodTrendProps) {
  const recent = [...moods].sort((a, b) => a.date.localeCompare(b.date)).slice(-5)

  return (
    <section aria-labelledby="mood-heading" className="card-quiet px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="mood-heading" className="text-sm font-semibold text-ink-soft">
            How you have been
          </h2>
          <p className="sr-only">
            {recent.map((m) => `${relativeDayLabel(m.date)}: ${moodWord[m.mood]}`).join(', ') || 'No check-ins yet'}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5" aria-hidden="true">
            {recent.length ? (
              recent.map((m) => (
                <span key={m.id} className="text-lg leading-none" title={`${relativeDayLabel(m.date)} · ${moodWord[m.mood]}`}>
                  {moodFace[m.mood]}
                </span>
              ))
            ) : (
              <span className="text-xs text-ink-faint">No check-ins yet</span>
            )}
          </div>
        </div>
        {!checkedInToday && (
          <button
            type="button"
            onClick={onCheckIn}
            className="text-xs font-semibold text-ink-soft underline decoration-line underline-offset-4 hover:text-ink"
          >
            Add today’s check-in
          </button>
        )}
      </div>

      {support.level === 'support' && (
        <div className="mt-3 rounded-2xl bg-lilac-100/70 px-3 py-2.5">
          <p className="text-xs font-semibold text-lilac-700">{support.headline}</p>
          {support.detail && <p className="mt-0.5 text-xs text-ink-soft">{support.detail}</p>}
        </div>
      )}
    </section>
  )
}
