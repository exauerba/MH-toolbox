import { IconButton } from './IconButton'
import { cx } from '../cx'

export interface StepperProps {
  /** Current numeric value. */
  value: number
  onChange: (value: number) => void
  /** Increment size (0.5 for jar spoons). */
  step?: number
  min?: number
  max?: number
  /** Accessible name for the control group, e.g. "Spoons spent". */
  label: string
  disabled?: boolean
  /** Cozy 16-bit mode — render the increment buttons as pixel icons. */
  pixel?: boolean
  className?: string
}

/** Format 3 → "3" and 2.5 → "2.5", never "3.0". */
function formatStep(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

/**
 * Large-touch incrementer. Both buttons are ≥44px; the value is announced
 * through a live region on every change so a low-energy user never has to
 * do arithmetic. Clamps to [min, max].
 */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = -Infinity,
  max = Infinity,
  label,
  disabled = false,
  pixel,
  className,
}: StepperProps) {
  const atMin = value <= min
  const atMax = value >= max

  const change = (delta: number) => {
    const next = Math.min(max, Math.max(min, Math.round((value + delta) * 10) / 10))
    if (next !== value) onChange(next)
  }

  return (
    <div
      className={cx('inline-flex items-center gap-2', disabled && 'opacity-50', className)}
      aria-label={label}
    >
      <IconButton
        icon="minus"
        label={`Decrease by ${formatStep(step)} — now ${formatStep(value)}`}
        variant="soft"
        round={!pixel}
        pixel={pixel}
        disabled={disabled || atMin}
        onClick={() => change(-step)}
        className={pixel ? 'rounded-none! border-2 border-line-strong shadow-pixel-sm' : undefined}
      />
      <span
        className={cx(
          'min-w-12 text-center text-xl tabular-nums text-ink',
          pixel ? 'font-bold font-display' : 'font-extrabold',
        )}
        role="status"
        aria-live="polite"
      >
        {formatStep(value)}
      </span>
      <IconButton
        icon="plus"
        label={`Increase by ${formatStep(step)} — now ${formatStep(value)}`}
        variant="soft"
        round={!pixel}
        pixel={pixel}
        disabled={disabled || atMax}
        onClick={() => change(step)}
        className={pixel ? 'rounded-none! border-2 border-line-strong shadow-pixel-sm' : undefined}
      />
    </div>
  )
}
