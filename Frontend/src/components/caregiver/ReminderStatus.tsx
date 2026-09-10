import { SectionCard } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import type { Reminder } from '@/types'
import { timeLabel } from '@/lib/date'

interface ReminderStatusProps {
  reminders: Reminder[]
  onOpen: () => void
}

/** Just enough to answer "is today's routine on track?" — details live one tap away. */
export function ReminderStatus({ reminders, onOpen }: ReminderStatusProps) {
  const done = reminders.filter((r) => r.completed).length
  const total = reminders.length
  const next = reminders.find((r) => !r.completed)
  const allDone = total > 0 && done === total

  return (
    <SectionCard
      eyebrow="Reminders"
      title={total === 0 ? 'No reminders set' : `${done} of ${total} reminders completed`}
      onClick={onOpen}
      ariaLabel={`Reminders: ${done} of ${total} completed. Open reminder management.`}
      action={<Icon name="chevronRight" size={18} className="mt-1 text-ink-faint" />}
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5" aria-hidden="true">
          {reminders.map((r) => (
            <span
              key={r.id}
              className={`h-2 flex-1 rounded-pill ${r.completed ? 'bg-sage-500' : 'bg-line'}`}
            />
          ))}
        </div>
      </div>
      <p className="mt-3 text-sm text-ink-soft">
        {allDone
          ? 'Today’s routine is on track.'
          : next
            ? `Next: ${next.title} at ${timeLabel(next.time)}`
            : 'Add a first reminder to build the daily routine.'}
      </p>
    </SectionCard>
  )
}
