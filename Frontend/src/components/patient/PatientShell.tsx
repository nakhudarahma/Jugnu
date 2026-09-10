import { useEffect, type ReactNode } from 'react'
import { HiddenCorner } from './HiddenCorner'

interface PatientShellProps {
  children: ReactNode
  onCaregiverAccess: () => void
  /** Announced to screen readers; the patient never sees a title bar. */
  label: string
}

/**
 * The locked patient container: no header, no navigation, no settings, no exit
 * control. The only visible affordance is the activity itself. Browser "back" is
 * absorbed here too, because on a shared tablet a stray gesture must not drop the
 * patient into the caregiver console.
 */
export function PatientShell({ children, onCaregiverAccess, label }: PatientShellProps) {
  useEffect(() => {
    window.history.pushState({ jugnuLock: true }, '')
    const onPop = () => {
      window.history.pushState({ jugnuLock: true }, '')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <main className="patient-screen no-tap-select" aria-label={label}>
      {/*
        Keyboard and screen-reader users cannot hold an invisible corner, so the same
        door exists as a control that only appears when it is deliberately focused.
      */}
      <button type="button" onClick={onCaregiverAccess} className="sr-only-focusable">
        Caregiver access
      </button>
      <HiddenCorner onUnlock={onCaregiverAccess} />
      {children}
    </main>
  )
}
