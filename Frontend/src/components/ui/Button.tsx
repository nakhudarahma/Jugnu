import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: IconName
  trailingIcon?: IconName
  block?: boolean
  children?: ReactNode
}

const variantClass: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-quiet-danger',
}

export function Button({
  variant = 'secondary',
  icon,
  trailingIcon,
  block = false,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={`${variantClass[variant]} ${block ? 'w-full' : ''} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={18} />}
      {children}
      {trailingIcon && <Icon name={trailingIcon} size={18} />}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  label: string
  size?: number
  tone?: 'default' | 'quiet'
}

export function IconButton({ icon, label, size = 20, tone = 'default', className = '', ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition duration-200 ease-calm ${
        tone === 'quiet' ? 'text-ink-faint hover:bg-sand hover:text-ink' : 'text-ink-soft hover:bg-sand hover:text-ink'
      } ${className}`}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  )
}
