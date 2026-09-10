import { Modal } from '@/components/ui/Modal'
import type { MoodValue } from '@/types'
import { moodFace, moodWord } from './MoodTrend'

const options: MoodValue[] = ['good', 'ok', 'low']

/**
 * Shown only when a caregiver actually re-enters Jugnu — the moment she is really
 * back with the device — and never at session end, when she may not be present.
 */
export function MoodCheckIn({
  open,
  onSelect,
  onSkip,
  name,
}: {
  open: boolean
  onSelect: (mood: MoodValue) => void
  onSkip: () => void
  name: string
}) {
  return (
    <Modal
      open={open}
      onClose={onSkip}
      size="sm"
      title="How are you feeling?"
      description={`Just for you, ${name}. One tap, nothing to fill in.`}
      footer={
        <button type="button" onClick={onSkip} className="text-sm text-ink-faint underline underline-offset-4 hover:text-ink-soft">
          Skip for now
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        {options.map((mood) => (
          <button
            key={mood}
            type="button"
            onClick={() => onSelect(mood)}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-paper py-4 transition duration-200 ease-calm hover:border-glow-300 hover:bg-glow-50"
          >
            <span className="text-3xl leading-none" aria-hidden="true">
              {moodFace[mood]}
            </span>
            <span className="text-xs font-semibold text-ink-soft">{moodWord[mood]}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
