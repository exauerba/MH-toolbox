import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../cx'

export type ChipTone =
  | 'neutral'
  | 'brand'
  | 'jar'
  | 'timeline'
  | 'bloom'
  | 'low'
  | 'overdrawn'

export interface ChipProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'onClick' | 'onToggle'> {
  tone?: ChipTone
  /** Leading icon (optional). */
  icon?: ReactNode
  /** Renders the chip as a toggleable button (44px-tall hit area). */
  selected?: boolean
  onToggle?: (selected: boolean) => void
}

const toneClasses: Record<ChipTone, string> = {
  neutral: 'bg-surface-muted text-ink-soft border border-line',
  brand: 'bg-brand-600 text-white border border-brand-600',
  jar: 'bg-jar-100 text-jar-700 border border-jar-200 dark:bg-jar-300/20 dark:text-jar-300',
  timeline: 'bg-timeline-100 text-timeline-700 border border-timeline-200 dark:bg-timeline-300/20 dark:text-timeline-300',
  bloom: 'bg-bloom-100 text-bloom-700 border border-bloom-200 dark:bg-bloom-300/20 dark:text-bloom-300',
  low: 'bg-low-soft text-low-ink border border-low-line',
  overdrawn: 'bg-overdrawn-soft text-overdrawn-ink border border-overdrawn-line',
}

const baseClasses =
  'inline-flex items-center gap-1.5 rounded-full px-3.5 text-sm font-bold whitespace-nowrap'

/**
 * A small pill. Non-interactive chips are compact plain labels (timeline
 * tags, jar state labels). When `onToggle` is provided the chip becomes a
 * filter button: it grows to a 44px hit area and announces its `aria-pressed`
 * state — never colour-alone, the label always carries the meaning.
 */
export function Chip({
  tone = 'neutral',
  icon,
  selected = false,
  onToggle,
  className,
  children,
  ...rest
}: ChipProps) {
  const visual = cx(baseClasses, toneClasses[tone], className)

  if (onToggle) {
    return (
      <button
        type="button"
        className={cx(visual, 'min-h-11 pressable', selected && 'ring-2 ring-focus/60 ring-offset-2 ring-offset-canvas')}
        aria-pressed={selected}
        onClick={() => onToggle(!selected)}
        {...rest}
      >
        {icon}
        {children}
      </button>
    )
  }

  return (
    <span className={visual} {...rest}>
      {icon}
      {children}
    </span>
  )
}
