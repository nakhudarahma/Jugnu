import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActivityView } from '@/components/patient/ActivityView'
import { HandoffScreen } from '@/components/patient/HandoffScreen'
import { PatientShell } from '@/components/patient/PatientShell'
import { PinUnlock } from '@/components/patient/PinUnlock'
import { SessionCompletion } from '@/components/patient/SessionCompletion'
import { voice } from '@/lib/voice'
import { patientLabel } from '@/lib/patientName'
import { today } from '@/lib/date'
import { useApp, usePatient } from '@/state/AppContext'
import { useSessionEngine } from '@/session/useSessionEngine'

/**
 * The patient's whole world: handoff, activities, completion — and, hidden inside it,
 * the caregiver's way back. Nothing here navigates on its own.
 */
export function SessionScreen() {
  const navigate = useNavigate()
  const { state, dispatch, currentUser } = useApp()
  const patient = usePatient()
  const patientName = patientLabel(patient, currentUser)
  const engine = useSessionEngine()
  const [askingPin, setAskingPin] = useState(false)

  const openPin = useCallback(() => {
    voice.cancel()
    setAskingPin(true)
  }, [])

  const onUnlocked = useCallback(
    (userId: string) => {
      engine.close()
      const user = state.users.find((u) => u.id === userId)
      dispatch({ type: 'signIn', userId })
      // The check-in belongs to the moment a caregiver is really back with the device,
      // and only once per day — not after every single game.
      const checkedInToday = user ? state.moods.some((m) => m.userId === user.id && m.date === today()) : false
      if (user && user.layer !== 3 && !checkedInToday) dispatch({ type: 'requestMoodCheckIn' })
      navigate(user?.layer === 3 ? '/family' : '/', { replace: true })
    },
    [dispatch, engine, navigate, state.users],
  )

  const closePin = useCallback(() => {
    setAskingPin(false)
    engine.repeatPrompt()
  }, [engine])

  if (askingPin) return <PinUnlock onSuccess={onUnlocked} onCancel={closePin} />

  if (engine.phase === 'handoff') return <HandoffScreen />

  return (
    <PatientShell onCaregiverAccess={openPin} label={`Activity for ${patientName}`}>
      {engine.phase === 'complete' ? <SessionCompletion /> : <ActivityView engine={engine} />}
    </PatientShell>
  )
}
