import type { ElementType, ReactNode } from 'react'
import { cx } from '../cx'

export type CardVariant = 'default' | 'raised' | 'tile' | 'soft'
export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

export interface CardProps {
  /** Semantic element; defaults to a plain div. Use 'article' for a tool card. */
  as?: ElementType
  variant?: CardVariant
  padding?: CardPadding
  className?: string
  children: ReactNode
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-surface border border-line shadow-soft',
  raised: 'bg-surface border border-line shadow-lift',
  tile: 'bg-surface border border-line shadow-soft hover:shadow-lift',
  soft: 'bg-surface-muted border border-line',
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6 sm:p-8',
}

/**
 * Presentational container. Cards never pretend to be interactive — any
 * action inside (Open, pin, edit) is an explicit Button/IconButton, so a
 * dysregulated user is never surprised by an accidental whole-card tap.
 */
export function Card({
  as: Component = 'div',
  variant = 'default',
  padding = 'md',
  className,
  children,
}: CardProps) {
  return (
    <Component className={cx('rounded-xl', variantClasses[variant], paddingClasses[padding], className)}>
      {children}
    </Component>
  )
}
