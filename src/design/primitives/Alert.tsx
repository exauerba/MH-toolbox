import type { ReactNode } from 'react'
import type { IconName } from '../icons'
import { Icon } from '../icons'
import { IconButton } from './IconButton'
import { cx } from '../cx'

export type AlertVariant = 'info' | 'success' | 'warning' | 'error'

export interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: ReactNode
  /** Shows a close button that calls onDismiss. */
  dismissible?: boolean
  onDismiss?: () => void
  /** Cozy 16-bit mode — render the leading icon as a pixel sprite. */
  pixel?: boolean
  className?: string
}

const variantConfig: Record<
  AlertVariant,
  { icon: IconName; iconClass: string; containerClass: string; role: 'status' | 'alert' }
> = {
  info: {
    icon: 'info',
    iconClass: 'bg-info-soft text-info-ink',
    containerClass: 'bg-info-soft border-info-line text-info-ink',
    role: 'status',
  },
  success: {
    icon: 'success',
    iconClass: 'bg-success-soft text-success-ink',
    containerClass: 'bg-success-soft border-success-line text-success-ink',
    role: 'status',
  },
  warning: {
    icon: 'gauge',
    iconClass: 'bg-warning-soft text-warning-ink',
    containerClass: 'bg-warning-soft border-warning-line text-warning-ink',
    role: 'status',
  },
  error: {
    icon: 'alert',
    iconClass: 'bg-error-soft text-error-ink',
    containerClass: 'bg-error-soft border-error-line text-error-ink',
    role: 'alert',
  },
}

/**
 * Informational banner. Never colour-alone: every variant leads with its
 * icon and title text. `role` follows the severity — only `error` is
 * assertive, so a calm app isn't constantly interrupting.
 */
export function Alert({ variant = 'info', title, children, dismissible, onDismiss, pixel, className }: AlertProps) {
  const config = variantConfig[variant]
  const containerClass = config.containerClass

  return (
    <div
      role={config.role}
      className={cx(
        'flex items-start gap-3 p-4 animate-fade-in',
        pixel ? 'rounded-none border-2 shadow-pixel-sm' : 'rounded-xl border shadow-soft',
        containerClass,
        className,
      )}
    >
      <span
        className={cx(
          'flex size-10 shrink-0 items-center justify-center',
          pixel ? 'rounded-none' : 'rounded-full',
          config.iconClass,
        )}
        aria-hidden="true"
      >
        <Icon name={config.icon} size={22} pixel={pixel} />
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className="text-base font-extrabold">{title}</p>}
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
      {dismissible && (
        <IconButton icon="close" label="Dismiss this message" variant="ghost" onClick={onDismiss} />
      )}
    </div>
  )
}
