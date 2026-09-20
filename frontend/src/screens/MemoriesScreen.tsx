import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, ScreenHeader } from '@/components/caregiver/Page'
import { Button, IconButton } from '@/components/ui/Button'
import { Chip, EmptyState, PermissionNote } from '@/components/ui/Bits'
import { Segmented, Toggle } from '@/components/ui/Form'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Portrait } from '@/components/ui/Portrait'
import { relativeDayLabel } from '@/lib/date'
import { patientLabel } from '@/lib/patientName'
import { voice } from '@/lib/voice'
import { useApp } from '@/state/AppContext'
import type { LanguageCode, Memory, Person } from '@/types'

/**
 * Play a memory back the way the patient would hear it: the real recording when there
 * is one, otherwise Jugnu reading the typed line aloud in her language.
 */
function playMemory(memory: Memory, language: LanguageCode, rate: number) {
  const note = memory.voiceNote
  if (!note) return
  if (note.audioUrl) {
    const audio = new Audio(note.audioUrl)
    void audio.play().catch(() => {
      if (note.transcript) voice.speak(note.transcript, { lang: language, rate })
    })
    return
  }
  if (note.transcript) voice.speak(note.transcript, { lang: language, rate })
}

interface RowProps {
  memory: Memory
  person?: Person
  authorName?: string
  onPlay: () => void
  onOpen?: () => void
  onToggle?: (next: boolean) => void
  onDelete?: () => void
  onApprove?: () => void
  onDecline?: () => void
}

