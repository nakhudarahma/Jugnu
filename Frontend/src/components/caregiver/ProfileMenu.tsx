import { Modal } from '@/components/ui/Modal'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Portrait } from '@/components/ui/Portrait'
import { PermissionNote } from '@/components/ui/Bits'
import { layerLabel, type Capabilities } from '@/lib/capabilities'
import type { AppUser, PatientProfile } from '@/types'
import { languageLabel } from '@/lib/i18n'

export type SettingsSection = 'patient' | 'language' | 'personalization' | 'family' | 'account' | 'memories'

interface ProfileMenuProps {
  open: boolean
  onClose: () => void
  user: AppUser
  /** Everyone who shares this device, for the "viewing as" switch. */
  users: AppUser[]
  patient: PatientProfile
  can: Capabilities
  onOpenSection: (section: SettingsSection) => void
  onSwitchUser: (userId: string) => void
  onSignOut: () => void
}

/** Everything account-shaped lives here, off the dashboard, behind the small avatar. */
export function ProfileMenu({ open, onClose, user, users, patient, can, onOpenSection, onSwitchUser, onSignOut }: ProfileMenuProps) {
  const items: { section: SettingsSection; icon: IconName; label: string; value: string; allowed: boolean }[] = [
    {
      section: 'patient',
      icon: 'user',
      label: 'Patient profile',
      value: `${patient.name} · ${patient.age} · ${patient.region}`,
      allowed: can.editPatientProfile,
    },
    { section: 'language', icon: 'sparkle', label: 'Language', value: languageLabel[patient.language], allowed: can.editPersonalization },
    {
      section: 'personalization',
      icon: 'image',
      label: 'Personalization',
      value: patient.personalizationLevel === 2 ? 'Level 2 — Personalized' : 'Level 1 — Generic',
      allowed: can.editPersonalization,
    },
    { section: 'family', icon: 'users', label: 'Linked family members', value: 'Caregivers, helpers, family', allowed: can.manageFamily },
    { section: 'memories', icon: 'image', label: 'Memory shelf', value: 'Photos, voices and stories', allowed: can.viewMemories },
    { section: 'account', icon: 'shield', label: 'Account & security', value: 'PIN, account information', allowed: can.editSecurity },
  ]

  return (
    <Modal open={open} onClose={onClose} title="Account & Settings" size="md">
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-sand/70 p-3">
        <span className="h-11 w-11 overflow-hidden rounded-full border border-line">
          <Portrait name={user.name} tone={user.portraitTone} compact />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
          <p className="text-xs text-ink-soft">
            {user.relationship} · {layerLabel[user.layer]}
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.section}>
            <button
              type="button"
              disabled={!item.allowed}
              onClick={() => {
                onClose()
                onOpenSection(item.section)
              }}
              className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition duration-200 ease-calm ${
                item.allowed ? 'border-line bg-paper hover:border-glow-200 hover:bg-glow-50' : 'cursor-not-allowed border-line/70 bg-sand/40 opacity-70'
              }`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sand text-ink-soft">
                <Icon name={item.allowed ? item.icon : 'lock'} size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{item.label}</span>
                <span className="block truncate text-xs text-ink-soft">
                  {item.allowed ? item.value : 'Managed by the primary caregiver'}
                </span>
              </span>
              <Icon name="chevronRight" size={16} className="text-ink-faint" />
            </button>
          </li>
        ))}
      </ul>

      {user.layer === 2 && (
        <div className="mt-4">
          <PermissionNote>
            As a trusted helper you can run activities and keep the routine going. Account-level changes stay with the
            primary caregiver.
          </PermissionNote>
        </div>
      )}

      {/*
        Jugnu has no sign-in: the device belongs to the family. This switch simply
        changes whose view of Jugnu you are looking at, which is also how the demo
        moves between the primary caregiver, the helper and a family member.
      */}
      <div className="mt-5">
        <p className="label-eyebrow mb-2">Viewing Jugnu as</p>
        <div className="grid gap-2">
          {users.map((other) => {
            const active = other.id === user.id
            return (
              <button
                key={other.id}
                type="button"
                onClick={() => {
                  onClose()
                  if (!active) onSwitchUser(other.id)
                }}
                aria-current={active}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition duration-200 ease-calm ${
                  active ? 'border-glow-300 bg-glow-50' : 'border-line bg-paper hover:border-glow-200'
                }`}
              >
                <span className="h-8 w-8 overflow-hidden rounded-full border border-line">
                  <Portrait name={other.name} tone={other.portraitTone} compact />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{other.name}</span>
                  <span className="block truncate text-xs text-ink-soft">
                    {other.relationship} · {layerLabel[other.layer]}
                  </span>
                </span>
                {active && <Icon name="check" size={16} className="text-glow-600" />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <button
          type="button"
          onClick={() => {
            onClose()
            onSignOut()
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-paper px-4 py-3 text-sm font-semibold text-ink-soft transition duration-200 ease-calm hover:border-clay-300 hover:bg-clay-50 hover:text-clay-700"
        >
          <Icon name="logout" size={17} />
          Sign out
        </button>
      </div>
    </Modal>
  )
}
