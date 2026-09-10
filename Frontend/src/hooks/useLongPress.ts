import { useCallback, useEffect, useRef, useState } from 'react'

interface LongPressResult {
  /** Spread onto the invisible target. */
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerUp: () => void
    onPointerLeave: () => void
    onPointerCancel: () => void
    onContextMenu: (e: React.SyntheticEvent) => void
  }
  holding: boolean
}

/**
 * A press that must be held for the full duration. Releasing early, sliding off the
 * target, or an interrupted pointer all cancel it — so a patient resting a hand on
 * the screen cannot reach the caregiver side by accident.
 */
export function useLongPress(onComplete: () => void, durationMs = 3000): LongPressResult {
  const timer = useRef<number | null>(null)
  const [holding, setHolding] = useState(false)

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    setHolding(false)
  }, [])

  useEffect(() => clear, [clear])

  const start = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== undefined && e.button !== 0) return
      e.preventDefault()
      clear()
      setHolding(true)
      timer.current = window.setTimeout(() => {
        timer.current = null
        setHolding(false)
        onComplete()
      }, durationMs)
    },
    [clear, durationMs, onComplete],
  )

  return {
    holding,
    handlers: {
      onPointerDown: start,
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
      onContextMenu: (e: React.SyntheticEvent) => e.preventDefault(),
    },
  }
}
