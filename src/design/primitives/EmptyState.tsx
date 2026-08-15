import type { ReactNode } from 'react'
import type { IconName } from '../icons'
import { Icon } from '../icons'
import { cx } from '../cx'

export interface EmptyStateProps {
  icon?: IconName
  title: string
  body?: ReactNode
  /** One clear next step. */
  action?: ReactNode
  className?: string
}

/**
 * Calm, encouraging empty state — the "nothing here yet" moment is warm,
 * never a dead end: every empty state offers exactly one obvious action.
 */
export function EmptyState({ icon = 'sparkle', title, body, action, className }: EmptyStateProps) {
  return (
    <div className={cx('flex flex-col items-center gap-3 px-6 py-12 text-center', className)}>
      <span className="flex size-16 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-300/20 dark:text-brand-300">
        <Icon name={icon} size={32} />
      </span>
      <p className="text-lg font-extrabold text-ink">{title}</p>
      {body && <p className="max-w-sm text-base text-ink-soft">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
