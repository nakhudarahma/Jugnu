import { useLongPress } from '@/hooks/useLongPress'

/**
 * The caregiver's way back in. There is deliberately no icon, no label and no hint:
 * a three-second press on this unmarked corner is the only route out of the patient
 * session, so nothing on screen invites the patient to leave.
 */
export function HiddenCorner({ onUnlock }: { onUnlock: () => void }) {
  const press = useLongPress(onUnlock, 3000)

  return (
    <span
      {...press.handlers}
      data-jugnu-corner="true"
      className="fixed right-0 top-0 z-40 h-20 w-20 cursor-default no-tap-select"
      style={{ WebkitTapHighlightColor: 'transparent' }}
      aria-hidden="true"
    />
  )
}
