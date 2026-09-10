import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon, type IconName } from '@/components/ui/Icon'
import { PermissionNote } from '@/components/ui/Bits'
import type { Memory, Person, PersonalizationLevel } from '@/types'

interface DailyActivityCardProps {
  completed: boolean
  canStart: boolean
  patientName: string
  onStart: (game?: string) => void
  startedByName?: string
  activityCount?: number
  onOpenSummary?: () => void
  level?: PersonalizationLevel
  /** The family circle — faces shown on the person-based game cards. */
  people?: Person[]
  /** Approved memories used to pick faces for the Remember When card. */
  memories?: Memory[]
}

interface GameItem {
  id: string
  num: string
  name: string
  icon: IconName
  desc: string
  domain: string
  /** Faces for person-based games (Who's Calling / Remember When). */
  people?: Pick<Person, 'name' | 'portraitTone' | 'photoUrl'>[]
}

/**
 * The single most important element on the caregiver dashboard: has today's
 * activity happened or not? Now provides direct game selection so caregivers
 * can launch specific activities on demand.
 */
export function DailyActivityCard({
  completed,
  canStart,
  patientName,
  onStart,
  startedByName,
  activityCount = 3,
  onOpenSummary,
  level = 1,
  people = [],
  memories = [],
}: DailyActivityCardProps) {
  const [showPicker, setShowPicker] = useState(false)

  const isLevel2 = level === 2

  const voiced = people.filter((p) => !p.isPatient && p.voiceNote)
  const faces = (ids: (string | undefined)[]) =>
    people.filter(
      (p) => !p.isPatient && ids.includes(p.id),
    )

  const level1Games: GameItem[] = [
    {
      id: 'object_match',
      num: '1',
      name: 'Object Match',
      icon: 'sparkle',
      desc: 'Identify familiar items (kettle, basket, mango)',
      domain: 'Attention',
    },
    {
      id: 'routine_sequencing',
      num: '2',
      name: 'Routine Sequencing',
      icon: 'clock',
      desc: 'Arrange making tea steps in order',
      domain: 'Memory',
    },
    {
      id: 'pattern_recall',
      num: '3',
      name: 'Pattern Recall',
      icon: 'shield',
      desc: 'Visual sequence completion & recall',
      domain: 'Pattern Recognition',
    },
  ]

  const level2Games: GameItem[] = [
    {
      id: 'whos_calling',
      num: '1',
      name: 'Who’s Calling?',
      icon: 'volume',
      desc: 'Identify familiar recorded family voices',
      domain: 'Voice Recognition',
      people: voiced.map((p) => ({ name: p.name, portraitTone: p.portraitTone, photoUrl: p.photoUrl })),
    },
    {
      id: 'memory_recall',
      num: '2',
      name: 'Remember When',
      icon: 'heart',
      desc: 'A real memory story, then who was there with her',
      domain: 'Memory',
      people: faces(memories.filter((m) => m.usableInActivities).map((m) => m.personId)).map((p) => ({
        name: p.name,
        portraitTone: p.portraitTone,
        photoUrl: p.photoUrl,
      })),
    },
    {
      id: 'routine_sequencing',
      num: '3',
      name: 'My Daily Routine',
      icon: 'clock',
      desc: 'Sequence her own morning routine in order',
      domain: 'Memory',
    },
  ]

  const games = isLevel2 ? level2Games : level1Games

  return (
    <section
      aria-labelledby="today-activity-heading"
      className={`relative overflow-hidden rounded-card border shadow-card transition-all duration-300 ${
        completed ? 'border-sage-100 bg-sage-100/50' : 'border-glow-200 bg-gradient-to-br from-glow-50 to-glow-100/70'
      }`}
    >
      <div className="relative p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="label-eyebrow">Today’s Activity</p>
        </div>

        {completed ? (
          <>
            <h2 id="today-activity-heading" className="mt-2 flex items-center gap-2 font-display text-2xl text-sage-700">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-sage-500 text-white">
                <Icon name="check" size={18} />
              </span>
              Completed
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              {patientName} finished {activityCount} {activityCount === 1 ? 'activity' : 'activities'} today
              {startedByName ? ` · started by ${startedByName}` : ''}.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {canStart && (
                <Button variant="secondary" icon="play" onClick={() => onStart()}>
                  Play full session again
                </Button>
              )}
              {canStart && (
                <Button
                  variant="ghost"
                  icon="sparkle"
                  onClick={() => setShowPicker((prev) => !prev)}
                >
                  {showPicker ? 'Close game picker' : 'Pick a single game'}
                </Button>
              )}
              {onOpenSummary && (
                <Button variant="ghost" trailingIcon="chevronRight" onClick={onOpenSummary}>
                  See what changed
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 id="today-activity-heading" className="mt-2 font-display text-2xl text-ink">
              Not started yet
            </h2>
            <p className="mt-2 max-w-md text-sm text-ink-soft">
              A gentle set of {activityCount} activities. You can start the full session or select an individual game below.
            </p>
            {canStart ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onStart()}
                  className="flex flex-1 min-w-[200px] items-center justify-center gap-3 rounded-[22px] bg-glow-500 px-6 py-4 text-base font-semibold text-white shadow-glow transition duration-200 ease-calm hover:bg-glow-600 active:scale-[0.995] sm:text-lg"
                >
                  <Icon name="play" size={20} />
                  Start Full Session ({activityCount} Games)
                </button>
                <Button
                  variant="secondary"
                  icon="sparkle"
                  onClick={() => setShowPicker((prev) => !prev)}
                  className="px-4 py-4 text-sm"
                >
                  {showPicker ? 'Hide Options' : 'Select Game'}
                </Button>
              </div>
            ) : (
              <div className="mt-5">
                <PermissionNote>Starting today’s activity is handled by the primary caregiver.</PermissionNote>
              </div>
            )}
          </>
        )}

        {/* Individual Game Selector Panel */}
        {canStart && showPicker && (
          <div className="mt-6 pt-5 border-t border-line/60 animate-rise-in space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Select an individual game to play:
              </p>
              <span className="text-[11px] text-ink-faint">Single activity · Hands over to {patientName}</span>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3">
              {games.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onStart(g.id)}
                  className="group flex flex-col justify-between rounded-2xl border border-line bg-paper/90 p-3.5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-glow-300 hover:bg-glow-50/50 hover:shadow-card active:translate-y-0"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-sand/70 text-ink text-xs font-semibold group-hover:bg-glow-200 group-hover:text-glow-800">
                        {g.num}
                      </span>
                      <span className="text-[10px] font-medium text-ink-faint">{g.domain}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-ink group-hover:text-glow-900">{g.name}</p>
                    <p className="mt-1 text-xs text-ink-soft leading-relaxed">{g.desc}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-glow-800">
                    <Icon name="play" size={13} />
                    <span>Play this</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

