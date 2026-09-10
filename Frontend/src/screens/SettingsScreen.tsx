import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Page, ScreenHeader } from '@/components/caregiver/Page'
import { Button } from '@/components/ui/Button'
import { Chip, EmptyState, PermissionNote } from '@/components/ui/Bits'
import { Field, Segmented, TextInput, Toggle } from '@/components/ui/Form'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { SectionCard } from '@/components/ui/Card'
import { languageLabel, t } from '@/lib/i18n'
import { patientLabel } from '@/lib/patientName'
import { voice } from '@/lib/voice'
import { useApp } from '@/state/AppContext'
import type { SettingsSection } from '@/components/caregiver/ProfileMenu'
import type { LanguageCode, PersonalizationLevel } from '@/types'

const levelBlurb: Record<PersonalizationLevel, { label: string; description: string }> = {
  1: {
    label: 'Level 1 — Generic (Zero setup)',
    description: 'Object match, routine sequencing and pattern recall. Regionally familiar imagery, no personal data.',
  },
  2: {
    label: 'Level 2 — Personalized',
    description: 'Who’s Calling (recorded family voices), Remember When (real memories) and My Daily Routine, built from their own mornings.',
  },
  0: {
    label: 'Level 1 — Generic (Zero setup)',
    description: 'Object match, routine sequencing and pattern recall. Regionally familiar imagery, no personal data.',
  },
}

interface PatientDraft {
  name: string
  age: number
  region: string
  language: LanguageCode
  personalizationLevel: PersonalizationLevel
  voiceEnabled: boolean
  speechRate: number
}

/**
 * The browser loads its voice list asynchronously and may have no voice at all for
 * the chosen language, so this re-checks once the list arrives.
 */
function useVoiceAvailable(language: LanguageCode): boolean {
  const [available, setAvailable] = useState(true)
  useEffect(() => {
    if (!voice.supported) return
    const check = () => setAvailable(voice.hasVoiceFor(language))
    check()
    const id = window.setTimeout(check, 600)
    window.speechSynthesis?.addEventListener?.('voiceschanged', check)
    return () => {
      window.clearTimeout(id)
      window.speechSynthesis?.removeEventListener?.('voiceschanged', check)
    }
  }, [language])
  return available
}

/**
 * Everything account-shaped, reached from the avatar in the header — never from the
 * dashboard. Sections the current user may not change are simply not rendered.
 * Patient settings are staged locally and only reach the app after a PIN confirms them.
 */
