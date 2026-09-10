import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaregiverHeader } from '@/components/caregiver/CaregiverHeader'
import { ChangeSignal } from '@/components/caregiver/ChangeSignal'
import { CognitiveTrends } from '@/components/caregiver/CognitiveTrends'
import { CompleteProfilePrompt } from '@/components/caregiver/CompleteProfilePrompt'
import { DailyActivityCard } from '@/components/caregiver/DailyActivityCard'
import { MoodCheckIn } from '@/components/caregiver/MoodCheckIn'
import { MoodTrend } from '@/components/caregiver/MoodTrend'
import { Page } from '@/components/caregiver/Page'
import { ProfileMenu, type SettingsSection } from '@/components/caregiver/ProfileMenu'
import { QuickActionCard } from '@/components/caregiver/QuickActionCard'
import { ReminderStatus } from '@/components/caregiver/ReminderStatus'
import { PermissionNote } from '@/components/ui/Bits'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { layerLabel } from '@/lib/capabilities'
import { longDate, today } from '@/lib/date'
import { patientLabel } from '@/lib/patientName'
import { allTrends, caregiverSupportSignal, changeSignal } from '@/lib/trends'
import { useApp } from '@/state/AppContext'

/**
 * Layer 1 and Layer 2 share this screen. The order of the sections is the product:
 * today's activity, then the routine, then trends, then the change signal, then the
 * caregiver herself, and only then the tools. Settings never appear here — they live
 * behind the small avatar in the header.
 */
export function CaregiverDashboard() {
  const navigate = useNavigate()
  const { state, dispatch, currentUser, can } = useApp()
  const [profileOpen, setProfileOpen] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)

  if (!currentUser) return null

  const patient = state.patient
  const patientName = patientLabel(patient, currentUser)
  const helper = currentUser.layer === 2
  const todaySession = state.sessions.find((s) => s.date === today())
  const startedBy = state.users.find((u) => u.id === todaySession?.startedByUserId)

  // A trusted helper only ever sees the reminders she is responsible for.
  const visibleReminders = helper ? state.reminders.filter((r) => r.assignedToUserId === currentUser.id) : state.reminders

  // The family circle is a screen of its own; everything else is a settings section.
  // We push the Settings overview first so one back press returns to it, not home.
  const openSection = (section: SettingsSection) => {
    if (section === 'family') {
      navigate('/circle')
      return
    }
    navigate('/settings')
    navigate(`/settings?open=${section}`)
  }


  return (
    <Page>
      <CaregiverHeader
        title={helper ? `${patientName}’s Day` : `${patientName}’s Progress`}
        dateLabel={longDate()}
        roleLabel={helper ? layerLabel[2] : undefined}
        profileName={currentUser.name}
        onOpenProfile={() => setProfileOpen(true)}
      />

      <div className="space-y-4">
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

        <ReminderStatus reminders={visibleReminders} onOpen={() => navigate('/reminders')} />

        {can.viewTrends && <CognitiveTrends trends={allTrends(state.sessions)} onOpen={() => navigate('/trends')} />}

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

        <section aria-labelledby="quick-actions-heading" className="pt-1">
          <h2 id="quick-actions-heading" className="label-eyebrow mb-2.5 px-1">
            Quick actions
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <QuickActionCard
              icon="mic"
              title="Record a Memory"
              description="Add a photo, a voice note or a story for their activities."
              onClick={() => setRecordOpen(true)}
              disabled={!can.createMemory}
            />
            <QuickActionCard
              icon="bell"
              title="Manage Reminders"
              description={helper ? 'Mark your assigned reminders as done.' : 'Medicines, water, walks and routine.'}
              onClick={() => navigate('/reminders')}
              disabled={!can.viewReminders}
            />
            <QuickActionCard
              icon="users"
              title="Invite Family Member"
              description="Give a relative a gentle, contribute-only view."
              onClick={() => navigate('/circle')}
              disabled={!can.inviteFamily}
              disabledNote="Only the primary caregiver can invite family."
            />
          </div>
        </section>

        {helper && (
          <PermissionNote>
            You are helping as a trusted helper. Trends, family settings and account changes stay with{' '}
            {state.users.find((u) => u.layer === 1)?.name ?? 'the primary caregiver'}.
          </PermissionNote>
        )}
      </div>

      <ProfileMenu
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={currentUser}
        users={state.users}
        patient={patient}
        can={can}
        onOpenSection={openSection}
        onSwitchUser={(userId) => {
          dispatch({ type: 'signIn', userId })
          navigate(state.users.find((u) => u.id === userId)?.layer === 3 ? '/family' : '/')
        }}
        onSignOut={() => dispatch({ type: 'signOut' })}
      />

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
        onSelect={(mood) => dispatch({ type: 'addMood', mood, userId: currentUser.id })}
      />

      {/* One-time nudge after the very first sign-in. */}
      <CompleteProfilePrompt
        storageKey="jugnu_family_profile_prompt_v1"
        description="Tell Jugnu how you'd like to be addressed and how to reach the family — it makes the whole app feel like yours."
        onGoToSettings={() => navigate('/settings')}
      />
    </Page>
  )
}
