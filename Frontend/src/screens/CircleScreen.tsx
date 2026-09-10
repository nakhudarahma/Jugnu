import { useState } from 'react'
import { Page, ScreenHeader } from '@/components/caregiver/Page'
import { Button, IconButton } from '@/components/ui/Button'
import { Chip, EmptyState, PermissionNote } from '@/components/ui/Bits'
import { Field, Segmented, TextInput } from '@/components/ui/Form'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Portrait } from '@/components/ui/Portrait'
import { SectionCard } from '@/components/ui/Card'
import { layerLabel } from '@/lib/capabilities'
import { patientLabel } from '@/lib/patientName'
import { shortDate, timeLabel } from '@/lib/date'
import { useApp } from '@/state/AppContext'
import type { LayerId } from '@/types'

interface InviteDraft {
  name: string
  contact: string
  layer: 2 | 3
}

const emptyInvite: InviteDraft = { name: '', contact: '', layer: 3 }

const layerBlurb: Record<2 | 3, string> = {
  2: 'Can run activities and tick off the reminders you assign. No trends, no settings.',
  3: 'Can share photos, voices and stories for you to approve. Nothing else.',
}

/**
 * Who else is around her. The primary caregiver decides who is in the circle and what
 * each person may do; a helper can see the circle but not change it.
 */
