import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from './icons'

const variants = {
  primary: 'bg-primary text-on-primary hover:opacity-90',
  secondary: 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest',
  ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
  success: 'bg-secondary text-on-secondary hover:opacity-90',
} as const

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants
  icon?: IconName
  children?: ReactNode
}

export function Button({ variant = 'primary', icon, className, children, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={`${variants[variant]} inline-flex min-h-11 items-center justify-center gap-space-sm rounded-lg px-4 text-body-md font-medium transition-colors disabled:opacity-60 ${className ?? ''}`}
      {...rest}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  )
}

type IconButtonProps = Omit<ComponentProps<'button'>, 'children'> & {
  icon: IconName
  label: string
}

export function IconButton({ icon, label, className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:text-on-surface ${className ?? ''}`}
      {...rest}
    >
      <Icon name={icon} size={20} />
    </button>
  )
}
