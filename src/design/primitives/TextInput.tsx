import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { Icon } from '../icons'
import { cx } from '../cx'

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  /** Error message. Renders the field in an error state (never colour-alone). */
  error?: string
  required?: boolean
  leadingIcon?: ReactNode
  trailingSlot?: ReactNode
}

/**
 * Text field with an associated label, hint and error text. The error is
 * always announced (aria-describedby + aria-invalid) and rendered with an
 * icon — never colour alone. Minimum 44px tall.
 */
export function TextInput({
  label,
  hint,
  error,
  required,
  leadingIcon,
  trailingSlot,
  className,
  id,
  ...rest
}: TextInputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-bold text-ink">
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
        {leadingIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-soft">
            {leadingIcon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={cx(
            'min-h-11 w-full rounded-xl border bg-surface px-4 text-base text-ink shadow-soft transition-colors duration-[var(--dur-quick)]',
            'placeholder:text-ink-faint hover:border-line-strong focus:border-focus focus:outline-none',
            leadingIcon ? 'pl-11' : '',
            trailingSlot ? 'pr-11' : '',
            error
              ? 'border-error-line bg-error-soft focus:border-error-strong'
              : 'border-line',
            className,
          )}
          {...rest}
        />
        {trailingSlot && (
          <span className="absolute inset-y-0 right-2 flex items-center">{trailingSlot}</span>
        )}
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
