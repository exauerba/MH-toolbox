import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from './IconButton'
import { cx } from '../cx'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Optional footer (actions row). */
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function trapTab(event: globalThis.KeyboardEvent, dialog: HTMLElement | null) {
  if (event.key !== 'Tab' || !dialog) return
  const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  )
  if (focusables.length === 0) {
    event.preventDefault()
    return
  }
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  } else if (!dialog.contains(document.activeElement)) {
    event.preventDefault()
    first.focus()
  }
}

const sizeClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' } as const

/**
 * Accessible modal: portal-rendered, focus-trapped (Esc and Tab handled at
 * the document level so no focus target is lost), backdrop-close via a real
 * button, focus restored to the trigger on close, body scroll locked while
 * open. One primary question at a time — a dysregulated user never faces a
 * wall of choices inside a dialog.
 */
export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      restoreRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current
      if (!dialog) return
      const firstFocusable = dialog.querySelector<HTMLElement>(FOCUSABLE)
      if (firstFocusable) firstFocusable.focus()
      else dialog.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      } else {
        trapTab(event, dialogRef.current)
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in sm:items-center sm:p-6">
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Close ${title}`}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[rgb(40_18_12/0.45)] backdrop-blur-[2px]"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          'relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-pop animate-pop-in sm:rounded-2xl',
          sizeClasses[size],
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
          <h2 id={titleId} className="text-xl font-extrabold text-ink">
            {title}
          </h2>
          <IconButton icon="close" label={`Close ${title}`} variant="ghost" onClick={onClose} />
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-3 border-t border-line px-6 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  )
}
