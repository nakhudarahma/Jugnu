import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Page, ScreenHeader } from '@/components/caregiver/Page'
import { Button } from '@/components/ui/Button'
import { Chip, PermissionNote } from '@/components/ui/Bits'
import { Field, Select, TextArea, TextInput, Toggle } from '@/components/ui/Form'
import { Icon } from '@/components/ui/Icon'
import { Portrait } from '@/components/ui/Portrait'
import { relationshipNames } from '@/lib/lexicon'
import { uid } from '@/lib/id'
import { today } from '@/lib/date'
import { patientLabel } from '@/lib/patientName'
import { useApp } from '@/state/AppContext'
import type { VoiceNote } from '@/types'

interface RecorderState {
  recording: boolean
  seconds: number
  audioUrl?: string
  error: string | null
}

/**
 * Real microphone capture when the browser allows it. When it does not — locked-down
 * device, no permission, no MediaRecorder — the caregiver types what was said instead
 * and Jugnu speaks it in the patient's own language. Nothing is ever a dead end.
 */
function useRecorder() {
  const [s, setS] = useState<RecorderState>({ recording: false, seconds: 0, error: null })
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const ticker = useRef<number | null>(null)

  const stop = useCallback(() => {
    recorder.current?.stop()
    recorder.current?.stream.getTracks().forEach((t) => t.stop())
    recorder.current = null
    if (ticker.current !== null) window.clearInterval(ticker.current)
    ticker.current = null
    setS((prev) => ({ ...prev, recording: false }))
  }, [])

  useEffect(() => () => stop(), [stop])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setS((prev) => ({ ...prev, error: 'Recording is not available on this device — you can type the message instead.' }))
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunks.current = []
      mr.ondataavailable = (e) => chunks.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' })
        setS((prev) => ({ ...prev, audioUrl: URL.createObjectURL(blob) }))
      }
      mr.start()
      recorder.current = mr
      setS({ recording: true, seconds: 0, error: null })
      ticker.current = window.setInterval(() => setS((prev) => ({ ...prev, seconds: prev.seconds + 1 })), 1000)
    } catch {
      setS((prev) => ({ ...prev, error: 'Jugnu could not reach the microphone — you can type the message instead.' }))
    }
  }, [])

  const reset = useCallback(() => setS({ recording: false, seconds: 0, error: null }), [])

  return { ...s, start, stop, reset }
}

const NEW_PERSON = '__new__'

/**
 * One recorder for everyone. A primary caregiver's memory is ready to use straight
 * away; a family member's arrives as a contribution waiting for her approval.
 */
