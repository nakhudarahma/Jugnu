import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, ScreenHeader } from '@/components/caregiver/Page'
import { Button } from '@/components/ui/Button'
import { Chip, PermissionNote } from '@/components/ui/Bits'
import { Field, TextInput, Toggle } from '@/components/ui/Form'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { SectionCard } from '@/components/ui/Card'
import { getFacilityName, getWorkerName, getWorkerPin, setFacilityName, setWorkerName, setWorkerPin } from '@/data/facility'
import { voice } from '@/lib/voice'

function useVoiceSample() {
  const speak = (rate: number) =>
    voice.speak('Good morning, how are you feeling today?', { lang: 'hi', rate })
  return speak
}

/**
 * Health-worker settings — the calm, full-page account & control screen behind
 * the roster's gear icon. Covers the facility at a glance, display and audio
 * preferences for the worker's own device, and the PIN that locks them into
 * a patient session.
 */
export function HealthWorkerSettingsScreen() {
  const navigate = useNavigate()
  const speakSample = useVoiceSample()

  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [speechRate, setSpeechRate] = useState(0.9)

  const [name, setName] = useState(getWorkerName())
  const [nameSaved, setNameSaved] = useState(false)

  const [facility, setFacility] = useState(getFacilityName())
  const [facilitySaved, setFacilitySaved] = useState(false)

  const [profileEditing, setProfileEditing] = useState(false)

  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [saved, setSaved] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'profile' | 'pin'>('pin')
  const [confirmPin, setConfirmPin] = useState('')
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const canSavePin = pin.length === 4 && pin === pinConfirm

  useEffect(() => setSaved(false), [pin, pinConfirm])
  useEffect(() => setNameSaved(false), [name])
  useEffect(() => setFacilitySaved(false), [facility])

  const saveBoth = () => {
    setWorkerName(name)
    setFacilityName(facility)
    setNameSaved(true)
    setFacilitySaved(true)
    setProfileEditing(false)
  }

  const requestSave = () => {
    setConfirmAction('profile')
    setConfirmPin('')
    setConfirmError(null)
    setConfirming(true)
  }

  const startEditing = () => {
    setName(getWorkerName())
    setFacility(getFacilityName())
    setNameSaved(false)
    setFacilitySaved(false)
    setProfileEditing(true)
  }

  const cancelEditing = () => {
    setProfileEditing(false)
    setName(getWorkerName())
    setFacility(getFacilityName())
  }

  const cancelEditingModal = () => {
    setConfirming(false)
    setConfirmPin('')
    setConfirmError(null)
    if (confirmAction === 'profile') cancelEditing()
  }

  const applyNewPin = () => {
    setWorkerPin(pin)
    setPin('')
    setPinConfirm('')
    setSaved(true)
  }

  const confirm = () => {
    if (confirmPin !== getWorkerPin()) {
      setConfirmPin('')
      setConfirmError('That PIN did not match. Please try again.')
      return
    }
    setConfirming(false)
    setConfirmPin('')
    setConfirmError(null)
    if (confirmAction === 'profile') {
      saveBoth()
    } else {
      applyNewPin()
    }
  }

  return (
    <Page>
      <ScreenHeader title="Settings" subtitle="Your facility and account" backTo="/healthworker" />

      <div className="space-y-4">
        {/* ── Facility brand ────────────────────────────────────── */}
        <SectionCard
          eyebrow="Account"
          title="Your profile"
          action={
            profileEditing ? (
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" className="px-2.5 py-2 text-xs" onClick={cancelEditing}>
                  Cancel
                </Button>
                <Button variant="primary" icon="check" className="px-3 py-2 text-xs" onClick={requestSave} disabled={!name.trim() || !facility.trim()}>
                  Save
                </Button>
              </div>
            ) : (
              <Button variant="secondary" icon="pencil" className="px-3 py-2 text-xs" onClick={startEditing}>
                Edit
              </Button>
            )
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" hint="Shown on the roster so your morning handouts feel personal.">
              {(id) => (
                <TextInput
                  id={id}
                  value={name}
                  disabled={!profileEditing}
                  placeholder="e.g. Prerna Devi"
                  onChange={(e) => setName(e.target.value)}
                />
              )}
            </Field>
            <Field label="Organisation name">
              {(id) => (
                <TextInput
                  id={id}
                  value={facility}
                  disabled={!profileEditing}
                  onChange={(e) => setFacility(e.target.value)}
                />
              )}
            </Field>
          </div>
          {nameSaved && facilitySaved && (
            <p className="mt-2 flex items-center gap-2 text-sm text-sage-700">
              <Icon name="check" size={16} /> Saved.
            </p>
          )}

          <div className="mt-6 border-t border-line pt-4">
            <h3 className="text-sm font-semibold text-ink">Session unlock PIN</h3>
            <p className="mt-1 text-sm text-ink-soft">
              Your PIN is what brings you back to the roster from a patient's activity screen. Four digits, easy for
              you to remember.
            </p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                  onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setSaved(false) }}
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
                  onChange={(e) => { setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4)); setSaved(false) }}
                />
              )}
            </Field>
          </div>
          {pin.length === 4 && pinConfirm.length === 4 && pin !== pinConfirm && (
            <p className="mt-2 text-sm text-clay-700">The two PINs are different. Please check them.</p>
          )}
          {saved && (
            <p className="mt-2 flex items-center gap-2 text-sm text-sage-700">
              <Icon name="check" size={16} /> Your new PIN is saved.
            </p>
          )}
          <div className="mt-4">
            <Button
              variant="primary"
              icon="shield"
              onClick={() => {
                setConfirmAction('pin')
                setConfirmPin('')
                setConfirmError(null)
                setConfirming(true)
              }}
              disabled={!canSavePin}
            >
              Save PIN
            </Button>
          </div>
        </SectionCard>

        {/* ── Audio ──────────────────────────────────────────────── */}
        <SectionCard
          eyebrow="Audio"
          title="What they hear"
          action={
            voice.supported && (
              <Button variant="ghost" icon="volume" onClick={() => speakSample(speechRate)}>
                Hear it
              </Button>
            )
          }
        >
          <div className="space-y-4">
            <Toggle
              checked={voiceEnabled}
              onChange={setVoiceEnabled}
              label="Voice prompts"
              description="Jugnu reads every prompt aloud. Turn off for a quiet, text-only session."
            />
            <Field label="Speaking speed" hint="Slower is usually kindler. Tap 'Hear it' to check.">
              {(id) => (
                <div className="flex items-center gap-3">
                  <input
                    id={id}
                    type="range"
                    min={0.6}
                    max={1.1}
                    step={0.05}
                    value={speechRate}
                    onChange={(e) => setSpeechRate(Number(e.target.value))}
                    className="h-11 flex-1 accent-glow-500"
                    aria-valuetext={`${Math.round(speechRate * 100)} percent of normal speed`}
                  />
                  <Chip tone="neutral">{Math.round(speechRate * 100)}%</Chip>
                </div>
              )}
            </Field>
            {!voice.supported && (
              <PermissionNote>
                Voice is not available on this device. Sessions will run in text-only mode.
              </PermissionNote>
            )}
          </div>
        </SectionCard>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <PermissionNote>
          Centralized care for {getFacilityName()}. Priorities come from missed sessions and gentle flags — never a
          diagnosis.
        </PermissionNote>

        <div className="pb-4">
          <Button variant="secondary" icon="logout" block onClick={() => navigate('/login')}>
            Sign out
          </Button>
        </div>
      </div>

      {/* ── PIN confirmation modal ───────────────────────────────── */}
      <Modal
        open={confirming}
        onClose={cancelEditingModal}
        size="sm"
        title="Confirm with your PIN"
        description={
          confirmAction === 'profile'
            ? 'Enter your current PIN to save your profile changes.'
            : 'Enter your current PIN to save your new one.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={cancelEditingModal}>
              Cancel
            </Button>
            <Button variant="primary" icon="shield" onClick={confirm} disabled={confirmPin.length !== 4}>
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
          onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setConfirmError(null) }}
        />
        {confirmError && <p className="mt-2 text-sm text-clay-700">{confirmError}</p>}
      </Modal>
    </Page>
  )
}