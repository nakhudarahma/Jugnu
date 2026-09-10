import { usePersonalization } from '@/state/personalization'

/**
 * The last thing the patient sees, and it stays. No timer, no "next", no exit: if she
 * looks up an hour later the screen still says she did well, and only a caregiver's
 * long press on the unmarked corner moves the app on.
 */
export function SessionCompletion() {
  const p = usePersonalization()

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">


      <div className="animate-rise-in">
        <h1 className="patient-prompt">{p.text('completion')}</h1>
        <p className="mt-4 font-display text-2xl text-ink-soft">{p.text('completionSub')}</p>
      </div>

      <div className="flex items-center gap-2" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-glow-400"
            style={{ animation: `soft-pulse 3200ms ease-in-out ${i * 260}ms infinite` }}
          />
        ))}
      </div>
    </div>
  )
}
