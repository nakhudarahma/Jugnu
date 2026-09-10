import { useCallback, useMemo } from 'react'
import type { LanguageCode, PersonalizationLevel } from '@/types'
import { t, type StringKey } from '@/lib/i18n'
import { voice } from '@/lib/voice'
import { usePatient } from './AppContext'

export interface Personalization {
  level: PersonalizationLevel
  language: LanguageCode
  /** Level 0 — generic illustrations, no personal content. */
  useGenericArt: boolean
  /** Level 1 — large name buttons, voice carries the meaning. */
  useNameTiles: boolean
  /** Level 2 — real photographs of the family. */
  usePhotos: boolean
  /** Level 2 — recorded family voices may be played back. */
  useFamilyVoices: boolean
  voiceEnabled: boolean
  /** Speak a translated string. */
  say: (key: StringKey, vars?: Record<string, string>, onEnd?: () => void) => void
  /** Speak a literal sentence (already in the patient's language). */
  sayText: (text: string, onEnd?: () => void) => void
  stop: () => void
  /** Translate without speaking, for the on-screen support text. */
  text: (key: StringKey, vars?: Record<string, string>) => string
}

/**
 * One personalization service for the whole patient experience — screens ask what
 * to render rather than each re-deriving the level.
 */
export function usePersonalization(): Personalization {
  const patient = usePatient()
  const { personalizationLevel: level, language, speechRate, voiceEnabled } = patient

  const sayText = useCallback(
    (text_: string, onEnd?: () => void) => {
      voice.speak(text_, { lang: language, rate: speechRate, onEnd })
    },
    [language, speechRate],
  )

  const say = useCallback(
    (key: StringKey, vars?: Record<string, string>, onEnd?: () => void) => {
      sayText(t(language, key, vars), onEnd)
    },
    [language, sayText],
  )

  return useMemo(
    () => ({
      level,
      language,
      useGenericArt: level === 1 || level === 0,
      useNameTiles: false,
      usePhotos: level === 2,
      useFamilyVoices: level === 2,
      voiceEnabled,
      say,
      sayText,
      stop: () => voice.cancel(),
      text: (key: StringKey, vars?: Record<string, string>) => t(language, key, vars),
    }),
    [level, language, voiceEnabled, say, sayText],
  )
}
