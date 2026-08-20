import { useId } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { Icon } from '../icons'
import { cx } from '../cx'

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
  required?: boolean
}

/**
 * Multi-line text field with label / hint / error, identical contract to
 * TextInput. Generous default rows — journaling beats one-liners here.
 */
export function TextArea({
  label,
  hint,
  error,
  required,
  className,
  id,
  rows = 4,
  ...rest
}: TextAreaProps) {
  const autoId = useId()
  const areaId = id ?? autoId
  const hintId = `${areaId}-hint`
  const errorId = `${areaId}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={areaId} className="text-sm font-bold text-ink">
          {label}
          {required && (
            <span aria-hidden="true" className="text-brand-700">
              {' '}
              *
            </span>
          )}
        </label>
      )}
      <textarea
        id={areaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        className={cx(
          'w-full rounded-xl border bg-surface px-4 py-3 text-base leading-relaxed text-ink shadow-soft transition-colors duration-[var(--dur-quick)]',
          'placeholder:text-ink-faint hover:border-line-strong focus:border-focus focus:outline-none',
          'resize-y',
          error ? 'border-error-line bg-error-soft focus:border-error-strong' : 'border-line',
          className,
        )}
        {...rest}
      />
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
