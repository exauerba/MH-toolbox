import { useId } from 'react'
import type { IconName } from '../icons'
import { Icon } from '../icons'
import { cx } from '../cx'

export interface SegmentedOption {
  value: string
  label: string
  icon?: IconName
}

export interface SegmentedControlProps {
  options: SegmentedOption[]
  value: string
  onChange: (value: string) => void
  /** Accessible name for the group, e.g. "Theme" or "Crisis region". */
  label: string
  disabled?: boolean
  /** Cozy 16-bit mode — render option icons as pixel sprites. */
  pixel?: boolean
  className?: string
}

/**
 * Tab-like segmented control (theme / region switching). Uses real radio
 * inputs inside a radiogroup, so arrow-key navigation, focus management and
 * screen-reader state all come from the browser. The selected option is
 * announced by the label — never colour-alone.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  label,
  disabled,
  pixel,
  className,
}: SegmentedControlProps) {
  const groupId = useId()
  const name = `segmented-${groupId}`

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx('inline-flex w-full rounded-full border border-line bg-surface-muted p-1', className)}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <label
            key={option.value}
            className={cx(
              'relative flex min-h-11 flex-1 cursor-pointer select-none items-center justify-center gap-2 rounded-full px-3 text-sm font-bold transition-colors',
              selected ? 'bg-surface text-ink shadow-soft' : 'text-ink-soft hover:text-ink',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.icon && (
              <Icon
                name={option.icon}
                size={16}
                pixel={pixel}
                aria-hidden={true}
                filled={selected && option.icon === 'star'}
              />
            )}
            {option.label}
            {selected && <span className="sr-only">(selected)</span>}
          </label>
        )
      })}
    </div>
  )
}
