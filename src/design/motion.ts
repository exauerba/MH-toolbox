import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * True when the user has asked the OS for reduced motion.
 *
 * Components that run long or directional motion should branch on this and
 * render straight to their final state (opacity crossfade at most). The
 * global CSS kill-switch in index.css already collapses all transitions, so
 * this hook is for *logic* that must branch (skipping a pour state machine,
 * not queuing a stagger), not for every animation.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(QUERY)
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}

/**
 * Sets `data-reduced-motion` on <html> to mirror the OS setting, giving the
 * CSS kill-switch a JS-driven hook (used by the styleguide's "simulate
 * reduced motion" toggle and useful for automated tests). Idempotent.
 */
export function syncReducedMotionAttribute(reduced: boolean): void {
  if (typeof document === 'undefined') return
  if (reduced) document.documentElement.setAttribute('data-reduced-motion', '')
  else document.documentElement.removeAttribute('data-reduced-motion')
}

/**
 * A convenience hook: returns the boolean AND keeps the html attribute in
 * sync. Mount once per app (the styleguide mounts it) — component-level
 * consumers should use `usePrefersReducedMotion` alone.
 */
export function useSyncReducedMotion(): boolean {
  const reduced = usePrefersReducedMotion()
  useEffect(() => {
    syncReducedMotionAttribute(reduced)
  }, [reduced])
  return reduced
}
