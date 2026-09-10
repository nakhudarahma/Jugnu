import { useId, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react'

interface FieldProps {
  label: string
  hint?: string
  children: (id: string) => ReactNode
  required?: boolean
}

export function Field({ label, hint, children, required }: FieldProps) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
        {required && <span className="ml-1 text-glow-600">*</span>}
      </label>
      {children(id)}
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
    </div>
  )
}

export function TextInput({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`} {...rest} />
}

export function TextArea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`input min-h-[96px] resize-y ${className}`} {...rest} />
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`input appearance-none bg-paper pr-10 ${className}`} {...rest}>
      {children}
    </select>
  )
}

interface SegmentedProps<T extends string | number> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; description?: string }[]
  label: string
  columns?: 1 | 2 | 3
}

export function Segmented<T extends string | number>({ value, onChange, options, label, columns = 1 }: SegmentedProps<T>) {
  const cols = columns === 3 ? 'sm:grid-cols-3' : columns === 2 ? 'sm:grid-cols-2' : ''
  return (
    <div role="radiogroup" aria-label={label} className={`grid gap-2 ${cols}`}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-2xl border px-4 py-3 text-left transition duration-200 ease-calm ${
              selected ? 'border-glow-400 bg-glow-50 shadow-card' : 'border-line bg-paper hover:border-glow-200'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span
                aria-hidden="true"
                className={`grid h-4 w-4 place-items-center rounded-full border-2 ${
                  selected ? 'border-glow-500' : 'border-line'
                }`}
              >
                {selected && <span className="h-2 w-2 rounded-full bg-glow-500" />}
              </span>
              {option.label}
            </span>
            {option.description && <span className="mt-1 block pl-6 text-xs text-ink-soft">{option.description}</span>}
          </button>
        )
      })}
    </div>
  )
}

interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  description?: string
}

export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        {description && <p className="mt-0.5 text-xs text-ink-soft">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-pill transition duration-200 ease-calm ${
          checked ? 'bg-glow-500' : 'bg-dusk-100'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ease-calm ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}
