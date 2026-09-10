import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>
}

interface SectionCardProps {
  eyebrow?: string
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  /** Whole-card tap target, used for cards that open a detail screen. */
  onClick?: () => void
  ariaLabel?: string
}

export function SectionCard({ eyebrow, title, action, children, className = '', onClick, ariaLabel }: SectionCardProps) {
  const body = (
    <>
      {(eyebrow || title || action) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {eyebrow && <p className="label-eyebrow">{eyebrow}</p>}
            {title && <h2 className="heading-card mt-1">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={`card card-pad w-full text-left transition duration-200 ease-calm hover:border-glow-200 hover:shadow-lift ${className}`}
      >
        {body}
      </button>
    )
  }

  return <section className={`card card-pad ${className}`}>{body}</section>
}
