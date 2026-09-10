import { useCallback, useEffect, useState } from 'react'
import { BrandMark } from '@/components/caregiver/CaregiverHeader'
import { Icon } from '@/components/ui/Icon'
import { useApp } from '@/state/AppContext'

interface PinUnlockProps {
  /** Called with the id of whichever authorised caregiver's PIN was entered. */
  onSuccess: (userId: string) => void
  onCancel: () => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/**
 * The only door back to the caregiver side. It shows nothing about the patient, the
 * family or the session: a wrong PIN simply says so and stays here, so an accidental
 * long press exposes no information at all.
 */
export function PinUnlock({ onSuccess, onCancel }: PinUnlockProps) {
  const { state } = useApp()
  const [digits, setDigits] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(
    (value: string) => {
      const match = state.users.find((u) => u.pin === value)
      if (match) {
        onSuccess(match.id)
        return
      }
      setDigits('')
      setError('That PIN did not match. Please try again.')
    },
    [onSuccess, state.users],
  )

  const push = useCallback(
    (key: string) => {
      setError(null)
      setDigits((current) => {
        if (current.length >= 4) return current
        const next = current + key
        if (next.length === 4) window.setTimeout(() => submit(next), 160)
        return next
      })
    },
    [submit],
  )

  const back = useCallback(() => {
    setError(null)
    setDigits((current) => current.slice(0, -1))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) push(e.key)
      else if (e.key === 'Backspace') back()
      else if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [back, onCancel, push])

  return (
    <main className="patient-screen grid min-h-[100dvh] place-items-center px-5 py-10">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-7 flex flex-col items-center text-center">
          <BrandMark size={36} />
          <h1 className="mt-4 font-display text-2xl text-ink">Caregiver access</h1>
          <p className="mt-1.5 text-sm text-ink-soft">Enter your 4-digit PIN to return to Jugnu.</p>
        </div>

        <div className="mb-5 flex justify-center gap-3" role="status" aria-label={`${digits.length} of 4 digits entered`}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-4 w-4 rounded-full border-2 transition duration-200 ease-calm ${
                i < digits.length ? 'border-glow-500 bg-glow-500' : 'border-line bg-paper'
              }`}
            />
          ))}
        </div>

        <p aria-live="polite" className="mb-4 min-h-[20px] text-center text-sm text-clay-700">
          {error}
        </p>

        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((key) => (
            <button key={key} type="button" onClick={() => push(key)} className="rounded-2xl border border-line bg-paper py-4 font-display text-2xl text-ink shadow-card transition duration-200 ease-calm hover:border-glow-300 hover:bg-glow-50">
              {key}
            </button>
          ))}
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-line bg-sand/60 py-4 text-sm font-semibold text-ink-soft transition duration-200 ease-calm hover:bg-sand"
          >
            Back
          </button>
          <button type="button" onClick={() => push('0')} className="rounded-2xl border border-line bg-paper py-4 font-display text-2xl text-ink shadow-card transition duration-200 ease-calm hover:border-glow-300 hover:bg-glow-50">
            0
          </button>
          <button
            type="button"
            onClick={back}
            aria-label="Delete last digit"
            className="grid place-items-center rounded-2xl border border-line bg-sand/60 py-4 text-ink-soft transition duration-200 ease-calm hover:bg-sand"
          >
            <Icon name="back" size={20} />
          </button>
        </div>
      </div>
    </main>
  )
}
