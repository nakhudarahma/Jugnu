import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '@/components/caregiver/Page'
import { ProfileMenu } from '@/components/caregiver/ProfileMenu'
import { Button, IconButton } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Bits'
import { SectionCard } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Portrait } from '@/components/ui/Portrait'
import { daysAgo, longDate, relativeDayLabel, today } from '@/lib/date'
import { patientLabel } from '@/lib/patientName'
import { caregiverSupportSignal, changeSignal } from '@/lib/trends'
import { useApp } from '@/state/AppContext'

/**
 * Layer 3 — Connected Family Member (SIH26003 Specification).
 * Provides a view-only dashboard with a weekly family digest, shared safety alerts
 * (sustained decline & caregiver burnout protection), and remote voice game contributions
 * with an editorial caregiver-approval gate.
 */
export function FamilyHomeScreen() {
  const navigate = useNavigate()
  const { state, dispatch, currentUser, can } = useApp()
  const [profileOpen, setProfileOpen] = useState(false)

  if (!currentUser) return null

  const patient = state.patient
  const patientName = patientLabel(patient, currentUser)
  const primary = state.users.find((u) => u.layer === 1)
  const mine = state.memories.filter((m) => m.createdByUserId === currentUser.id)
  const waiting = mine.filter((m) => m.status === 'pending')
  const inUse = mine.filter((m) => m.status === 'approved')
  const activeToday = state.sessions.some((s) => s.date === today())

  // Weekly digest calculations (last 7 days)
  const recentSessions = state.sessions.filter((s) => s.completed && s.date >= daysAgo(7))
  const sessionsThisWeek = recentSessions.length

  // Safety & Burnout signals
  const changeSig = changeSignal(state.sessions)
  const supportSig = primary ? caregiverSupportSignal(state.moods, primary.id) : { level: 'none', headline: '' }

  // Check recent moods of primary caregiver for burnout detection
  const recentPrimaryMoods = state.moods
    .filter((m) => m.userId === primary?.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4)
  const hasLowMoods = recentPrimaryMoods.some((m) => m.mood === 'low' || m.mood === 'ok')

  return (
    <Page>
      {/* Header */}
      <header className="mb-7 flex items-start gap-5 px-1 pt-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <img src="/logoo.png" alt="Jugnu" className="h-12 w-12 sm:h-14 sm:w-14" style={{ objectFit: 'contain' }} />
            <p className="label-eyebrow">{longDate()}</p>
          </div>
          <h1 className="font-display text-[1.6rem] leading-snug text-ink">
            {patientName} is being looked after
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {activeToday
              ? `They completed their Jugnu activities today.${primary ? ` ${primary.name} is with them.` : ''}`
              : `${primary?.name ?? 'The family'} will sit with them and Jugnu today.`}
          </p>
        </div>
        <IconButton icon="user" label="Your account" onClick={() => setProfileOpen(true)} />
      </header>

      <div className="space-y-4">
        {/* Shared Family Alerts: Caregiver Burnout & Cognitive Review (SIH26003 Spec) */}
        {(supportSig.level === 'support' || changeSig.level === 'watch' || hasLowMoods) && (
          <section className="space-y-2.5">
            <h2 className="label-eyebrow px-1">Family Care Alerts</h2>

            {/* Caregiver Burnout Protection Alert */}
            {(supportSig.level === 'support' || hasLowMoods) && (
              <div className="rounded-card border border-glow-300 bg-glow-50/90 p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-glow-200 text-glow-800">
                    <Icon name="heart" size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="chip bg-glow-200 text-xs font-semibold text-glow-900">Caregiver Well-being</span>
                    </div>
                    <h3 className="mt-1 font-display text-base text-ink">
                      {primary?.name ?? 'The primary caregiver'} might appreciate a check-in
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                      Caregiving is emotionally and physically demanding. Sharing routine tasks or calling {primary?.name} helps prevent burnout from becoming a silent challenge.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Cognitive Decline Review Alert */}
            {changeSig.level === 'watch' && (
              <div className="rounded-card border border-sand bg-paper p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sand text-ink-soft">
                    <Icon name="shield" size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="chip bg-sand text-xs font-semibold text-ink-soft">Monitoring Signal</span>
                    </div>
                    <h3 className="mt-1 font-display text-base text-ink">{changeSig.headline}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                      Jugnu noticed a sustained change in recent activities. A gentle clinical review note has been flagged for {primary?.name} to mention at {patientName}’s next routine checkup.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* View-Only Dashboard: Weekly Family Digest */}
        <section className="card card-pad bg-paper space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="label-eyebrow">Weekly Family Digest</p>
              <h2 className="font-display text-lg text-ink">{patientName}’s Week at a Glance</h2>
            </div>
            <Chip tone="sage">{sessionsThisWeek} sessions this week</Chip>
          </div>

          <p className="text-xs text-ink-soft">
            A high-level summary of {patientName}’s engagement, kept calm and non-clinical.
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="rounded-2xl border border-line bg-sand/40 p-2.5">
              <p className="text-[11px] font-medium uppercase text-ink-faint">Memory</p>
              <p className="mt-1 text-sm font-semibold text-ink">Stable</p>
              <p className="text-[10px] text-ink-soft">Family stories</p>
            </div>
            <div className="rounded-2xl border border-line bg-sand/40 p-2.5">
              <p className="text-[11px] font-medium uppercase text-ink-faint">Attention</p>
              <p className="mt-1 text-sm font-semibold text-ink">Gentle Focus</p>
              <p className="text-[10px] text-ink-soft">Paced activities</p>
            </div>
            <div className="rounded-2xl border border-line bg-sand/40 p-2.5">
              <p className="text-[11px] font-medium uppercase text-ink-faint">Recognition</p>
              <p className="mt-1 text-sm font-semibold text-ink">Receptive</p>
              <p className="text-[10px] text-ink-soft">Voice & photos</p>
            </div>
          </div>

          {/* Feedback loop on family memories in sessions */}
          {inUse.length > 0 && (
            <div className="mt-2 flex items-center gap-2.5 rounded-2xl bg-sage-50/80 px-3.5 py-2.5 text-xs text-sage-800">
              <Icon name="sparkle" size={16} className="shrink-0 text-sage-600" />
              <span>
                <strong>Active in sessions:</strong> {patientName} heard your recorded message in recent morning sessions.
              </span>
            </div>
          )}
        </section>

        {/* Remote Voice Contributions for Cognitive Games */}
        <section className="card card-pad bg-gradient-to-br from-glow-50/70 to-paper space-y-3">
          <div>
            <p className="label-eyebrow">Remote Contributions</p>
            <h2 className="font-display text-xl text-ink">Record for {patientName}’s Cognitive Games</h2>
            <p className="mt-1 text-xs text-ink-soft leading-relaxed">
              Your voice helps power {patientName}’s games from afar. Recordings are sent to {primary?.name ?? 'the primary caregiver'} for a quick review before playing in {patientName}’s sessions.
            </p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 pt-1">
            {/* "Who's Calling?" game contribution */}
            <div className="flex flex-col justify-between rounded-2xl border border-line bg-paper/80 p-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-glow-100 text-glow-700">
                    <Icon name="volume" size={15} />
                  </span>
                  <p className="text-sm font-semibold text-ink">“Who’s Calling?”</p>
                </div>
                <p className="mt-2 text-xs text-ink-soft">
                  Record a short, cheerful 5-second greeting so {patientName} can identify your voice in the audio quiz.
                </p>
              </div>
              <div className="mt-3">
                <Button
                  variant="secondary"
                  icon="mic"
                  onClick={() => navigate('/memories/new?game=whos_calling')}
                  className="w-full text-xs justify-center"
                >
                  Record Greeting
                </Button>
              </div>
            </div>

            {/* "Remember When" game contribution */}
            <div className="flex flex-col justify-between rounded-2xl border border-line bg-paper/80 p-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-sage-100 text-sage-700">
                    <Icon name="heart" size={15} />
                  </span>
                  <p className="text-sm font-semibold text-ink">“Remember When”</p>
                </div>
                <p className="mt-2 text-xs text-ink-soft">
                  Share a fond memory (e.g. a trip or family meal) to spark warm reminiscence in the daily session.
                </p>
              </div>
              <div className="mt-3">
                <Button
                  variant="secondary"
                  icon="mic"
                  onClick={() => navigate('/memories/new?game=remember_when')}
                  className="w-full text-xs justify-center"
                >
                  Record Memory Prompt
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-line/50">
            <span className="text-xs text-ink-faint">Or upload a traditional photo & memory note:</span>
            <Button variant="ghost" icon="plus" onClick={() => navigate('/memories/new')} className="text-xs">
              General Memory
            </Button>
          </div>
        </section>

        {/* Your Contributions List & Status */}
        <SectionCard eyebrow="Your contributions" title={`${mine.length} shared with Maa`}>
          {mine.length ? (
            <ul className="divide-y divide-line">
              {mine.slice(0, 5).map((memory) => (
                <li key={memory.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{memory.title}</p>
                    <p className="text-xs text-ink-soft">
                      {memory.voiceNote ? '🎙️ Voice clip · ' : ''}
                      {relativeDayLabel(memory.createdAt)}
                    </p>
                    {memory.voiceNote?.transcript && (
                      <p className="mt-1 line-clamp-1 text-xs italic text-ink-faint">
                        “{memory.voiceNote.transcript}”
                      </p>
                    )}
                  </div>
                  <Chip tone={memory.status === 'approved' ? 'sage' : 'glow'}>
                    {memory.status === 'approved' ? 'In their games' : 'Waiting for review'}
                  </Chip>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-soft">Nothing yet. Record a quick voice greeting above to get started.</p>
          )}
          {mine.length > 0 && (
            <p className="mt-3 flex items-center gap-2 text-xs text-ink-faint">
              <Icon name="check" size={14} className="text-sage-600" />
              {inUse.length} in active games · {waiting.length} waiting for {primary?.name ?? 'caregiver review'}
            </p>
          )}
        </SectionCard>

        {/* Care Circle */}
        <SectionCard eyebrow="Their care circle" title="Who else is around them">
          <ul className="flex flex-wrap gap-3">
            {state.users
              .filter((u) => u.layer === 1 || u.layer === 2)
              .map((user) => (
                <li key={user.id} className="flex items-center gap-2 rounded-pill border border-line bg-paper px-3 py-1.5">
                  <span className="h-7 w-7 overflow-hidden rounded-full border border-line">
                    <Portrait name={user.name} tone={user.portraitTone} compact />
                  </span>
                  <span className="text-xs font-semibold text-ink">{user.name}</span>
                  <span className="text-xs text-ink-faint">{user.relationship}</span>
                </li>
              ))}
          </ul>
        </SectionCard>
      </div>

      <ProfileMenu
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={currentUser}
        users={state.users}
        patient={patient}
        can={can}
        onOpenSection={() => navigate('/settings')}
        onSwitchUser={(userId) => {
          dispatch({ type: 'signIn', userId })
          navigate(state.users.find((u) => u.id === userId)?.layer === 3 ? '/family' : '/')
        }}
        onSignOut={() => dispatch({ type: 'signOut' })}
      />
    </Page>
  )
}