function MemoryRow({ memory, person, authorName, onPlay, onOpen, onToggle, onDelete, onApprove, onDecline }: RowProps) {
  const hasVoice = Boolean(memory.voiceNote?.audioUrl || memory.voiceNote?.transcript)

  return (
    <div
      className="card p-4 transition hover:-translate-y-0.5 hover:border-glow-200 hover:shadow-card active:translate-y-0"
      onClick={onOpen}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={onOpen ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } } : undefined}
    >
      <div className="flex items-start gap-3">
        <span className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-line bg-sand">
          {memory.photoUrl || person ? (
            <Portrait photoUrl={memory.photoUrl} person={person} alt={memory.title} />
          ) : (
            <span className="grid h-full w-full place-items-center text-ink-faint">
              <Icon name="heart" size={20} />
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink">{memory.title}</p>
          {memory.description && <p className="mt-0.5 text-sm text-ink-soft">{memory.description}</p>}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
            {person && <Chip tone="dusk">{person.name}</Chip>}
            {memory.status === 'pending' && <Chip tone="lilac">Waiting for you</Chip>}
            {memory.status === 'approved' && memory.usableInActivities && <Chip tone="sage">In activities</Chip>}
            <span>{relativeDayLabel(memory.createdAt)}</span>
            {authorName && <span>· from {authorName}</span>}
          </p>
        </div>

        {hasVoice && <IconButton icon="volume" label={`Hear the voice for ${memory.title}`} size={18} onClick={onPlay} />}
        {onDelete && <IconButton icon="trash" label={`Remove ${memory.title}`} size={17} onClick={onDelete} />}
      </div>

      {(onToggle || onApprove) && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          {onApprove ? (
            <>
              <p className="text-xs text-ink-soft">Add it to their activities?</p>
              <div className="flex gap-2">
                {onDecline && (
                  <Button variant="ghost" onClick={onDecline}>
                    Not now
                  </Button>
                )}
                <Button variant="primary" icon="check" onClick={onApprove}>
                  Approve
                </Button>
              </div>
            </>
          ) : (
            onToggle && (
              <div className="w-full">
                <Toggle
                  checked={memory.usableInActivities}
                  onChange={onToggle}
                  label="Use in their activities"
                  description="Off keeps it on the shelf only."
                />
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

/**
 * The memory shelf. The primary caregiver curates it, a helper sees only the memories
 * she has been given, and a family member sees what has been approved plus their own
 * contributions still on the way.
 */
export function MemoriesScreen() {
  const { state, dispatch, api, backendAvailable, currentUser, can } = useApp()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState<Memory | null>(null)
  const [viewMemory, setViewMemory] = useState<Memory | null>(null)

  const helper = currentUser?.layer === 2
  const contributing = can.contributeOnly
  const primary = currentUser?.layer === 1
  const patientName = patientLabel(state.patient, currentUser)
  const { language, speechRate } = state.patient

  const { approved, pending } = useMemo(() => {
    const myPending = contributing ? state.memories.filter((m) => m.createdByUserId === currentUser?.id) : state.memories
    return {
      // Caregivers and helpers see every approved memory; a contributing family
      // member only sees the ones they shared themselves.
      approved: contributing
        ? state.memories.filter((m) => m.status === 'approved' && m.createdByUserId === currentUser?.id)
        : state.memories.filter((m) => m.status === 'approved'),
      // Only the approver sees other people's pending contributions.
      pending: (can.approveContributions ? state.memories : myPending).filter((m) => m.status === 'pending'),
    }
  }, [can.approveContributions, contributing, currentUser, state.memories])

  const [shelfView, setShelfView] = useState<'approved' | 'pending'>('pending')

  const person = (id?: string) => state.people.find((p) => p.id === id)
  const author = (id: string) => (id === currentUser?.id ? undefined : state.users.find((u) => u.id === id)?.name)

  return (
    <Page>
      <ScreenHeader
        title="Memories"
        subtitle={
          contributing
            ? `What the family has shared for ${patientName}`
            : `${approved.length} in the shelf · ${patientName}’s own life, in their activities`
        }
        backTo="back"
        action={
          can.createMemory ? (
            <Button variant="primary" icon="plus" onClick={() => navigate('/memories/new')}>
              Add
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-5">
        {primary && (
          <Segmented
            label="Memory shelf view"
            columns={2}
            value={shelfView}
            onChange={setShelfView}
            options={[
              { value: 'pending' as const, label: 'Waiting for approval', description: pending.length ? `${pending.length} to review` : 'Nothing waiting' },
              { value: 'approved' as const, label: 'Approved', description: `${approved.length} in the shelf` },
            ]}
          />
        )}

        {!primary && pending.length > 0 && (
          <section className="space-y-3">
            <h2 className="label-eyebrow px-1">
              {can.approveContributions ? 'Shared by the family' : 'On its way'}
            </h2>
            {pending.map((memory) => (
              <MemoryRow
                key={memory.id}
                memory={memory}
                person={person(memory.personId)}
                authorName={author(memory.createdByUserId)}
                onPlay={() => playMemory(memory, language, speechRate)}
                onOpen={() => setViewMemory(memory)}
                onApprove={
                  can.approveContributions
                    ? () => {
                        dispatch({
                          type: 'updateMemory',
                          id: memory.id,
                          patch: { status: 'approved', usableInActivities: true },
                        })
                        if (backendAvailable) api.approveMemory(memory.id)
                      }
                    : undefined
                }
                onDecline={can.approveContributions ? () => setConfirmDelete(memory) : undefined}
              />
            ))}
          </section>
        )}

        <section className="space-y-3">
          {primary && shelfView === 'pending' && (
            <>
              <h2 className="label-eyebrow px-1">
                {pending.length ? 'Shared by the family' : 'Nothing waiting for approval'}
              </h2>
              {pending.length ? (
                pending.map((memory) => (
                  <MemoryRow
                    key={memory.id}
                    memory={memory}
                    person={person(memory.personId)}
                    authorName={author(memory.createdByUserId)}
                    onPlay={() => playMemory(memory, language, speechRate)}
                    onOpen={() => setViewMemory(memory)}
                    onApprove={() => {
                      dispatch({
                        type: 'updateMemory',
                        id: memory.id,
                        patch: { status: 'approved', usableInActivities: true },
                      })
                      if (backendAvailable) api.approveMemory(memory.id)
                    }}
                    onDecline={() => setConfirmDelete(memory)}
                  />
                ))
              ) : (
                <EmptyState
                  icon="sparkle"
                  title="All caught up"
                  body="Fresh contributions from the family will show up here for you to review."
                />
              )}
            </>
          )}

          {primary && shelfView === 'approved' && (
            <>
              <h2 className="label-eyebrow px-1">In the shelf</h2>
              {approved.length ? (
                approved.map((memory) => (
                  <MemoryRow
                    key={memory.id}
                    memory={memory}
                    person={person(memory.personId)}
                    authorName={author(memory.createdByUserId)}
                    onPlay={() => playMemory(memory, language, speechRate)}
                    onOpen={() => setViewMemory(memory)}
                    onToggle={(next) => {
                      dispatch({ type: 'updateMemory', id: memory.id, patch: { usableInActivities: next } })
                      if (backendAvailable) api.updateMemory(memory.id, { usableInActivities: next })
                    }}
                    onDelete={() => setConfirmDelete(memory)}
                  />
                ))
              ) : (
                <EmptyState
                  icon="heart"
                  title="Nothing approved yet"
                  body="Once you approve a memory, it lands here and can go into their activities."
                />
              )}
            </>
          )}

          {!primary && (
            <>
              {approved.length > 0 && <h2 className="label-eyebrow px-1">In the shelf</h2>}
              {approved.length ? (
                approved.map((memory) => (
                  <MemoryRow
                    key={memory.id}
                    memory={memory}
                    person={person(memory.personId)}
                    authorName={author(memory.createdByUserId)}
                    onPlay={() => playMemory(memory, language, speechRate)}
                    onOpen={() => setViewMemory(memory)}
                    onToggle={
                      can.editAnyMemory
                        ? (next) => {
                            dispatch({ type: 'updateMemory', id: memory.id, patch: { usableInActivities: next } })
                            if (backendAvailable) api.updateMemory(memory.id, { usableInActivities: next })
                          }
                        : undefined
                    }
                    onDelete={can.editAnyMemory ? () => setConfirmDelete(memory) : undefined}
                  />
                ))
              ) : (
                <EmptyState
                  icon="heart"
                  title="No memories yet"
                  body={
                    contributing
                      ? `Share a photo or a few words and the family will add it to ${patientName}’s activities.`
                      : 'A photo, a name and a sentence is enough for Jugnu to build an activity around.'
                  }
                  action={
                    can.createMemory ? (
                      <Button variant="primary" icon="plus" onClick={() => navigate('/memories/new')}>
                        {contributing ? 'Share a memory' : 'Record a memory'}
                      </Button>
                    ) : undefined
                  }
                />
              )}
            </>
          )}
        </section>

        {helper && (
          <PermissionNote>
            You can see the memories the primary caregiver has shared with you and use them in activities. Editing and
            approving stay with them.
          </PermissionNote>
        )}

        {contributing && (
          <PermissionNote>
            Family members can share memories. What Jugnu uses with {patientName} is decided by the
            primary caregiver.
          </PermissionNote>
        )}
      </div>

      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        size="sm"
        title={confirmDelete?.status === 'pending' ? 'Not use this memory?' : 'Remove this memory?'}
        description={confirmDelete ? `“${confirmDelete.title}” will be removed from the shelf.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              icon="trash"
              onClick={() => {
                if (confirmDelete) {
                  dispatch({ type: 'deleteMemory', id: confirmDelete.id })
                  if (backendAvailable) {
                    if (confirmDelete.status === 'pending') api.declineMemory(confirmDelete.id)
                    else api.deleteMemory(confirmDelete.id)
                  }
                }
                setConfirmDelete(null)
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          Jugnu will stop using it in their activities. Past sessions stay exactly as they were.
        </p>
      </Modal>

      <Modal open={Boolean(viewMemory)} onClose={() => setViewMemory(null)} size="lg" title={viewMemory?.title ?? 'Memory'}>
        {viewMemory && person(viewMemory.personId) ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-card border border-line">
              {viewMemory.photoUrl || person(viewMemory.personId) ? (
                <Portrait photoUrl={viewMemory.photoUrl} person={person(viewMemory.personId)} alt={viewMemory.title} className="h-64 w-full" />
              ) : (
                <span className="grid h-40 w-full place-items-center text-ink-faint">
                  <Icon name="heart" size={32} />
                </span>
              )}
            </div>
            <div>
              <h2 className="font-display text-xl text-ink">{viewMemory.title}</h2>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
                {person(viewMemory.personId) && <Chip tone="dusk">{person(viewMemory.personId)?.name}</Chip>}
                {viewMemory.status === 'pending' ? <Chip tone="lilac">Waiting for approval</Chip> : viewMemory.usableInActivities ? <Chip tone="sage">In activities</Chip> : <Chip>Shelf only</Chip>}
                <span>{relativeDayLabel(viewMemory.createdAt)}</span>
                {author(viewMemory.createdByUserId) && <span>· from {author(viewMemory.createdByUserId)}</span>}
              </p>
              {viewMemory.description && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{viewMemory.description}</p>}
            </div>
            {Boolean(viewMemory.voiceNote?.audioUrl || viewMemory.voiceNote?.transcript) && (
              <Button variant="secondary" icon="volume" onClick={() => playMemory(viewMemory, language, speechRate)}>
                Hear the voice
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-sand text-ink-faint">
              <Icon name="heart" size={28} />
            </span>
            <h2 className="font-display text-xl text-ink">{viewMemory?.title}</h2>
            {viewMemory?.description && <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{viewMemory.description}</p>}
            <p className="text-xs text-ink-faint">{relativeDayLabel(viewMemory?.createdAt ?? '')}</p>
            {Boolean(viewMemory?.voiceNote?.audioUrl || viewMemory?.voiceNote?.transcript) && (
              <Button variant="secondary" icon="volume" onClick={() => viewMemory && playMemory(viewMemory, language, speechRate)}>
                Hear the voice
              </Button>
            )}
          </div>
        )}
      </Modal>
    </Page>
  )
}
