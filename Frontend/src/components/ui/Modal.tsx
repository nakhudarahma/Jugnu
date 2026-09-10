import { useEffect, useRef, type ReactNode } from 'react'
import { IconButton } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  /** Compact sheets (mood check-in) sit lower and narrower. */
  size?: 'sm' | 'md' | 'lg'
  dismissible?: boolean
}

const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

export function Modal({ open, onClose, title, description, children, footer, size = 'md', dismissible = true }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null)
  // Every caller passes an inline arrow for onClose, so its identity changes on each
  // render of the screen holding the modal. Reading it through a ref keeps the effect
  // below keyed on `open` alone: when it also depended on onClose, a keystroke in a form
  // field re-ran it and pulled focus back to the first field after every letter.
  const latestClose = useRef(onClose)
  useEffect(() => {
    latestClose.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) latestClose.current()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTarget = panel.current?.querySelector<HTMLElement>(
      'input, select, textarea, button:not([aria-label="Close"])',
    )
    focusTarget?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, dismissible])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-ink/25 backdrop-blur-[2px] animate-fade-in"
        onClick={() => dismissible && onClose()}
        aria-hidden="true"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 w-full ${widths[size]} animate-rise-in overflow-hidden rounded-t-[28px] border border-line bg-paper shadow-lift sm:rounded-card`}
      >
        <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl text-ink">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
          </div>
          {dismissible && <IconButton icon="close" label="Close" onClick={onClose} className="-mr-2 -mt-1" />}
        </div>
        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="mt-5 flex flex-wrap justify-end gap-2 safe-bottom sm:pb-0">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
