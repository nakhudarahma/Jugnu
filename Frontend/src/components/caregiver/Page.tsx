import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'

/** Shared page frame: one comfortable column, generous breathing room. */
export function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-[100dvh] bg-cream">
      <div className={`mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 lg:max-w-6xl lg:px-8 xl:max-w-7xl xl:px-12 ${className}`}>{children}</div>
    </div>
  )
}

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  /**
   * Where the back arrow goes. Defaults to the dashboard. Pass "back" to return
   * to wherever the user came from instead of a hardcoded route.
   */
  backTo?: string | 'back'
}

export function ScreenHeader({ title, subtitle, action, backTo = '/' }: ScreenHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="flex items-start justify-between gap-4 pb-5 pt-6">
      <div className="flex min-w-0 items-start gap-3">
        <button
          type="button"
          onClick={() => (backTo === 'back' ? navigate(-1) : navigate(backTo))}
          aria-label="Back"
          className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-paper text-ink-soft shadow-card transition duration-200 ease-calm hover:border-glow-300 hover:text-ink"
        >
          <Icon name="back" size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-[1.6rem] leading-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
  )
}
