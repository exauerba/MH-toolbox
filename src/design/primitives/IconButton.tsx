import type { ButtonHTMLAttributes } from 'react'
import type { IconName } from '../icons'
import { Icon } from '../icons'
import { cx } from '../cx'

export type IconButtonVariant = 'ghost' | 'secondary' | 'soft' | 'filled'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon to render. */
  icon: IconName
  /** Accessible name — required. Becomes aria-label and native tooltip. */
  label: string
  variant?: IconButtonVariant
  /** Use the "filled" icon variant (e.g. a pinned star). */
  filled?: boolean
  /** Cozy 16-bit mode — render the pixel sprite for this icon. */
  pixel?: boolean
  /** Rounded-circle look (steppers, date nav). */
  round?: boolean
}

const variantClasses: Record<IconButtonVariant, string> = {
  ghost: 'text-ink-soft hover:bg-surface-muted hover:text-ink active:bg-surface-strong',
  secondary:
    'bg-surface text-ink border border-line-strong hover:bg-surface-muted active:bg-surface-strong shadow-soft',
  soft: 'bg-brand-100 text-brand-700 hover:bg-brand-200 active:bg-brand-300 dark:bg-brand-300/20 dark:text-brand-300',
  filled: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-soft',
}

/**
 * Icon-only button with a guaranteed 44px hit area and a required accessible
 * name. The label doubles as the native tooltip on hover.
 */
export function IconButton({
  icon,
  label,
  variant = 'ghost',
  filled = false,
  pixel = false,
  round = false,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'pressable inline-flex touch-target items-center justify-center',
        pixel ? 'rounded-[var(--radius-pixel)]' : 'rounded-xl',
        variantClasses[variant],
        round && 'rounded-full',
        className,
      )}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon name={icon} size={20} filled={filled} pixel={pixel} />
    </button>
  )
}
