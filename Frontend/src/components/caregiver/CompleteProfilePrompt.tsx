import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'

interface CompleteProfilePromptProps {
  /** localStorage key that mutes the prompt once shown. */
  storageKey: string
  description: string
  onGoToSettings: () => void
}

/**
 * One-time "finish your profile" nudge shown right after the very first sign-in of a
 * mode. Dismissed (or acted on) once, it never comes back on that device.
 */
export function CompleteProfilePrompt({ storageKey, description, onGoToSettings }: CompleteProfilePromptProps) {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(storageKey) !== '1'
    } catch {
      return true
    }
  })

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey, '1')
    } catch {
      /* storage unavailable — the prompt simply returns next time too */
    }
    setOpen(false)
  }

  return (
    <Modal
      open={open}
      onClose={dismiss}
      size="sm"
      title="Complete your profile"
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={dismiss}>
            Later
          </Button>
          <Button variant="primary" icon="chevronRight" onClick={() => { dismiss(); onGoToSettings() }}>
            Go to settings
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-sand/50 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-glow-50 text-glow-700">
          <Icon name="user" size={18} />
        </span>
        <p className="text-sm leading-relaxed text-ink-soft">
          A few details in Settings make Jugnu feel less generic — your name, how you'd like to be
          addressed, and the facility. You can skip this and finish it any time.
        </p>
      </div>
    </Modal>
  )
}