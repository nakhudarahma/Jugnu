import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import { useSpeaking } from '@/hooks/useSpeaking'

type Tone = 'neutral' | 'glow' | 'sage' | 'clay' | 'dusk' | 'lilac'

const toneClass: Record<Tone, string> = {
  neutral: 'bg-sand text-ink-soft',
  glow: 'bg-glow-100 text-glow-700',
  sage: 'bg-sage-100 text-sage-700',
  clay: 'bg-clay-100 text-clay-700',
  dusk: 'bg-dusk-100 text-dusk-700',
  lilac: 'bg-lilac-100 text-lilac-700',
}

export function Chip({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={`chip ${toneClass[tone]} ${className}`}>{children}</span>
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line bg-sand/40 px-6 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-paper text-ink-faint shadow-card">
        <Icon name={icon} size={22} />
      </span>
      <div>
        <p className="font-display text-lg text-ink">{title}</p>
        {body && <p className="mt-1 max-w-sm text-sm text-ink-soft">{body}</p>}
      </div>
      {action}
    </div>
  )
}

/** Calm three-bar indicator: the patient can see that Jugnu is speaking. */
export function SpeakingIndicator({ className = '', force }: { className?: string; force?: boolean }) {
  const speaking = useSpeaking()
  const active = force ?? speaking
  return (
    <span
      className={`inline-flex items-end gap-1 ${className}`}
      aria-hidden="true"
      style={{ opacity: active ? 1 : 0.25, transition: 'opacity 400ms' }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 rounded-pill bg-glow-500"
          style={{
            height: 18,
            transformOrigin: 'bottom',
            animation: active ? `speak-bar 1100ms ease-in-out ${i * 160}ms infinite` : 'none',
            transform: active ? undefined : 'scaleY(0.35)',
          }}
        />
      ))}
    </span>
  )
}

export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`border-line ${className}`} />
}

/** Small "this is limited for your role" note — shown once, never as a click-time error. */
export function PermissionNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-2xl bg-sand/70 px-3 py-2 text-xs text-ink-soft">
      <Icon name="lock" size={14} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
