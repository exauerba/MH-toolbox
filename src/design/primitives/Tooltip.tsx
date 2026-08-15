import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { usePrefersReducedMotion } from '../motion'
import { cx } from '../cx'

export interface TooltipProps {
  label: string
  children: ReactNode
  side?: 'top' | 'bottom'
  /** Disable hover/focus affordances when the label is already on-screen. */
  disabled?: boolean
}

/**
 * Accessible tooltip: appears on hover AND keyboard focus, wired with
 * aria-describedby. Shows after a short delay so accidental hovers don't
 * flash text at a tired user; the delay is skipped when reduced motion is
 * preferred or once any tooltip is already showing.
 */
export function Tooltip({ label, children, side = 'top', disabled }: TooltipProps) {
  const id = useId()
  const reduced = usePrefersReducedMotion()
  const [open, setOpen] = useState(false)
  const timer = useRef<number | null>(null)

  const show = () => {
    if (disabled) return
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(true), reduced ? 0 : 400)
  }

  const hide = () => {
    if (timer.current) window.clearTimeout(timer.current)
    setOpen(false)
  }

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cx(
            'pointer-events-none absolute left-1/2 z-30 max-w-56 -translate-x-1/2 whitespace-normal rounded-lg bg-ink px-3 py-2 text-center text-sm font-semibold text-canvas shadow-pop animate-pop-in',
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          {label}
        </span>
      )}
    </span>
  )
}
