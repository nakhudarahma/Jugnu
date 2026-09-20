import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaregiverHeader } from '@/components/caregiver/CaregiverHeader'
import { ChangeSignal } from '@/components/caregiver/ChangeSignal'
import { CompleteProfilePrompt } from '@/components/caregiver/CompleteProfilePrompt'
import { DailyActivityCard } from '@/components/caregiver/DailyActivityCard'
import { MoodCheckIn } from '@/components/caregiver/MoodCheckIn'
import { MoodTrend } from '@/components/caregiver/MoodTrend'
import { Page } from '@/components/caregiver/Page'
import { QuickActionCard } from '@/components/caregiver/QuickActionCard'
import { StatCard } from '@/components/caregiver/StatCard'
import { PermissionNote } from '@/components/ui/Bits'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { layerLabel } from '@/lib/capabilities'
import { longDate, today } from '@/lib/date'
import { patientLabel } from '@/lib/patientName'
import { caregiverSupportSignal, changeSignal } from '@/lib/trends'
import { useApp } from '@/state/AppContext'

/**
 * Layer 1 and Layer 2 share this screen. The order of the sections is the product:
 * today at a glance, then today's activity, then the signals worth noticing, and
 * only then the tools.
 */
export function CaregiverDashboard() {
  const navigate = useNavigate()
  const { state, dispatch, currentUser, can, api } = useApp()
  const [recordOpen, setRecordOpen] = useState(false)

  if (!currentUser) return null

  const patient = state.patient
  const patientName = patientLabel(patient, currentUser)
  const helper = currentUser.layer === 2
  const todaySession = state.sessions.find((s) => s.date === today())
  const startedBy = state.users.find((u) => u.id === todaySession?.startedByUserId)

  // A trusted helper only ever sees the reminders she is responsible for.
  const visibleReminders = helper ? state.reminders.filter((r) => r.assignedToUserId === currentUser.id) : state.reminders
  const doneReminders = visibleReminders.filter((r) => r.completed).length
  const reminderTotal = visibleReminders.length
  const voiceNotes = state.people.filter((p) => !p.isPatient && p.voiceNote).length

  return (
    <Page>
      <CaregiverHeader
        title={helper ? `${patientName}’s Day` : `${patientName}’s Progress`}
        dateLabel={longDate()}
        roleLabel={helper ? layerLabel[2] : undefined}
      />

      <div className="mt-4 space-y-6">
        {/* ─── Today at a glance ─── */}
        <section aria-labelledby="glance-heading">
          <h2 id="glance-heading" className="sr-only">Today at a glance</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label="Activities today"
              value={todaySession?.completed ? 'Done' : todaySession?.activityCount ?? 3}
              sub={todaySession?.completed ? "Today's set is complete" : `A gentle set of ${todaySession?.activityCount ?? 3} games`}
              icon="play"
              tone="clay"
              onClick={can.startSession ? () => navigate('/session') : undefined}
            />
            <StatCard
              label="Reminders"
              value={reminderTotal === 0 ? '0' : `${doneReminders} / ${reminderTotal}`}
              sub={reminderTotal === 0 ? 'No reminders set' : doneReminders === reminderTotal ? 'Routine on track' : 'Still to do today'}
              icon="bell"
              tone="sage"
              onClick={can.viewReminders ? () => navigate('/reminders') : undefined}
            />
            <StatCard
              label="Family memories"
              value={state.memories.length}
              sub={state.memories.length === 0 ? 'Add a first story' : 'Stories, photos & voice'}
              icon="heart"
              tone="lilac"
              onClick={can.viewMemories ? () => navigate('/memories') : undefined}
            />
            <StatCard
              label="Family voices"
              value={voiceNotes}
              sub={voiceNotes === 0 ? 'Record a greeting' : 'Voices saved for games'}
              icon="volume"
              tone="clay"
              onClick={can.createMemory ? () => navigate('/memories/new?game=whos_calling') : undefined}
            />
          </div>
        </section>

        {/* ─── Main content, composed in two columns ─── */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <DailyActivityCard
              completed={Boolean(todaySession?.completed)}
              canStart={can.startSession}
              patientName={patientName}
              activityCount={todaySession?.activityCount ?? 3}
              startedByName={startedBy?.name}
              level={patient.personalizationLevel}
              people={state.people}
              memories={state.memories}
              onStart={(game) => navigate(game ? `/session?game=${game}` : '/session')}
              onOpenSummary={can.viewTrends ? () => navigate('/trends') : undefined}
            />
          </div>

          <div className="min-w-0 space-y-6">
            {can.viewChangeSignal && (
              <ChangeSignal signal={changeSignal(state.sessions)} onReview={() => navigate('/trends')} />
            )}

            {can.moodCheckIn && (
              <MoodTrend
                moods={state.moods.filter((m) => m.userId === currentUser.id)}
                support={caregiverSupportSignal(state.moods, currentUser.id)}
                checkedInToday={state.moods.some((m) => m.userId === currentUser.id && m.date === today())}
                onCheckIn={() => dispatch({ type: 'requestMoodCheckIn' })}
              />
            )}

            {helper && (
              <PermissionNote>
                You are helping as a trusted helper. Trends, family settings and account changes stay with{' '}
                {state.users.find((u) => u.layer === 1)?.name ?? 'the primary caregiver'}.
              </PermissionNote>
            )}
          </div>
        </div>

        {/* ─── Quick actions, spanning the full width below the columns ─── */}
        <section aria-labelledby="quick-actions-heading">
          <h2 id="quick-actions-heading" className="label-eyebrow mb-2.5 px-1">
            Quick actions
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <QuickActionCard
              icon="mic"
              title="Record a Memory"
              description="Add a photo, a voice note or a story for their activities."
              onClick={() => setRecordOpen(true)}
              disabled={!can.createMemory}
              tone="glow"
            />
            <QuickActionCard
              icon="bell"
              title="Manage Reminders"
              description={helper ? 'Mark your assigned reminders as done.' : 'Medicines, water, walks and routine.'}
              onClick={() => navigate('/reminders')}
              disabled={!can.viewReminders}
              tone="sage"
            />
            <QuickActionCard
              icon="users"
              title="Invite Family Member"
              description="Give a relative a gentle, contribute-only view."
              onClick={() => navigate('/circle')}
              disabled={!can.inviteFamily}
              disabledNote="Only the primary caregiver can invite family."
              tone="lilac"
            />
          </div>
        </section>
      </div>

      <Modal
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        title="Record for their games"
        description={`Two of ${patientName}’s games need your family’s voice and memories. What are you adding?`}
        size="sm"
      >
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => {
              setRecordOpen(false)
              navigate('/memories/new?game=whos_calling')
            }}
            className="flex w-full items-start gap-3 rounded-2xl border border-line bg-paper p-4 text-left transition duration-200 ease-calm hover:border-glow-300 hover:bg-glow-50/60"
          >
            <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-glow-50 text-glow-700">
              <Icon name="volume" size={19} />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-ink">Who’s Calling?</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
                Record a short voice greeting from a family member for the recognition game.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRecordOpen(false)
              navigate('/memories/new?game=remember_when')
            }}
            className="flex w-full items-start gap-3 rounded-2xl border border-line bg-paper p-4 text-left transition duration-200 ease-calm hover:border-sage-300 hover:bg-sage-50/60"
          >
            <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage-50 text-sage-700">
              <Icon name="heart" size={19} />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-ink">Remember When</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
                Share a real memory story — a place, a day, a small moment with {patientName}.
              </span>
            </span>
          </button>
        </div>
      </Modal>

      {/* Only ever shown when a caregiver is really back with the device. */}
      <MoodCheckIn
        open={state.pendingMoodCheckIn && can.moodCheckIn}
        name={currentUser.name}
        onSkip={() => dispatch({ type: 'dismissMoodCheckIn' })}
        onSelect={(mood) => {
          dispatch({ type: 'addMood', mood, userId: currentUser.id })
          void api.addMood(patient.id, mood)
        }}
      />

      {/* One-time nudge after the very first sign-in of this account. */}
      <CompleteProfilePrompt
        storageKey={`jugnu_family_profile_prompt_v1_${currentUser.id}`}
        description="Tell Jugnu how you'd like to be addressed and how to reach the family — it makes the whole app feel like yours."
        onGoToSettings={() => navigate('/settings')}
      />
    </Page>
  )
}
