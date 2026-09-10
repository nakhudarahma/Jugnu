import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Page, ScreenHeader } from '@/components/caregiver/Page'
import { Button, IconButton } from '@/components/ui/Button'
import { Chip, EmptyState, PermissionNote } from '@/components/ui/Bits'
import { Field, Segmented, Select, TextArea, TextInput } from '@/components/ui/Form'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { timeLabel } from '@/lib/date'
import type { Reminder, ReminderRepeat } from '@/types'
import { useApp } from '@/state/AppContext'

const repeatLabel: Record<ReminderRepeat, string> = {
  daily: 'Every day',
  weekdays: 'Weekdays',
  weekly: 'Once a week',
  once: 'Just once',
}

interface Draft {
  id?: string
  title: string
  time: string
  repeat: ReminderRepeat
  priority: Reminder['priority']
  note: string
  assignedToUserId: string
}

const emptyDraft: Draft = { title: '', time: '09:00', repeat: 'daily', priority: 'normal', note: '', assignedToUserId: '' }

/**
 * The routine, in one list. A trusted helper sees only what she has been asked to do
 * and can tick it off; adding, editing and removing stay with the primary caregiver.
 */
export function RemindersScreen() {
  const { state, dispatch, currentUser, can } = useApp()
  const [params] = useSearchParams()
  const [draft, setDraft] = useState<Draft | null>(params.get('new') ? emptyDraft : null)
  const [confirmDelete, setConfirmDelete] = useState<Reminder | null>(null)

  const helper = currentUser?.layer === 2
  const helpers = state.users.filter((u) => u.layer === 2)

  const visible = useMemo(() => {
    const rows = helper ? state.reminders.filter((r) => r.assignedToUserId === currentUser?.id) : state.reminders
    return [...rows].sort((a, b) => a.time.localeCompare(b.time))
  }, [currentUser, helper, state.reminders])

  const done = visible.filter((r) => r.completed).length

  const save = () => {
    if (!draft || !draft.title.trim()) return
    const payload = {
      title: draft.title.trim(),
      time: draft.time,
      repeat: draft.repeat,
      priority: draft.priority,
      note: draft.note.trim() || undefined,
      assignedToUserId: draft.assignedToUserId || undefined,
    }
    if (draft.id) dispatch({ type: 'updateReminder', id: draft.id, patch: payload })
    else dispatch({ type: 'addReminder', reminder: payload })
    setDraft(null)
  }

  return (
    <Page>
      <ScreenHeader
        title="Reminders"
        subtitle={`${done} of ${visible.length} completed today`}
        action={
          can.manageAllReminders ? (
            <Button variant="primary" icon="plus" onClick={() => setDraft(emptyDraft)}>
              Add
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-3">
        {visible.length ? (
          visible.map((reminder) => {
            const assignee = state.users.find((u) => u.id === reminder.assignedToUserId)
            return (
              <div key={reminder.id} className="card flex items-start gap-3 p-4">
                <button
                  type="button"
                  role="switch"
                  aria-checked={reminder.completed}
                  aria-label={`Mark ${reminder.title} as ${reminder.completed ? 'not done' : 'done'}`}
                  onClick={() => dispatch({ type: 'toggleReminder', id: reminder.id })}
                  className={`mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 transition duration-200 ease-calm ${
                    reminder.completed ? 'border-sage-500 bg-sage-500 text-white' : 'border-line bg-paper text-transparent hover:border-glow-400'
                  }`}
                >
                  <Icon name="check" size={20} />
                </button>

                <div className="min-w-0 flex-1">
                  <p className={`text-[15px] font-semibold ${reminder.completed ? 'text-ink-faint line-through' : 'text-ink'}`}>
                    {reminder.title}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="clock" size={13} />
                      {timeLabel(reminder.time)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{repeatLabel[reminder.repeat]}</span>
                    {assignee && <Chip tone="dusk">{assignee.name}</Chip>}
                    {reminder.priority === 'important' && <Chip tone="glow">Important</Chip>}
                  </p>
                  {reminder.note && <p className="mt-1.5 text-xs text-ink-faint">{reminder.note}</p>}
                </div>

                {can.manageAllReminders && (
                  <div className="flex shrink-0 items-center">
                    <IconButton
                      icon="pencil"
                      label={`Edit ${reminder.title}`}
                      size={17}
                      onClick={() =>
                        setDraft({
                          id: reminder.id,
                          title: reminder.title,
                          time: reminder.time,
                          repeat: reminder.repeat,
                          priority: reminder.priority,
                          note: reminder.note ?? '',
                          assignedToUserId: reminder.assignedToUserId ?? '',
                        })
                      }
                    />
                    <IconButton icon="trash" label={`Remove ${reminder.title}`} size={17} onClick={() => setConfirmDelete(reminder)} />
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <EmptyState
            icon="bell"
            title={helper ? 'Nothing assigned to you today' : 'No reminders yet'}
            body={helper ? 'The primary caregiver will add anything they need help with.' : 'Add medicines, water, walks — whatever shapes the day.'}
            action={can.manageAllReminders ? <Button variant="primary" icon="plus" onClick={() => setDraft(emptyDraft)}>Add a reminder</Button> : undefined}
          />
        )}

        {helper && <PermissionNote>You can tick off the reminders assigned to you. Changing the routine stays with the primary caregiver.</PermissionNote>}
      </div>

      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Edit reminder' : 'New reminder'}
        description="Reminders shape their day. Keep the wording simple and familiar."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button variant="primary" icon="check" onClick={save} disabled={!draft?.title.trim()}>
              {draft?.id ? 'Save changes' : 'Add reminder'}
            </Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <Field label="What is it?" required>
              {(id) => (
                <TextInput
                  id={id}
                  value={draft.title}
                  placeholder="Morning medicine"
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Time">
                {(id) => <TextInput id={id} type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />}
              </Field>
              <Field label="Repeat">
                {(id) => (
                  <Select id={id} value={draft.repeat} onChange={(e) => setDraft({ ...draft, repeat: e.target.value as ReminderRepeat })}>
                    {(Object.keys(repeatLabel) as ReminderRepeat[]).map((key) => (
                      <option key={key} value={key}>
                        {repeatLabel[key]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <Field label="Priority">
              {() => (
                <Segmented
                  label="Priority"
                  columns={2}
                  value={draft.priority}
                  onChange={(priority) => setDraft({ ...draft, priority })}
                  options={[
                    { value: 'normal', label: 'Normal', description: 'Part of the usual routine' },
                    { value: 'important', label: 'Important', description: 'Medicines and appointments' },
                  ]}
                />
              )}
            </Field>

            {helpers.length > 0 && (
              <Field label="Ask someone to help" hint="Assigned reminders appear on that helper's dashboard.">
                {(id) => (
                  <Select id={id} value={draft.assignedToUserId} onChange={(e) => setDraft({ ...draft, assignedToUserId: e.target.value })}>
                    <option value="">Nobody in particular</option>
                    {helpers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {u.relationship}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}

            <Field label="Note" hint="Optional. Something the helper should know.">
              {(id) => (
                <TextArea id={id} value={draft.note} placeholder="One white tablet after breakfast" onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
              )}
            </Field>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        size="sm"
        title="Remove this reminder?"
        description={confirmDelete ? `“${confirmDelete.title}” will no longer appear in the routine.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              icon="trash"
              onClick={() => {
                if (confirmDelete) dispatch({ type: 'deleteReminder', id: confirmDelete.id })
                setConfirmDelete(null)
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">Nothing else changes — past sessions and trends stay as they are.</p>
      </Modal>
    </Page>
  )
}
