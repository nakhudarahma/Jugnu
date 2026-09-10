import { Illustration } from '@/components/ui/Illustration'
import { Portrait } from '@/components/ui/Portrait'
import type { ChoiceOption } from '@/session/plan'

export type TileState = 'idle' | 'chosen' | 'reveal' | 'placed'

interface ChoiceTileProps {
  option: ChoiceOption
  onSelect: () => void
  disabled?: boolean
  state?: TileState
  /** Sequencing: 1-based position once the tile has been tapped. */
  placedIndex?: number
  /** Single-tile steps get more room. */
  solo?: boolean
  /** 2- or 4-up grid: tighter padding, still elder-readable font. */
  compact?: boolean
}

const ring: Record<TileState, string> = {
  idle:   'border-line bg-white',
  chosen: 'border-glow-400 bg-glow-50/40 ring-4 ring-glow-200/50',
  reveal: 'border-sage-500 bg-sage-50/60 ring-4 ring-sage-300/60',
  placed: 'border-sage-400/70 bg-sage-50/50',
}

/**
 * One answer. Level 2 shows the photograph with the name under it, Level 1 shows the
 * name alone at display size — all in one tap target far larger than the accessibility minimum.
 */
export function ChoiceTile({ option, onSelect, disabled, state = 'idle', placedIndex, solo, compact }: ChoiceTileProps) {
  const showsPicture = Boolean(option.person || option.art)
  const isCorrect = state === 'reveal' || state === 'placed'

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-label={option.label}
      className={[
        'patient-tile',
        ring[state],
        solo ? 'sm:col-span-2 sm:mx-auto sm:w-2/3 max-w-sm' : '',
        compact ? 'patient-tile-compact p-2.5 sm:p-3 gap-1.5 rounded-[20px]' : 'p-3 sm:p-3.5 gap-2 rounded-[24px]',
        disabled ? 'cursor-default' : '',
        isCorrect ? 'ring-4 ring-sage-300/60' : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Placed-order badge for sequencing games */}
      {placedIndex !== undefined && (
        <span className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-sage-500 text-sm font-bold text-white shadow-sm">
          {placedIndex}
        </span>
      )}

      {/* Illustration / portrait: warm cream inner panel with crisp white image container */}
      {option.person ? (
        <span
          className={`flex aspect-square w-full max-h-[190px] sm:max-h-[220px] items-center justify-center rounded-[18px] bg-[#FAF5EB] ${
            compact ? 'p-1.5 sm:p-2' : 'p-2 sm:p-2.5'
          }`}
        >
          <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-[12px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <Portrait person={option.person} alt={option.label} />
          </span>
        </span>
      ) : option.art ? (
        <span
          className={`flex aspect-square w-full max-h-[190px] sm:max-h-[220px] items-center justify-center rounded-[18px] bg-[#FAF5EB] ${
            compact ? 'p-1.5 sm:p-2' : 'p-2 sm:p-2.5'
          }`}
        >
          <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-[12px] bg-white p-2 sm:p-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <Illustration name={option.art} className="h-full w-full object-contain" />
          </span>
        </span>
      ) : null}

      {/* Label — CSS clamp handles the size; compact overrides via .patient-tile-compact */}
      <span className={`patient-tile-name ${showsPicture ? 'mt-0.5' : ''}`}>{option.label}</span>
    </button>
  )
}
