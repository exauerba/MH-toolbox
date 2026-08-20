import { useEffect, useState } from 'react'

export type Breakpoint = 'small' | 'desktop' | 'large'

/**
 * Mirrors the Tailwind breakpoints used across steady (`md` = 768px,
 * `xl` = 1280px) so layout math can pick proportional sizes. Returns
 * 'small' | 'desktop' | 'large'. In jsdom (no matchMedia) this is 'small'.
 */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return 'small'
    if (window.matchMedia('(min-width: 1280px)').matches) return 'large'
    if (window.matchMedia('(min-width: 768px)').matches) return 'desktop'
    return 'small'
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const md = window.matchMedia('(min-width: 768px)')
    const xl = window.matchMedia('(min-width: 1280px)')
    const apply = () => {
      if (xl.matches) setBp('large')
      else if (md.matches) setBp('desktop')
      else setBp('small')
    }
    apply()
    md.addEventListener('change', apply)
    xl.addEventListener('change', apply)
    return () => {
      md.removeEventListener('change', apply)
      xl.removeEventListener('change', apply)
    }
  }, [])

  return bp
}
