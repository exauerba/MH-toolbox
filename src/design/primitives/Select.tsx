import { useId } from 'react'
import type { SelectHTMLAttributes } from 'react'
import { Icon } from '../icons'
import { cx } from '../cx'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  options: SelectOption[]
  placeholder?: string
}

/**
 * Native select (best keyboard/screen-reader behaviour), styled with a warm
 * chevron. Minimum 44px tall.
 */
export function Select({
  label,
  hint,
  error,
  required,
  options,
  placeholder,
  className,
  id,
  defaultValue,
  value,
  ...rest
}: SelectProps) {
  const autoId = useId()
  const selectId = id ?? autoId
  const hintId = `${selectId}-hint`
  const errorId = `${selectId}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-bold text-ink">
          {label}
          {required && (
            <span aria-hidden="true" className="text-brand-700">
              {' '}
              *
            </span>
          )}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          value={value}
          defaultValue={defaultValue}
          className={cx(
            'min-h-11 w-full appearance-none rounded-xl border bg-surface px-4 pr-11 text-base text-ink shadow-soft transition-colors duration-[var(--dur-quick)]',
            'hover:border-line-strong focus:border-focus focus:outline-none',
            error ? 'border-error-line bg-error-soft focus:border-error-strong' : 'border-line',
            className,
          )}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-ink-soft">
          <Icon name="chevronDown" size={18} />
        </span>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 text-sm font-semibold text-error-ink">
          <Icon name="alert" size={16} />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
