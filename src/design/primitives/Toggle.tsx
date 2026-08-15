import { useId } from 'react'
import { Icon } from '../icons'
import { cx } from '../cx'

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Visible label beside the switch. If omitted, `ariaLabel` is required. */
  label?: string
  ariaLabel?: string
  description?: string
  disabled?: boolean
  className?: string
}

/**
 * On/off switch (role="switch"). The whole labelled row is one 44px tap
 * target (the label wraps the switch, so a tap on the text toggles it).
 * State is never colour-alone: the knob position shifts AND a check glyph
 * appears in the filled state, and the label always names the setting.
 */
export function Toggle({ checked, onChange, label, ariaLabel, description, disabled, className }: ToggleProps) {
  const autoId = useId()
  const descriptionId = description ? `${autoId}-desc` : undefined
  const accessibleName = label ?? ariaLabel ?? 'toggle'

  return (
    <label className={cx('flex cursor-pointer items-start gap-3', disabled && 'opacity-50', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={accessibleName}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'pressable mt-0.5 flex h-11 w-20 shrink-0 items-center rounded-full border-2 px-1',
          checked ? 'justify-end border-brand-600 bg-brand-600' : 'justify-start border-line-strong bg-surface-strong',
          'disabled:cursor-not-allowed',
        )}
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-white text-brand-700 shadow-press">
          <Icon name="check" size={15} className={checked ? '' : 'opacity-0'} />
        </span>
      </button>
      {(label || description) && (
        <span className="min-w-0">
          <span className="block text-base font-bold text-ink">{label}</span>
          {description && (
            <span id={descriptionId} className="block text-sm text-ink-soft">
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  )
}