export function CircleScreen() {
  const { state, dispatch, currentUser, can } = useApp()
  const patientName = patientLabel(state.patient, currentUser)
  const [invite, setInvite] = useState<InviteDraft | null>(null)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)

  const helper = currentUser?.layer === 2
  const tone: Record<LayerId, 'glow' | 'sage' | 'lilac' | 'dusk'> = {
    0: 'dusk',
    1: 'glow',
    2: 'sage',
    3: 'lilac',
  }

  const inviteEmailOk = invite ? /^\S+@\S+\.\S+$/.test(invite.contact.trim()) : false

  const sendInvite = () => {
    if (!invite || !invite.name.trim() || !inviteEmailOk) return
    dispatch({ type: 'invite', name: invite.name.trim(), contact: invite.contact.trim(), layer: invite.layer })
    setInvite(null)
  }

  const assignedTo = (userId: string) => state.reminders.filter((r) => r.assignedToUserId === userId)

  return (
    <Page>
      <ScreenHeader
        title="Family circle"
        subtitle={`Everyone helping with ${patientName}, and what each person can do`}
        backTo="back"
        action={
          can.inviteFamily ? (
            <Button variant="primary" icon="plus" onClick={() => setInvite(emptyInvite)}>
              Invite
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <SectionCard eyebrow="Their people" title="In the circle now">
          <ul className="space-y-3">
            {state.users.map((user) => {
              const reminders = assignedTo(user.id)
              return (
                <li key={user.id} className="flex items-start gap-3 rounded-2xl border border-line bg-paper p-3">
                  <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-line">
                    <Portrait name={user.name} tone={user.portraitTone} compact />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                      {user.name}
                      {user.id === currentUser?.id && <Chip tone="neutral">You</Chip>}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {user.relationship} · <Chip tone={tone[user.layer]}>{layerLabel[user.layer]}</Chip>
                    </p>
                    {user.layer === 2 && (
                      <p className="mt-1.5 text-xs text-ink-faint">
                        {reminders.length
                          ? `Helping with ${reminders.map((r) => `${r.title} (${timeLabel(r.time)})`).join(', ')}`
                          : 'Nothing assigned yet.'}
                      </p>
                    )}
                    {user.layer === 3 && (
                      <p className="mt-1.5 text-xs text-ink-faint">
                        Shares memories for approval. Cannot see trends or the routine.
                      </p>
                    )}
                  </div>
                  {can.manageFamily && user.layer === 2 && (
                    <IconButton
                      icon="bell"
                      label={`Choose what ${user.name} helps with`}
                      size={17}
                      onClick={() => setAssigning(user.id)}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </SectionCard>

        <SectionCard eyebrow="Invitations" title="Waiting to join">
          {state.invites.length ? (
            <ul className="space-y-2">
              {state.invites.map((row) => (
                <li key={row.id} className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sand text-ink-soft">
                    <Icon name="send" size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{row.name}</p>
                    <p className="truncate text-xs text-ink-soft">
                      {row.contact} · invited {shortDate(row.sentAt)}
                    </p>
                  </div>
                  <Chip tone={row.layer === 2 ? 'sage' : 'lilac'}>{layerLabel[row.layer]}</Chip>
                  {can.manageFamily && (
                    <IconButton icon="close" label={`Cancel the invitation to ${row.name}`} size={17} onClick={() => setRevoking(row.id)} />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon="users"
              title="Nobody waiting"
              body="Invite a relative and they get a gentle, contribute-only Jugnu of their own."
              action={
                can.inviteFamily ? (
                  <Button variant="primary" icon="plus" onClick={() => setInvite(emptyInvite)}>
                    Invite someone
                  </Button>
                ) : undefined
              }
            />
          )}
        </SectionCard>

        {helper && (
          <PermissionNote>
            You can see who else is helping. Inviting people and changing what they can do stays with the primary
            caregiver.
          </PermissionNote>
        )}

        <p className="px-1 text-xs leading-relaxed text-ink-faint">
          Nobody in the circle can see {patientName}’s activity screens while they are using Jugnu, and only
          the primary caregiver can change their profile, language or personalization.
        </p>
      </div>

      <Modal
        open={Boolean(invite)}
        onClose={() => setInvite(null)}
        title="Invite someone"
        description="Jugnu sends a gentle invitation. Nothing is shared until they accept."
        footer={
          <>
            <Button variant="ghost" onClick={() => setInvite(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon="send"
              onClick={sendInvite}
              disabled={!invite?.name.trim() || !inviteEmailOk}
            >
              Send invitation
            </Button>
          </>
        }
      >
        {invite && (
          <div className="space-y-4">
            <Field label="Their name" required>
              {(id) => (
                <TextInput id={id} value={invite.name} placeholder="Nita" onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
              )}
            </Field>
            <Field label="Email address" required hint="Invitations are sent by email only.">
              {(id) => (
                <TextInput
                  id={id}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={invite.contact}
                  placeholder="nita@example.com"
                  onChange={(e) => setInvite({ ...invite, contact: e.target.value })}
                />
              )}
            </Field>
            <Field label="What can they do?">
              {() => (
                <Segmented
                  label="What can they do?"
                  value={invite.layer}
                  onChange={(layer) => setInvite({ ...invite, layer })}
                  options={[
                    { value: 3 as const, label: layerLabel[3], description: layerBlurb[3] },
                    { value: 2 as const, label: layerLabel[2], description: layerBlurb[2] },
                  ]}
                />
              )}
            </Field>
            <PermissionNote>
              This demo keeps everything on this device, so invitations simply appear in the waiting list.
            </PermissionNote>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(assigning)}
        onClose={() => setAssigning(null)}
        title={`What does ${state.users.find((u) => u.id === assigning)?.name ?? 'she'} help with?`}
        description="Only these reminders appear on their dashboard, and only these can they tick off."
        footer={
          <Button variant="primary" icon="check" onClick={() => setAssigning(null)}>
            Done
          </Button>
        }
      >
        <ul className="space-y-2">
          {state.reminders.map((reminder) => {
            const mine = reminder.assignedToUserId === assigning
            const otherName = state.users.find(
              (u) => u.id === reminder.assignedToUserId && u.id !== assigning,
            )?.name
            return (
              <li key={reminder.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={mine}
                  onClick={() =>
                    dispatch({
                      type: 'updateReminder',
                      id: reminder.id,
                      patch: { assignedToUserId: mine ? undefined : assigning ?? undefined },
                    })
                  }
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition duration-200 ease-calm ${
                    mine ? 'border-sage-500 bg-sage-100/50' : 'border-line bg-paper hover:border-glow-200'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${
                      mine ? 'border-sage-500 bg-sage-500 text-white' : 'border-line text-transparent'
                    }`}
                  >
                    <Icon name="check" size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{reminder.title}</span>
                    <span className="block text-xs text-ink-soft">
                      {timeLabel(reminder.time)}
                      {otherName ? ` · currently ${otherName}’s` : ''}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </Modal>

      <Modal
        open={Boolean(revoking)}
        onClose={() => setRevoking(null)}
        size="sm"
        title="Cancel this invitation?"
        description={`${state.invites.find((i) => i.id === revoking)?.name ?? 'They'} will not be able to join.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRevoking(null)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              icon="close"
              onClick={() => {
                if (revoking) dispatch({ type: 'revokeInvite', id: revoking })
                setRevoking(null)
              }}
            >
              Cancel invitation
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">You can invite them again whenever you like.</p>
      </Modal>
    </Page>
  )
}
