import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { colors, colorsDark, motion, radius, shadow, spacing, touchMin, typography, zonePalette } from './tokens'

/**
 * Guarantees the JS token module stays in sync with the CSS custom
 * properties in src/index.css. Feature code reads tokens.ts; the CSS
 * utilities read index.css — if they drift, the design breaks silently.
 */
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

function collectValues(obj: unknown, values: string[] = []): string[] {
  for (const value of Object.values(obj as Record<string, unknown>)) {
    if (typeof value === 'string') {
      if (value.includes('#') || value.includes('cubic-bezier') || value.endsWith('ms')) {
        values.push(value)
      }
    } else if (value && typeof value === 'object') {
      collectValues(value, values)
    }
  }
  return values
}

describe('design tokens', () => {
  it('every JS color value exists in index.css', () => {
    const missing = collectValues(colors).filter((hex) => !css.includes(hex))
    expect(missing).toEqual([])
  })

  it('every dark-mode JS color value exists in index.css', () => {
    const missing = collectValues(colorsDark).filter((hex) => !css.includes(hex))
    expect(missing).toEqual([])
  })

  it('typography, radius, shadow, motion and touch values exist in index.css', () => {
    const norm = (value: string) => value.replace(/\s+/g, ' ').trim()
    const cssNorm = norm(css)

    expect(cssNorm).toContain(norm(typography.fontFamily))

    const scaleMissing = collectValues(typography.scale).filter((value) => !css.includes(value))
    expect(scaleMissing).toEqual([])

    const missing = [
      ...Object.values(radius),
      ...Object.values(shadow),
      ...Object.values(motion.durations),
      ...Object.values(motion.easings),
      touchMin,
    ].filter((value) => !css.includes(value))
    expect(missing).toEqual([])
  })

  it("spacing scale is documented on Tailwind's functional base", () => {
    // Spacing is Tailwind's functional scale (multiples of 0.125rem = 2px);
    // tokens.ts documents it for JS consumers. Every documented step must
    // resolve to a whole number of 2px units.
    for (const [name, value] of Object.entries(spacing)) {
      if (value === '0') continue
      expect(value).toMatch(/^\d+(\.\d+)?rem$/)
      const px = parseFloat(value) * 16
      expect(px / 2, `spacing-${name} must be a multiple of 2px`).toBe(Math.round(px / 2))
    }
  })

  it('zone palette colors exist in index.css', () => {
    const missing = Object.values(zonePalette).filter((hex) => !css.includes(hex))
    expect(missing).toEqual([])
  })

  it('reduced-motion kill-switches are present in index.css', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('transition-duration: 0.01ms !important')
    expect(css).toContain('html[data-reduced-motion]')
  })
})
