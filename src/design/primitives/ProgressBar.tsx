import { useId } from 'react'
import { cx } from '../cx'

export type ProgressTone = 'default' | 'ok' | 'low' | 'overdrawn'

export interface ProgressBarProps {
  /** 0–100. */
  value: number
  min?: number
  max?: number
  /** Visible label (recommended) — also the accessible name. */
  label?: string
  /** Richer accessible text, e.g. "6 of 12 spoons remaining". */
  valueText?: string
  tone?: ProgressTone
  className?: string
}

const toneClasses: Record<ProgressTone, string> = {
  default: 'bg-brand-500',
  ok: 'bg-success-ink',
  low: 'bg-warning-ink',
  overdrawn: 'bg-overdrawn-strong',
}

/**
 * Read-only progress. Never colour-alone: it is always paired with a text
 * label and an accessible value (the bar is `role="progressbar"`). The fill
 * animates over a calm duration — reduced motion collapses it to a snap,
 * and the label still carries the state.
 */
export function ProgressBar({
  value,
  min = 0,
  max = 100,
  label,
  valueText,
  tone = 'default',
  className,
}: ProgressBarProps) {
  const id = useId()
  const clamped = Math.min(max, Math.max(min, value))
  const pct = max === min ? 0 : ((clamped - min) / (max - min)) * 100

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        {label && (
          <span id={id} className="text-sm font-bold text-ink">
            {label}
          </span>
        )}
        {valueText && <span className="text-sm tabular-nums text-ink-soft">{valueText}</span>}
      </div>
      <div
        role="progressbar"
        aria-labelledby={label ? id : undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-valuetext={valueText}
        className="h-3.5 w-full overflow-hidden rounded-full bg-surface-strong"
      >
        <div
          className={cx('h-full rounded-full', toneClasses[tone])}
          style={{
            width: `${pct}%`,
            transitionProperty: 'width',
            transitionDuration: 'var(--dur-slower)',
            transitionTimingFunction: 'var(--ease-gentle)',
          }}
        />
      </div>
    </div>
  )
}