export function SettingsScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { state, dispatch, currentUser, can } = useApp()
  const patient = state.patient
  const voiceAvailable = useVoiceAvailable(patient.language)

  const requested = params.get('open') as SettingsSection | null
  const anchors = useRef<Partial<Record<SettingsSection, HTMLDivElement | null>>>({})

  const draftValue = (p: typeof patient): PatientDraft => ({
    name: p.name,
    age: p.age,
    region: p.region,
    language: p.language,
    personalizationLevel: p.personalizationLevel === 0 ? 1 : p.personalizationLevel,
    voiceEnabled: p.voiceEnabled,
    speechRate: p.speechRate,
  })

  const [draft, setDraft] = useState<PatientDraft>(() => draftValue(patient))

  // "What you call them" is per-profile, not a shared patient field.
  const [callName, setCallName] = useState(() => currentUser?.callsPatient ?? patient.displayName)

  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinSaved, setPinSaved] = useState(false)

  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [confirmPin, setConfirmPin] = useState('')
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<'changes' | 'pin' | null>(null)

  const [levelBlocked, setLevelBlocked] = useState(false)

  const savedCallName = currentUser?.callsPatient ?? patient.displayName

  const dirty =
    draft.name !== patient.name ||
    callName !== savedCallName ||
    draft.age !== patient.age ||
    draft.region !== patient.region ||
    draft.language !== patient.language ||
    draft.personalizationLevel !== (patient.personalizationLevel === 0 ? 1 : patient.personalizationLevel) ||
    draft.voiceEnabled !== patient.voiceEnabled ||
    draft.speechRate !== patient.speechRate

  const canChange = can.editPatientProfile || can.editPersonalization

  // Deep links from the profile sheet land on the right card without hiding the rest.
  // When a section closes, the page returns to the overview (top), not home.
  useEffect(() => {
    if (requested) {
      const node = anchors.current[requested]
      if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
  }, [requested])

  const sampleVoice = (language: LanguageCode, rate: number) =>
    voice.speak(t(language, 'greeting', { name: callName }), { lang: language, rate })

  const patch = (p: Partial<PatientDraft>) => {
    setDraft((current) => ({ ...current, ...p }))
    setPinSaved(false)
  }

  /** Opens the PIN gate for whichever change the caregiver is trying to save. */
  const beginGate = (action: 'changes' | 'pin') => {
    if (action === 'pin' && (!currentUser || pin.length !== 4 || pin !== pinConfirm)) return
    setConfirmPin('')
    setConfirmError(null)
    setPendingAction(action)
    setPinModalOpen(true)
  }

  const cancelGate = () => {
    setPinModalOpen(false)
    setConfirmPin('')
    setConfirmError(null)
    setPendingAction(null)
  }

  const applyChanges = () => {
    const trimmedCallName = callName.trim()
    dispatch({
      type: 'updatePatient',
      patch: {
        name: draft.name,
        age: draft.age,
        region: draft.region,
        language: draft.language,
        personalizationLevel: draft.personalizationLevel,
        voiceEnabled: draft.voiceEnabled,
        speechRate: draft.speechRate,
      },
    })
    if (currentUser && trimmedCallName !== savedCallName) {
      dispatch({ type: 'updateUser', id: currentUser.id, patch: { callsPatient: trimmedCallName || undefined } })
    }
  }

  const applyNewPin = () => {
    if (!currentUser) return
    dispatch({ type: 'updateUser', id: currentUser.id, patch: { pin } })
    setPin('')
    setPinConfirm('')
    setPinSaved(true)
  }

  const confirmGate = () => {
    if (confirmPin.length !== 4) return
    const match = state.users.find((u) => u.pin === confirmPin)
    if (!match) {
      setConfirmPin('')
      setConfirmError('That PIN did not match. Please try again.')
      return
    }
    const action = pendingAction
    setPinModalOpen(false)
    setConfirmPin('')
    setConfirmError(null)
    setPendingAction(null)
    if (action === 'pin') applyNewPin()
    else if (action === 'changes') applyChanges()
  }

  const discard = () => {
    setDraft(draftValue(patient))
    setCallName(savedCallName)
  }

  const patientName = patientLabel(patient, currentUser)
  const nothingAllowed = !can.editPatientProfile && !can.editPersonalization && !can.editSecurity

  // Level 2 readiness mirrors what the session planner actually needs (plan.ts):
  // Who's Calling needs a family voice note; Remember When needs a usable memory
  // linked to a family member.
  const family = state.people.filter((p) => !p.isPatient)
  const voiceCount = family.filter((p) => p.voiceNote).length
  const storyCount = state.memories.filter(
    (m) => m.usableInActivities && m.personId && family.some((f) => f.id === m.personId),
  ).length
  const level2Ready = voiceCount >= 1 && storyCount >= 1

  return (
    <Page>
      <ScreenHeader
        title="Account & Settings"
        subtitle={`How Jugnu behaves for ${patientName}`}
        backTo={requested ? '/settings' : '/'}
      />

      <div className="space-y-4">
        {nothingAllowed && (
          <EmptyState
            icon="lock"
            title="Nothing to change here"
            body={`${state.users.find((u) => u.layer === 1)?.name ?? 'The primary caregiver'} looks after ${patientName}’s profile, language and personalization.`}
            action={
              <Button variant="secondary" icon="back" onClick={() => navigate('/')}>
                Back
              </Button>
            }
          />
        )}

        {can.editPatientProfile && (
          <div ref={(node) => { anchors.current.patient = node }}>
            <SectionCard eyebrow="Patient profile" title="About the person">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Their name">
                    {(id) => (
                      <TextInput
                        id={id}
                        value={draft.name}
                        disabled={!can.editPatientIdentity}
                        onChange={(e) => patch({ name: e.target.value })}
                      />
                    )}
                  </Field>
                  <Field label="What you call them" hint="Yours alone — each profile keeps its own word for the patient.">
                    {(id) => (
                      <TextInput
                        id={id}
                        value={callName}
                        onChange={(e) => setCallName(e.target.value)}
                      />
                    )}
                  </Field>
                  <Field label="Age">
                    {(id) => (
                      <TextInput
                        id={id}
                        type="number"
                        min={40}
                        max={110}
                        value={draft.age}
                        disabled={!can.editPatientIdentity}
                        onChange={(e) => patch({ age: Number(e.target.value) || 0 })}
                      />
                    )}
                  </Field>
                  <Field label="Where they live" hint="Helps Jugnu choose familiar words and objects.">
                    {(id) => (
                      <TextInput
                        id={id}
                        value={draft.region}
                        disabled={!can.editPatientIdentity}
                        onChange={(e) => patch({ region: e.target.value })}
                      />
                    )}
                  </Field>
                </div>
                <p className="text-xs text-ink-faint">Your changes apply after you confirm them with your PIN.</p>
              </div>
            </SectionCard>
          </div>
        )}

        {can.editPersonalization && (
          <div ref={(node) => { anchors.current.language = node }}>
            <SectionCard
              eyebrow="Language"
              title="What they hear"
              action={
                <Button variant="ghost" icon="volume" onClick={() => sampleVoice(draft.language, draft.speechRate)}>
                  Hear it
                </Button>
              }
            >
              <Segmented
                label="Language"
                value={draft.language}
                onChange={(language) => {
                  patch({ language })
                  sampleVoice(language, draft.speechRate)
                }}
                options={(Object.keys(languageLabel) as LanguageCode[]).map((code) => ({
                  value: code,
                  label: languageLabel[code],
                }))}
              />
              <p className="mt-3 text-xs text-ink-faint">
                Every word the patient hears or reads uses this language. Your own screens stay in English.
              </p>
              {!voiceAvailable && (
                <div className="mt-3">
                  <PermissionNote>
                    This device has no {languageLabel[patient.language]} voice installed. Jugnu still asks the browser
                    for it, and many browsers supply one over the network — but if their prompts are silent, that is why.
                    Adding the language in your computer’s speech settings fixes it, and English always works.
                  </PermissionNote>
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {can.editPersonalization && (
          <div ref={(node) => { anchors.current.personalization = node }}>
            <SectionCard eyebrow="Personalization" title="How personal their activities get">
              <div className="space-y-4">
                <Segmented
                  label="Personalization level"
                  value={draft.personalizationLevel}
                  onChange={(personalizationLevel) => {
                    if (personalizationLevel === 2 && !level2Ready) {
                      setDraft((d) => ({ ...d, personalizationLevel: 1 }))
                      setLevelBlocked(true)
                      return
                    }
                    patch({ personalizationLevel })
                  }}
                  options={([1, 2] as PersonalizationLevel[]).map((level) => ({
                    value: level,
                    label: levelBlurb[level].label,
                    description: levelBlurb[level].description,
                  }))}
                />

                <div className="rounded-2xl bg-sand/60 p-3">
                  <Toggle
                    checked={draft.voiceEnabled}
                    onChange={(voiceEnabled) => patch({ voiceEnabled })}
                    label="Jugnu speaks"
                    description="Voice comes first in every activity. Off leaves only the written line."
                  />
                </div>

                <Field label="Speaking speed" hint="Slower is usually kinder. Tap “Hear it” to check.">
                  {(id) => (
                    <div className="flex items-center gap-3">
                      <input
                        id={id}
                        type="range"
                        min={0.6}
                        max={1.1}
                        step={0.05}
                        value={draft.speechRate}
                        onChange={(e) => patch({ speechRate: Number(e.target.value) })}
                        className="h-11 flex-1 accent-glow-500"
                        aria-valuetext={`${Math.round(draft.speechRate * 100)} percent of normal speed`}
                      />
                      <Chip tone="neutral">{Math.round(draft.speechRate * 100)}%</Chip>
                      <Button variant="ghost" icon="volume" onClick={() => sampleVoice(draft.language, draft.speechRate)}>
                        Hear it
                      </Button>
                    </div>
                  )}
                </Field>
              </div>
            </SectionCard>
          </div>
        )}

        {can.manageFamily && (
          <div ref={(node) => { anchors.current.family = node }}>
            <SectionCard
              eyebrow="Linked family members"
              title="Their circle"
              action={
                <Button variant="secondary" icon="users" onClick={() => navigate('/circle')}>
                  Open
                </Button>
              }
            >
              <p className="text-sm text-ink-soft">
                {state.users.length} people share this Jugnu
                {state.invites.length ? `, and ${state.invites.length} invitation${state.invites.length === 1 ? '' : 's'} is waiting` : ''}
                .
              </p>
            </SectionCard>
          </div>
        )}

        {can.viewMemories && (
          <div ref={(node) => { anchors.current.memories = node }}>
            <SectionCard
              eyebrow="Memory shelf"
              title="Memories"
              action={
                <Button variant="secondary" icon="image" onClick={() => navigate('/memories')}>
                  Open
                </Button>
              }
            >
              <p className="text-sm text-ink-soft">
                Photos, voices and small stories Jugnu can use with {patientName}. Add new ones from the dashboard.
              </p>
            </SectionCard>
          </div>
        )}

        {can.editSecurity && currentUser && (
          <div ref={(node) => { anchors.current.account = node }}>
            <SectionCard eyebrow="Account & security" title="Your PIN">
              <div className="space-y-4">
                <p className="text-sm text-ink-soft">
                  Your PIN is what brings you back from {patientName}’s activity screen. Four digits, easy for you
                  to remember.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="New PIN" required>
                    {(id) => (
                      <TextInput
                        id={id}
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        maxLength={4}
                        value={pin}
                        placeholder="••••"
                        onChange={(e) => {
                          setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                          setPinSaved(false)
                        }}
                      />
                    )}
                  </Field>
                  <Field label="Type it again" required>
                    {(id) => (
                      <TextInput
                        id={id}
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        maxLength={4}
                        value={pinConfirm}
                        placeholder="••••"
                        onChange={(e) => {
                          setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))
                          setPinSaved(false)
                        }}
                      />
                    )}
                  </Field>
                </div>
                {pin.length === 4 && pinConfirm.length === 4 && pin !== pinConfirm && (
                  <p className="text-sm text-clay-700">The two PINs are different. Please check them.</p>
                )}
                {pinSaved && (
                  <p className="flex items-center gap-2 text-sm text-sage-700">
                    <Icon name="check" size={16} /> Your new PIN is saved.
                  </p>
                )}
                <Button variant="primary" icon="shield" onClick={() => beginGate('pin')} disabled={pin.length !== 4 || pin !== pinConfirm}>
                  Save PIN
                </Button>
              </div>
            </SectionCard>
          </div>
        )}
      </div>

      {canChange && dirty && (
        <div className="sticky bottom-4 z-20 mx-auto mt-6 flex w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl items-center justify-between gap-3 rounded-card border border-line bg-paper/95 px-4 py-3 shadow-lift">
          <p className="text-sm font-semibold text-ink-soft">Unsaved changes</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={discard}>
              Discard
            </Button>
            <Button variant="primary" icon="shield" onClick={() => beginGate('changes')}>
              Save changes
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={pinModalOpen}
        onClose={cancelGate}
        size="sm"
        title="Confirm with your PIN"
        description={pendingAction === 'pin' ? 'Enter your current PIN to save your new one.' : 'Enter your PIN to save these settings.'}
        footer={
          <>
            <Button variant="ghost" onClick={cancelGate}>
              Cancel
            </Button>
            <Button variant="primary" icon="shield" onClick={confirmGate} disabled={confirmPin.length !== 4}>
              Confirm
            </Button>
          </>
        }
      >
        <TextInput
          aria-label="Your PIN"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={4}
          value={confirmPin}
          placeholder="••••"
          onChange={(e) => {
            setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))
            setConfirmError(null)
          }}
        />
        {confirmError && <p className="mt-2 text-sm text-clay-700">{confirmError}</p>}
      </Modal>

      {/* Level 2 needs usable memories of both kinds before it can unlock. */}
      <Modal
        open={levelBlocked}
        onClose={() => setLevelBlocked(false)}
        title="Personalized games aren't ready yet"
        description={`Level 2 uses Who's Calling (a recorded family voice) and Remember When (a real memory story).`}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink">Readiness</span>
              <span className="font-medium text-ink-soft">{Math.min(voiceCount, 1) + Math.min(storyCount, 1)} of 2</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand">
              <div
                className="h-full rounded-full bg-gradient-to-r from-glow-400 to-sage-400 transition-all duration-500 ease-calm"
                style={{ width: `${((Math.min(voiceCount, 1) + Math.min(storyCount, 1)) / 2) * 100}%` }}
              />
            </div>
          </div>

          {/* Who's Calling card */}
          <div className={`rounded-2xl border p-4 transition duration-200 ease-calm ${voiceCount >= 1 ? 'border-sage-200 bg-sage-50/50' : 'border-line bg-paper'}`}>
            <div className="flex items-start gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${voiceCount >= 1 ? 'bg-sage-100 text-sage-700' : 'bg-glow-50 text-glow-700'}`}>
                <Icon name="volume" size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Who's Calling?</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                  {voiceCount >= 1
                    ? 'A family voice is recorded and ready for play.'
                    : 'Record a short voice greeting from a family member for recognition.'}
                </p>
              </div>
              {voiceCount >= 1 ? (
                <span className="chip shrink-0 bg-sage-100 text-sage-700">
                  <Icon name="check" size={12} /> Ready
                </span>
              ) : (
                <Button variant="ghost" icon="plus" onClick={() => { setLevelBlocked(false); navigate('/memories/new?game=whos_calling') }}>
                  Add
                </Button>
              )}
            </div>
          </div>

          {/* Remember When card */}
          <div className={`rounded-2xl border p-4 transition duration-200 ease-calm ${storyCount >= 1 ? 'border-sage-200 bg-sage-50/50' : 'border-line bg-paper'}`}>
            <div className="flex items-start gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${storyCount >= 1 ? 'bg-sage-100 text-sage-700' : 'bg-sage-50 text-sage-700'}`}>
                <Icon name="heart" size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Remember When</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                  {storyCount >= 1
                    ? 'A real memory story is saved and ready for play.'
                    : 'Share a real memory story — a place, a day, a small moment.'}
                </p>
              </div>
              {storyCount >= 1 ? (
                <span className="chip shrink-0 bg-sage-100 text-sage-700">
                  <Icon name="check" size={12} /> Ready
                </span>
              ) : (
                <Button variant="ghost" icon="plus" onClick={() => { setLevelBlocked(false); navigate('/memories/new?game=remember_when') }}>
                  Add
                </Button>
              )}
            </div>
          </div>

          <p className="text-xs leading-relaxed text-ink-faint">
            Add at least one of each and switch them on in the memory shelf — then Level 2 unlocks for {patientName}.
          </p>
        </div>
      </Modal>
    </Page>
  )
}