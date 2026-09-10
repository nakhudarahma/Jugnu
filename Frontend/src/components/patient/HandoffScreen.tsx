import { useSearchParams } from 'react-router-dom'
import { BrandMark } from '@/components/caregiver/CaregiverHeader'
import { SpeakingIndicator } from '@/components/ui/Bits'
import { Portrait } from '@/components/ui/Portrait'
import { usePatient } from '@/state/AppContext'

/**
 * The bridge between the two worlds. It exists so the caregiver has a moment to hand
 * the device over while Jugnu has already begun speaking — the patient's first
 * experience is a voice, not a screen appearing.
 */
export function HandoffScreen() {
  const patient = usePatient()
  const [searchParams] = useSearchParams()
  const game = searchParams.get('game')
  const gameName =
    game === 'object_match'
      ? 'Game 1: Object Match'
      : game === 'routine_sequencing'
        ? 'Game 2: Routine Sequencing'
        : game === 'pattern_recall'
          ? 'Game 3: Pattern Recall'
          : game === 'whos_calling'
            ? "Who's Calling?"
            : game === 'person_recall'
              ? 'Family Recall'
              : undefined

  return (
    <main className="patient-screen grid place-items-center px-6 py-16" aria-live="polite">
      <div className="flex max-w-md flex-col items-center text-center animate-fade-in">
        {gameName && (
          <span className="mb-4 inline-flex items-center rounded-pill bg-glow-100 px-3.5 py-1 text-xs font-semibold text-glow-900 shadow-sm">
            {gameName}
          </span>
        )}
        <span className="h-24 w-24 overflow-hidden rounded-full border-4 border-paper shadow-lift">
          <Portrait name={patient.name} tone={patient.portraitTone} />
        </span>
        <h1 className="mt-6 font-display text-3xl leading-snug text-ink">Handing over to {patient.displayName}…</h1>
        <p className="mt-3 text-base text-ink-soft">
          Jugnu is starting to speak. Pass the device across — everything from here is for {patient.displayName}.
        </p>

        <div className="mt-8 flex items-center gap-3 rounded-pill border border-line bg-paper/80 px-5 py-3">
          <BrandMark size={26} />
          <SpeakingIndicator force />
        </div>
      </div>
    </main>
  )
}
