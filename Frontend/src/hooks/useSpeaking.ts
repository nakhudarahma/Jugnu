import { useEffect, useState } from 'react'
import { voice } from '@/lib/voice'

/** True while Jugnu is speaking — drives the calm "listening" indicator. */
export function useSpeaking(): boolean {
  const [speaking, setSpeaking] = useState(false)
  useEffect(() => voice.subscribe(setSpeaking), [])
  return speaking
}
