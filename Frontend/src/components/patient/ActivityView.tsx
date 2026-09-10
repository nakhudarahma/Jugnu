import { Icon } from '@/components/ui/Icon'
import { SpeakingIndicator } from '@/components/ui/Bits'
import { Illustration } from '@/components/ui/Illustration'
import { ChoiceTile, type TileState } from './ChoiceTile'
import type { SessionEngine } from '@/session/useSessionEngine'
import { usePersonalization } from '@/state/personalization'

// 3 cards → 2-up, 1 centered below  (last child spans 2 cols, centered)
// 4 cards → 2×2 grid
const gridClass: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 [&>:last-child]:col-span-2 [&>:last-child]:mx-auto [&>:last-child]:w-[calc(50%-6px)]',
  4: 'grid-cols-2',
}

/**
 * One activity, filling the screen. The voice has already asked the question by the
 * time this is read; the text is the quiet second copy of it. There is no score, no
 * timer and no progress pressure.
 */
export function ActivityView({ engine }: { engine: SessionEngine }) {
  const p = usePersonalization()
  const { step, feedback, phase } = engine
  if (!step) return null

  const answering = phase === 'activity'
  const isGentle = feedback?.outcome === 'gentle'

  const tileState = (id: string, correct: boolean): TileState | undefined => {
    if (engine.placedIds.includes(id)) return 'placed'
    if (!feedback) return 'idle'
    if (correct) return 'reveal'
    return id === engine.selectedId ? 'chosen' : 'idle'
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-4xl lg:max-w-5xl flex-col justify-center gap-6 sm:gap-8 px-4 py-6 sm:px-6 safe-bottom">
      <div className="text-center">
        <p className="sr-only">
          Activity {engine.stepNumber} of {engine.totalSteps}
        </p>
        <div className="mb-6 flex justify-center gap-2" aria-hidden="true">
          {Array.from({ length: engine.totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-pill transition-all duration-500 ease-calm ${
                i < engine.stepNumber - 1 ? 'w-2 bg-sage-500/60' : i === engine.stepNumber - 1 ? 'w-8 bg-glow-500' : 'w-2 bg-line'
              }`}
            />
          ))}
        </div>

        <h1 className="patient-prompt" aria-live="polite">
          {engine.promptText}
        </h1>

        <div className="mt-5 flex items-center justify-center gap-4">
          <SpeakingIndicator />
          {step.voicePerson && (
            <button type="button" onClick={engine.playVoiceNote} className="btn-secondary text-base">
              <Icon name="play" size={18} />
              {p.text('playVoice')}
            </button>
          )}
          <button type="button" onClick={engine.repeatPrompt} className="btn-ghost text-base">
            <Icon name="volume" size={18} />
            {p.text('hearAgain')}
          </button>
        </div>
      </div>

      {/* Pattern Recall: Visual Sequence Display */}
      {step.patternPreview && (
        <div className="mx-auto flex max-w-xl flex-wrap items-center justify-center gap-2 sm:gap-4 rounded-3xl border border-line bg-white px-5 py-4 shadow-card">
          {step.patternPreview.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 sm:gap-3">
              <div className="flex flex-col items-center">
                <span className="flex aspect-square h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-[20px] bg-[#FAF5EB] p-2 border border-line/50 shadow-xs">
                  <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-[14px] bg-white p-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                    <Illustration name={item.art} className="h-full w-full object-contain" />
                  </span>
                </span>
                <span className="mt-1.5 text-xs sm:text-sm font-semibold text-ink-soft">{item.label}</span>
              </div>
              <Icon name="chevronRight" size={18} className="text-ink-faint" />
            </div>
          ))}
          <div className="flex flex-col items-center">
            <span className="flex aspect-square h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-[20px] bg-[#FAF5EB] p-2 border-2 border-dashed border-glow-400 shadow-xs">
              <span className="flex h-full w-full items-center justify-center rounded-[14px] bg-white text-2xl sm:text-3xl font-bold text-glow-600 shadow-[0_1px_3px_rgba(0,0,0,0.03)] animate-soft-pulse">
                ?
              </span>
            </span>
            <span className="mt-1.5 text-xs sm:text-sm font-semibold text-glow-800">{p.text('whatNext')}</span>
          </div>
        </div>
      )}

      <div className={`mx-auto w-full max-w-[620px] grid gap-3 ${gridClass[step.options.length] ?? 'grid-cols-2'}`}>
        {step.options.map((option) => {
          const placedAt = engine.placedIds.indexOf(option.id)
          return (
            <ChoiceTile
              key={option.id}
              option={option}
              solo={step.options.length === 1}
              compact={step.options.length >= 3}
              state={tileState(option.id, option.correct)}
              placedIndex={placedAt >= 0 ? placedAt + 1 : undefined}
              disabled={!answering || placedAt >= 0}
              onSelect={() => engine.answer(option.id)}
            />
          )
        })}
      </div>

      {/* Correct: warm and brief. Wrong: the answer is simply shown, never marked wrong. */}
      <div className="min-h-[76px]">
        {feedback && (
          <div
            className={`mx-auto flex max-w-2xl items-center justify-center gap-3 rounded-card border px-6 py-4 text-center animate-rise-in ${
              isGentle ? 'border-lilac-500/30 bg-lilac-100/70' : 'border-sage-500/40 bg-sage-100/70'
            }`}
          >
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-white ${
                isGentle ? 'bg-lilac-500' : 'bg-sage-500 animate-soft-pulse'
              }`}
              aria-hidden="true"
            >
              <Icon name={isGentle ? 'heart' : 'check'} size={22} />
            </span>
            <p className="font-display text-2xl leading-snug text-ink">{feedback.line}</p>
          </div>
        )}
      </div>
    </div>
  )
}
