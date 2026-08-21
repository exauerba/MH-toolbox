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
  /** Apply dark-mode colors. Set to false when the chip sits on a panel
   * that stays light in dark mode (e.g. the jar's tinted state banner). */
  dark?: boolean
}

const toneLight: Record<ChipTone, string> = {
  neutral: 'bg-surface-muted text-ink-soft border border-line',
  brand: 'bg-brand-600 text-white border border-brand-600',
  jar: 'bg-jar-100 text-jar-700 border border-jar-200',
  timeline: 'bg-timeline-100 text-timeline-700 border border-timeline-200',
  bloom: 'bg-bloom-100 text-bloom-700 border border-bloom-200',
  low: 'bg-low-soft text-low-ink border border-low-line',
  overdrawn: 'bg-overdrawn-soft text-overdrawn-ink border border-overdrawn-line',
}

/* Ramp-based tones (jar/timeline/bloom) use fixed light colors, so dark
   mode swaps them for translucent fills. Token-based tones (neutral, low,
   overdrawn) re-resolve via the .dark token block and need no override. */
const toneDark: Record<ChipTone, string> = {
  neutral: '',
  brand: '',
  jar: 'dark:bg-jar-300/20 dark:text-jar-300',
  timeline: 'dark:bg-timeline-300/20 dark:text-timeline-300',
  bloom: 'dark:bg-bloom-300/20 dark:text-bloom-300',
  low: '',
  overdrawn: '',
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
  dark = true,
  className,
  children,
  ...rest
}: ChipProps) {
  const visual = cx(baseClasses, toneLight[tone], dark && toneDark[tone], className)

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
