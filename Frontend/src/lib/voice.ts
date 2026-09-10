import type { LanguageCode } from '@/types'
import { speechLocale } from './i18n'

type Listener = (speaking: boolean) => void

export interface SpeakOptions {
  lang?: LanguageCode
  rate?: number
  /** Called when speech finishes, is cancelled, or when TTS is unavailable. */
  onEnd?: () => void
}

/** How long to wait for the voice list before giving up and speaking anyway. */
const VOICES_WAIT = 400
/** No single prompt in Jugnu is longer than this; the watchdog stops waiting here. */
const HARD_CAP = 30_000
/** If the engine has not started speaking by now, it swallowed the utterance. */
const DROPPED_AFTER = 1200
const POLL = 400

/**
 * Voice is the primary channel in the patient experience, so this wrapper never
 * throws and always resolves: if the browser cannot speak, callers still advance.
 *
 * Browser speech engines fail in a handful of specific, well-known ways, and every
 * guard below exists for one of them: the voice list loads asynchronously, cancel()
 * followed immediately by speak() drops the new utterance in Chrome, the engine can
 * be left in a stuck paused state after a tab switch, autoplay policy blocks speech
 * until the page has seen a real gesture, and some engines swallow an utterance with
 * no error at all. None of them is allowed to stall a session.
 */
class VoiceService {
  private listeners = new Set<Listener>()
  private active = false
  private voices: SpeechSynthesisVoice[] = []
  private enabled = true
  private timers = new Set<number>()
  /** Bumped on every speak and cancel, so a late callback from an old utterance is ignored. */
  private turn = 0
  private primed = false

  constructor() {
    if (!this.supported) return
    this.loadVoices()
    window.speechSynthesis.addEventListener?.('voiceschanged', () => this.loadVoices())
    // Autoplay policy: the engine stays mute until the page has had a real gesture,
    // so the very first prompt of a session would otherwise be silent.
    const prime = () => this.prime()
    window.addEventListener('pointerdown', prime, { once: true, capture: true })
    window.addEventListener('keydown', prime, { once: true, capture: true })
  }