export function MemoryComposerScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const gameParam = searchParams.get('game')
  const { state, dispatch, currentUser, can } = useApp()
  const rec = useRecorder()

  const family = state.people.filter((p) => !p.isPatient)
  const contributing = can.contributeOnly
  const patientName = patientLabel(state.patient, currentUser)
  const backTo = contributing ? '/family' : '/'

  // Match current user with an existing person in the family list
  const matchedPerson = family.find((p) => p.name.toLowerCase() === currentUser?.name.toLowerCase())

  const defaultTitle =
    gameParam === 'whos_calling'
      ? `Who's Calling: Voice clip from ${currentUser?.name ?? 'Family'}`
      : gameParam === 'remember_when'
        ? `Remember When: Story from ${currentUser?.name ?? 'Family'}`
        : ''

  const defaultDesc =
    gameParam === 'whos_calling'
      ? `Voice greeting for ${patientName}’s audio recognition game.`
      : gameParam === 'remember_when'
        ? `Warm memory prompt for ${patientName}’s reminiscence activities.`
        : ''

  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState(defaultDesc)
  const [personId, setPersonId] = useState(matchedPerson?.id ?? '')
  const [newName, setNewName] = useState('')
  const [newRelationship, setNewRelationship] = useState('daughter')
  const [photoUrl, setPhotoUrl] = useState<string>()
  const [transcript, setTranscript] = useState('')
  const [useInActivities, setUseInActivities] = useState(true)
  const [saved, setSaved] = useState(false)

  const onPhoto = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPhotoUrl(String(reader.result))
    reader.readAsDataURL(file)
  }

  const canSave = title.trim().length > 1 && (personId !== NEW_PERSON || newName.trim().length > 0)

  const save = () => {
    if (!canSave || !currentUser) return
    let linkedPersonId = personId === NEW_PERSON ? undefined : personId || undefined

    if (personId === NEW_PERSON) {
      // Generate the id here so the memory and the new person are linked in one go.
      linkedPersonId = uid('p')
      dispatch({
        type: 'addPerson',
        person: { id: linkedPersonId, name: newName.trim(), relationship: newRelationship, portraitTone: 'dusk', photoUrl },
      })
    }

    const voiceNote: VoiceNote | undefined =
      rec.audioUrl || transcript.trim()
        ? {
            id: uid('v'),
            audioUrl: rec.audioUrl,
            transcript: transcript.trim() || undefined,
            seconds: rec.seconds,
            recordedBy: currentUser.id,
            recordedAt: today(),
          }
        : undefined

    dispatch({
      type: 'addMemory',
      memory: {
        title: title.trim(),
        description: description.trim(),
        personId: linkedPersonId,
        photoUrl,
        voiceNote,
        createdByUserId: currentUser.id,
        status: can.approveContributions ? 'approved' : 'pending',
        usableInActivities: can.approveContributions ? useInActivities : false,
      },
    })
    setSaved(true)
  }

  if (saved) {
    return (
      <Page>
        <ScreenHeader title="Saved" backTo={backTo} />
        <div className="card card-pad flex flex-col items-center gap-4 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-sage-100 text-sage-700">
            <Icon name="check" size={26} />
          </span>
          <div>
            <h2 className="font-display text-xl text-ink">
              {contributing ? 'Thank you — it is on its way' : 'Memory saved'}
            </h2>
            <p className="mt-1.5 text-sm text-ink-soft">
              {contributing
                ? `${state.users.find((u) => u.layer === 1)?.name ?? 'The primary caregiver'} will see it and can add it to ${patientName}’s activities.`
                : useInActivities
                  ? `Jugnu can use this in ${patientName}’s activities from the next session.`
                  : 'Kept in the memory shelf. You can switch it on for activities any time.'}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="primary" onClick={() => navigate(backTo)}>
              Done
            </Button>
            <Button
              variant="secondary"
              icon="plus"
              onClick={() => {
                setSaved(false)
                setTitle('')
                setDescription('')
                setPersonId('')
                setPhotoUrl(undefined)
                setTranscript('')
                rec.reset()
              }}
            >
              Add another
            </Button>
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <ScreenHeader
        title={contributing ? 'Share a memory' : 'Record a memory'}
        subtitle={
          contributing
            ? `Something for ${patientName}. It goes to the family for approval first.`
            : `Photos, voices and small stories Jugnu can use with ${patientName}.`
        }
        backTo={backTo}
      />

      <div className="space-y-4">
        {gameParam === 'whos_calling' && (
          <div className="rounded-card border border-glow-300 bg-glow-50/90 p-4 shadow-card">
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-glow-200 text-glow-800">
                <Icon name="volume" size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base text-ink">Recording for “Who’s Calling?” Game</h3>
                <p className="mt-1 text-xs text-ink-soft leading-relaxed">
                  Record a short, cheerful voice greeting (5–10 seconds) saying who you are and where you are calling from. For example: <em>“Hello {patientName}, it’s {currentUser?.name ?? 'your son'}! Just calling to say I love you.”</em>
                </p>
                <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-glow-900">
                  <Icon name="shield" size={13} className="text-glow-700 shrink-0" />
                  <span>Caregiver Gate: {state.users.find((u) => u.layer === 1)?.name ?? 'Meena'} will listen and approve this clip before it plays in {patientName}’s games.</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {gameParam === 'remember_when' && (
          <div className="rounded-card border border-sage-300 bg-sage-50/90 p-4 shadow-card">
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sage-200 text-sage-800">
                <Icon name="heart" size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base text-ink">Recording for “Remember When” Game</h3>
                <p className="mt-1 text-xs text-ink-soft leading-relaxed">
                  Share a fond memory or story (e.g., <em>“Remember our family trip to the tea gardens when you wore your blue shawl?”</em>). It helps spark gentle, positive reminiscence during her activities.
                </p>
                <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-sage-900">
                  <Icon name="shield" size={13} className="text-sage-700 shrink-0" />
                  <span>Caregiver Gate: {state.users.find((u) => u.layer === 1)?.name ?? 'Meena'} will review and approve this memory before it is used in {patientName}’s sessions.</span>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="card card-pad space-y-4">
          <Field label="What is this memory?" required>
            {(id) => (
              <TextInput
                id={id}
                value={title}
                placeholder="Planting tulsi on the veranda"
                onChange={(e) => setTitle(e.target.value)}
              />
            )}
          </Field>

          <Field label="Who is it about?" hint="Used for the family recognition activities.">
            {(id) => (
              <Select id={id} value={personId} onChange={(e) => setPersonId(e.target.value)}>
                <option value="">Nobody in particular</option>
                {family.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} — {person.relationship}
                  </option>
                ))}
                <option value={NEW_PERSON}>Someone new…</option>
              </Select>
            )}
          </Field>

          {personId === NEW_PERSON && (
            <div className="grid gap-4 rounded-2xl bg-sand/60 p-3 sm:grid-cols-2">
              <Field label="Their name" required>
                {(id) => <TextInput id={id} value={newName} placeholder="Nita" onChange={(e) => setNewName(e.target.value)} />}
              </Field>
              <Field label="Relationship to the patient">
                {(id) => (
                  <Select id={id} value={newRelationship} onChange={(e) => setNewRelationship(e.target.value)}>
                    {Object.keys(relationshipNames).map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          )}

          <Field label="The story" hint="A sentence or two, in your own words.">
            {(id) => (
              <TextArea
                id={id}
                value={description}
                placeholder="A short, warm line — e.g. “Maa and Meena planted tulsi in the blue pot after the first rain.”"
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </Field>
        </div>

        <div className="card card-pad space-y-4">
          <div>
            <p className="label-eyebrow">A picture</p>
            <p className="mt-1 text-xs text-ink-faint">
              A real photo helps most. It stays on this device — Jugnu never uploads it anywhere.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <span className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-line bg-sand">
              {photoUrl ? (
                <Portrait photoUrl={photoUrl} alt="The photo you chose" />
              ) : (
                <span className="grid h-full w-full place-items-center text-ink-faint">
                  <Icon name="image" size={24} />
                </span>
              )}
            </span>
            <div className="flex flex-wrap gap-2">
              <label className="btn-secondary cursor-pointer">
                <Icon name="image" size={18} />
                {photoUrl ? 'Change photo' : 'Choose a photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => onPhoto(e.target.files?.[0])}
                />
              </label>
              {photoUrl && (
                <Button variant="ghost" icon="trash" onClick={() => setPhotoUrl(undefined)}>
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="card card-pad space-y-4">
          <div>
            <p className="label-eyebrow">A familiar voice</p>
            <p className="mt-1 text-xs text-ink-faint">
              Say a short line like “Maa, do you remember the tulsi?” Jugnu plays it in their activities.
            </p>
          </div>

          {rec.audioUrl ? (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-sage-100/60 p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage-500 text-white">
                <Icon name="check" size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Recording ready</p>
                <p className="text-xs text-ink-soft">{rec.seconds}s in your own voice</p>
              </div>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption -- the transcript field below is the caption */}
              <audio controls src={rec.audioUrl} className="h-9 w-full max-w-[220px]" />
              <Button variant="ghost" icon="trash" onClick={rec.reset}>
                Record again
              </Button>
            </div>
          ) : rec.recording ? (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-clay-100/70 p-3">
              <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-clay-500 text-white">
                <span className="absolute inset-0 animate-ping rounded-full bg-clay-500/40" aria-hidden="true" />
                <Icon name="mic" size={20} />
              </span>
              <p className="min-w-0 flex-1 text-sm font-semibold text-ink" role="status">
                Listening… {rec.seconds}s
              </p>
              <Button variant="primary" icon="check" onClick={rec.stop}>
                Done
              </Button>
            </div>
          ) : (
            <Button variant="secondary" icon="mic" onClick={rec.start}>
              Record your voice
            </Button>
          )}

          {rec.error && <PermissionNote>{rec.error}</PermissionNote>}

          <Field
            label="Or type what you would say"
            hint="Jugnu reads it aloud in their language, so this works even without a microphone."
          >
            {(id) => (
              <TextArea
                id={id}
                value={transcript}
                placeholder="Maa, do you remember planting the tulsi with me?"
                onChange={(e) => setTranscript(e.target.value)}
              />
            )}
          </Field>
        </div>

        <div className="card card-pad space-y-4">
          {can.approveContributions ? (
            <Toggle
              checked={useInActivities}
              onChange={setUseInActivities}
              label="Use this in their activities"
              description="Switch it off to keep the memory in the shelf without Jugnu using it yet."
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Chip tone="lilac">Waiting for approval</Chip>
              </div>
              <PermissionNote>
                Family contributions are reviewed by the primary caregiver before Jugnu uses them with{' '}
                {patientName}.
              </PermissionNote>
            </div>
          )}

          <Button variant="primary" icon="check" block onClick={save} disabled={!canSave}>
            {contributing ? 'Send to the family' : 'Save this memory'}
          </Button>
          {!canSave && (
            <p className="text-center text-xs text-ink-faint">
              {personId === NEW_PERSON && !newName.trim()
                ? 'Add their name to finish.'
                : 'Give the memory a short name to finish.'}
            </p>
          )}
        </div>
      </div>
    </Page>
  )
}
