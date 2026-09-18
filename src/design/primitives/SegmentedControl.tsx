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
  /**
   * Reflow into a two-column grid below `sm`, returning to a single row from
   * `sm` up. Use it when four or more options (or long labels) would otherwise
   * overflow a phone-width card — a one-row control cannot shrink past its
   * longest word, so it would spill out of the card and clip.
   */
  wrap?: boolean
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
  wrap,
  className,
}: SegmentedControlProps) {
  const groupId = useId()
  const name = `segmented-${groupId}`

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx(
        'w-full bg-surface-muted',
        wrap
          ? 'grid grid-cols-2 gap-1 [&>label:last-child:nth-child(odd)]:col-span-2 sm:flex sm:gap-0'
          : 'inline-flex',
        pixel
          ? 'rounded-none border-2 border-line-strong p-0.5'
          : wrap
            ? 'rounded-3xl border border-line p-1 sm:rounded-full'
            : 'rounded-full border border-line p-1',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <label
            key={option.value}
            className={cx(
              'relative flex min-h-11 flex-1 cursor-pointer select-none items-center justify-center gap-2 px-3 text-sm font-bold transition-colors duration-[var(--dur-quick)]',
              'focus-within:ring-2 focus-within:ring-focus focus-within:ring-inset',
              pixel ? 'rounded-none' : 'rounded-full',
              selected
                ? pixel
                  ? 'bg-parchment text-ink shadow-pixel-sm'
                  : 'bg-surface text-ink shadow-soft'
                : 'text-ink-soft hover:text-ink',
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
                // In the wrapped grid the labels alone carry the meaning, and
                // the icon would push long labels ("Medications") onto a second
                // line. It comes back with the single row at `sm`.
                className={cx(wrap && 'hidden sm:block')}
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
