import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../cx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** True while an async action is pending: disables and shows a spinner. */
  loading?: boolean
  /** Spinner + button text stay, but the control is inert. */
  fullWidth?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  children: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-soft hover:shadow-lift disabled:bg-ink-faint',
  secondary:
    'bg-surface text-ink border border-line-strong hover:bg-surface-muted active:bg-surface-strong shadow-soft disabled:text-ink-faint',
  ghost:
    'bg-transparent text-brand-700 hover:bg-brand-100 active:bg-brand-200 disabled:text-ink-faint dark:text-brand-300',
  danger:
    'bg-error-strong text-white hover:brightness-110 active:brightness-95 shadow-soft disabled:bg-ink-faint',
}

const sizeClasses: Record<ButtonSize, string> = {
  md: 'min-h-11 px-5 text-base',
  lg: 'min-h-13 px-6 text-lg',
}

/**
 * Primary action control. Minimum 44px tall; every state (hover, active,
 * focus-visible, disabled, loading) is styled and announced.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  className,
  disabled,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'pressable inline-flex items-center justify-center gap-2 rounded-full font-bold',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="block size-5 animate-spin rounded-full border-2 border-white/40 border-t-white [animation-duration:var(--dur-spin)]"
        />
      ) : (
        leadingIcon
      )}
      {children}
      {trailingIcon}
    </button>
  )
}