  get supported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  /** True once a real voice for this language exists; the UI uses it to warn the caregiver. */
  hasVoiceFor(lang: LanguageCode): boolean {
    if (!this.supported) return false
    if (!this.voices.length) this.loadVoices()
    const wanted = speechLocale[lang] ?? ['en-IN']
    const prefix = wanted[0].split('-')[0].toLowerCase()
    return this.voices.some((v) => v.lang?.toLowerCase().startsWith(prefix))
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    if (!enabled) this.cancel()
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.active)
    return () => this.listeners.delete(listener)
  }

  private emit(active: boolean) {
    this.active = active
    this.listeners.forEach((l) => l(active))
  }

  private loadVoices() {
    try {
      this.voices = window.speechSynthesis.getVoices() ?? []
    } catch {
      this.voices = []
    }
  }

  private track(id: number) {
    this.timers.add(id)
    return id
  }

  private clearTimers() {
    this.timers.forEach((id) => window.clearTimeout(id))
    this.timers.clear()
  }

  /**
   * Clear a suspended engine on the first gesture. This deliberately does not queue a
   * warm-up utterance: on engines that were working anyway, a silent utterance racing
   * the first real prompt is a good way to lose it.
   */
  private prime() {
    if (this.primed || !this.supported) return
    this.primed = true
    try {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume()
    } catch {
      /* nothing to recover: the flow falls back to the timed beat */
    }
  }

  /**
   * Prefer a voice that genuinely speaks the patient's language, and among those prefer
   * one installed on the device.
   *
   * Chrome lists a great many network voices, and when its speech endpoint is
   * unreachable — a filtering proxy, a firewall, no connection — they fail completely
   * silently: speak() is accepted, no events fire, no audio arrives. A local voice is
   * the only kind that can be relied on, so locality outranks an exact locale match.
   *
   * When the device has no voice for the language at all, deliberately return none and
   * pass only the language tag: the engine resolves it itself. Forcing a substitute
   * looks helpful and is not, since an English voice handed Devanagari text is dropped.
   */
  private pickVoice(lang: LanguageCode, localOnly = false): { voice?: SpeechSynthesisVoice; tag: string } {
    const wanted = speechLocale[lang] ?? ['en-IN']
    if (!this.voices.length) this.loadVoices()
    const pool = localOnly ? this.voices.filter((v) => v.localService) : this.voices
    const ranked = [...pool].sort((a, b) => Number(b.localService) - Number(a.localService))
    for (const tag of wanted) {
      const exact = ranked.find((v) => v.lang?.toLowerCase() === tag.toLowerCase())
      if (exact) return { voice: exact, tag }
      const prefix = tag.split('-')[0].toLowerCase()
      const loose = ranked.find((v) => v.lang?.toLowerCase().startsWith(prefix))
      if (loose) return { voice: loose, tag: loose.lang }
    }
    // Nothing for this language. If we were told to stay local, any local voice beats
    // a silent network one, because the caller is testing whether audio works at all.
    if (localOnly && ranked.length) return { voice: ranked[0], tag: ranked[0].lang }
    return { tag: wanted[0] }
  }

  cancel() {
    this.turn += 1
    this.clearTimers()
    if (this.supported) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        /* ignore */
      }
    }
    if (this.active) this.emit(false)
  }

  speak(text: string, options: SpeakOptions = {}) {
    const { lang = 'en', rate = 0.85, onEnd } = options
    const wasBusy = this.supported && (window.speechSynthesis.speaking || window.speechSynthesis.pending)
    this.cancel()
    const turn = this.turn

    if (!text.trim()) {
      onEnd?.()
      return
    }

    if (!this.supported || !this.enabled) {
      // No voice available: hold for a readable beat so the flow still feels spoken.
      this.emit(true)
      this.track(
        window.setTimeout(() => {
          if (turn !== this.turn) return
          this.emit(false)
          onEnd?.()
        }, Math.min(6000, 900 + text.length * 55)),
      )
      return
    }

    this.emit(true)
    // Two waits, both real: Chrome drops an utterance queued in the same tick as a
    // cancel, and getVoices() is empty until the engine has loaded its list.
    const settle = (wasBusy ? 120 : 0) + (this.voices.length ? 0 : VOICES_WAIT)
    if (settle === 0) this.utter(text, lang, rate, turn, onEnd)
    else
      this.track(
        window.setTimeout(() => {
          if (turn !== this.turn) return
          this.utter(text, lang, rate, turn, onEnd)
        }, settle),
      )
  }

  /**
   * Second attempt with a device-installed voice, after the engine swallowed the first.
   * The turn is bumped so the abandoned utterance's late onend cannot end the retry, and
   * the speaking flag deliberately stays on: from the caller's side this is still one
   * prompt being spoken, not a new one.
   */
  private retryLocally(text: string, lang: LanguageCode, rate: number, onEnd?: () => void) {
    this.turn += 1
    const turn = this.turn
    this.clearTimers()
    try {
      window.speechSynthesis.cancel()
    } catch {
      /* ignore */
    }
    // Chrome drops an utterance queued in the same tick as a cancel.
    this.track(
      window.setTimeout(() => {
        if (turn !== this.turn) return
        this.utter(text, lang, rate, turn, onEnd, true)
      }, 150),
    )
  }

  private utter(text: string, lang: LanguageCode, rate: number, turn: number, onEnd?: () => void, localOnly = false) {
    const { voice: chosen, tag } = this.pickVoice(lang, localOnly)
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = chosen?.lang ?? tag
    if (chosen) utterance.voice = chosen
    utterance.rate = rate
    utterance.pitch = 1
    utterance.volume = 1

    const finish = () => {
      if (turn !== this.turn) return
      this.turn += 1
      this.clearTimers()
      this.emit(false)
      onEnd?.()
    }
    utterance.onend = finish
    utterance.onerror = finish

    try {
      // A tab switch can leave the engine paused, muting everything that follows.
      if (window.speechSynthesis.paused) window.speechSynthesis.resume()
      window.speechSynthesis.speak(utterance)
    } catch {
      finish()
      return
    }

    // Watchdog: some engines swallow an utterance without firing onend or onerror, and
    // some speak more slowly than any estimate. Poll the engine instead of guessing —
    // if it never starts, advance straight away rather than making her sit through a
    // silent estimate; if it is still talking, keep waiting so nothing is cut off.
    const started = Date.now()
    let everBusy = false
    const tick = () => {
      if (turn !== this.turn) return
      try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume()
      } catch {
        /* ignore */
      }
      const busy = window.speechSynthesis.speaking || window.speechSynthesis.pending
      if (busy) everBusy = true
      const elapsed = Date.now() - started
      if (!everBusy && elapsed >= DROPPED_AFTER) {
        // Accepted and never started. That is the signature of a network voice whose
        // endpoint is unreachable, so try once with a voice stored on the device before
        // giving up — a second of delay is far better than a silent prompt.
        if (!localOnly && !chosen?.localService && this.voices.some((v) => v.localService)) {
          this.retryLocally(text, lang, rate, onEnd)
          return
        }
        finish()
        return
      }
      if ((busy || !everBusy) && elapsed < HARD_CAP) {
        this.track(window.setTimeout(tick, POLL))
        return
      }
      finish()
    }
    this.track(window.setTimeout(tick, POLL))
  }
}

export const voice = new VoiceService()
