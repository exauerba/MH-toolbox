/**
 * steady — design tokens for JS consumers.
 *
 * This module mirrors the CSS custom properties declared in `src/index.css`
 * (Tailwind v4 `@theme`). It exists so feature code can reference tokens in
 * JS — inline styles, SVG fills, chart colors — without inventing values.
 *
 * `src/design/tokens.test.ts` asserts this module stays in sync with the CSS.
 * When you change a value here, change it in index.css too (and vice versa).
 */

export const colors = {
  /* Warm neutrals */
  canvas: '#faf6f1',
  canvasDeep: '#f4ede6',
  surface: '#fffdfa',
  surfaceMuted: '#f6efe9',
  surfaceStrong: '#ece1d8',
  ink: '#44332c',
  inkSoft: '#6b5649',
  inkFaint: '#99837a',
  line: '#e7dbd2',
  lineStrong: '#d8c6ba',
  focus: '#b04a33',
  overlay: 'rgb(40 18 12 / 0.45)',

  /* Cozy 16-bit skin — earthy accents (hub & jar) */
  parchment: '#f1e8d5',
  moss: { 100: '#e7ebd3', 300: '#b6bd85', 500: '#828a4e', 600: '#656d38', 700: '#4c5226' },
  walnut: { 100: '#e9dfd0', 300: '#c9ae8f', 500: '#97724d', 600: '#74552f', 700: '#553c1f' },

  /* Brand — warm rose / terracotta (steady hub) */
  brand: {
    50: '#fdf5f1',
    100: '#fae9e2',
    200: '#f5d2c6',
    300: '#ecb19e',
    400: '#de8d74',
    500: '#c56a4f',
    600: '#a24d35',
    700: '#6f3020',
    800: '#562719',
    900: '#3e1d13',
  },

  /* bloom — its own hexes, for a seamless hand-off */
  bloom: {
    tint: '#fdf1f5',
    100: '#fde7f1',
    200: '#f8d4e3',
    300: '#f6a8cd',
    400: '#f472b6',
    500: '#e0579f',
    600: '#a84f6b',
    700: '#5c2f3d',
    900: '#4d3c42',
  },

  /* Energy Jar — warm honey / amber */
  jar: {
    50: '#fdf5e7',
    100: '#fbeccb',
    200: '#f6d795',
    300: '#eebc5d',
    400: '#e19e33',
    500: '#c67f1e',
    600: '#a05f12',
    700: '#7a470e',
    800: '#573307',
    900: '#3f2505',
  },

  /* Personal Timeline — warm sage */
  timeline: {
    50: '#eef3ec',
    100: '#dde7d8',
    200: '#c4d5bb',
    300: '#a7c09d',
    400: '#87a47c',
    500: '#719061',
    600: '#55714a',
    700: '#3f5637',
    800: '#2f4229',
    900: '#23301f',
  },

  /* Status (never color-alone: always icon + label + pattern) */
  info: { ink: '#3d6286', soft: '#e9eff6', line: '#c2d0e0', strong: '#2d4a68' },
  success: { ink: '#2f6b46', soft: '#e7f1e6', line: '#bdd7be', strong: '#24533a' },
  warning: { ink: '#8a5d12', soft: '#faf0d9', line: '#ecd9a4', strong: '#6b4709' },
  error: { ink: '#a92e22', soft: '#fce8e6', line: '#efbeb8', strong: '#87251c' },

  /* Jar states — semantic aliases of the status families */
  healthy: { ink: '#2f6b46', soft: '#e7f1e6', line: '#bdd7be' },
  low: { ink: '#8a5d12', soft: '#faf0d9', line: '#ecd9a4' },
  overdrawn: { ink: '#9c3f2e', soft: '#fbeae4', line: '#ecc4b4', strong: '#7d2f20' },

  /* Timeline zone picker extras */
  lavender: '#674195',
  slate: '#4a5a6a',
} as const

/** Dark-theme values for the same semantic names (mirrors `.dark` block). */
export const colorsDark = {
  canvas: '#1a1410',
  canvasDeep: '#241c16',
  surface: '#221b16',
  surfaceMuted: '#2b231d',
  surfaceStrong: '#352b24',
  ink: '#f3eae3',
  inkSoft: '#cdbab0',
  inkFaint: '#a0897e',
  line: '#362c25',
  lineStrong: '#463a31',
  focus: '#f0a48f',
  overlay: 'rgb(0 0 0 / 0.6)',
  /* Cozy 16-bit skin — earthy accents (dark) */
  parchment: '#2b241b',
  moss: { 200: '#8f9664', 300: '#a9b078' },
  walnut: { 200: '#a98c6b', 300: '#c0a98d' },
  brand: { 300: '#ecb19e', 400: '#de8d74', 500: '#c56a4f' },
  jar: { 200: '#f6d795', 300: '#eebc5d', 400: '#e19e33' },
  timeline: { 200: '#c4d5bb', 300: '#a7c09d' },
  bloom: { 200: '#f8d4e3', 300: '#f6a8cd' },
  info: { ink: '#a8c3e0', soft: '#1c2833', line: '#2a3d52' },
  success: { ink: '#a9d0ae', soft: '#24301f', line: '#3a5335' },
  warning: { ink: '#e6c07a', soft: '#332a17', line: '#5a4a1e' },
  error: { ink: '#f0a8a1', soft: '#381c18', line: '#5e2a24' },
  healthy: { ink: '#a9d0ae', soft: '#24301f', line: '#3a5335' },
  low: { ink: '#e6c07a', soft: '#332a17', line: '#5a4a1e' },
  overdrawn: { ink: '#eead9e', soft: '#331f1a', line: '#593227', strong: '#7d2f20' },
} as const

/** Typography. Base is 16px; line-heights are generous (dysregulated readability). */
export const typography = {
  fontFamily:
    "'Nunito', ui-rounded, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  display:
    "'Pixelify Sans', 'Nunito', ui-rounded, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  weights: { regular: 400, semibold: 600, bold: 700, extrabold: 800 },
  baseSize: '1rem',
  scale: {
    '2xs': { size: '0.75rem', lineHeight: '1.5' },
    xs: { size: '0.8125rem', lineHeight: '1.55' },
    sm: { size: '0.875rem', lineHeight: '1.6' },
    base: { size: '1rem', lineHeight: '1.75' },
    lg: { size: '1.125rem', lineHeight: '1.7' },
    xl: { size: '1.25rem', lineHeight: '1.6' },
    '2xl': { size: '1.5rem', lineHeight: '1.5' },
    '3xl': { size: '1.75rem', lineHeight: '1.4' },
    '4xl': { size: '2rem', lineHeight: '1.3' },
    '5xl': { size: '2.5rem', lineHeight: '1.25' },
  },
} as const

/** 4px-based spacing scale (Tailwind's functional spacing). */
export const spacing = {
  0: '0',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const

/** Warm, rounded radii — never clinical. */
export const radius = {
  xs: '0.375rem',
  sm: '0.625rem',
  md: '0.875rem',
  lg: '1.125rem', // bloom's card radius
  xl: '1.5rem',
  full: '9999px',
  pixel: '0.25rem', // cozy 16-bit — stepped corners
} as const

/** Soft, warm-tinted shadows. */
export const shadow = {
  soft: '0 1px 2px rgb(80 44 30 / 0.05), 0 8px 24px -8px rgb(80 44 30 / 0.09)',
  lift: '0 1px 3px rgb(80 44 30 / 0.07), 0 14px 30px -12px rgb(80 44 30 / 0.13)',
  press: '0 1px 1px rgb(80 44 30 / 0.04), 0 3px 8px -4px rgb(80 44 30 / 0.07)',
  pop: '0 24px 48px -12px rgb(40 18 12 / 0.28), 0 4px 16px -8px rgb(40 18 12 / 0.18)',
  pixel: '4px 4px 0 0 rgb(80 44 30 / 0.3)',
  pixelSm: '2px 2px 0 0 rgb(80 44 30 / 0.3)',
} as const

/**
 * Motion. Calm by default; every animation has a zero-motion equivalent.
 *
 * Reduced-motion strategy (read fully):
 * 1. `@media (prefers-reduced-motion: reduce)` in index.css collapses all
 *    animations/transitions to near-instant opacity changes.
 * 2. Components MUST render their final state at rest — motion never
 *    carries meaning. If a state is only visible mid-animation, it is a bug.
 * 3. Long/directional motion (jar pour, card fly-ins) should branch on
 *    `usePrefersReducedMotion()` from `src/design/motion.ts` and simply
 *    place elements in their final position (opacity crossfade at most).
 */
export const motion = {
  durations: {
    fast: '120ms', // press feedback
    quick: '180ms', // tooltips, small hovers
    normal: '240ms', // dropdowns, selects
    slow: '320ms', // modals, drawers
    slower: '400ms', // toasts
    jar: '600ms', // decorative chip pour (motion-allowed only)
    spin: '900ms', // loading spinner — a calm, unhurried rotation
  },
  easings: {
    out: 'cubic-bezier(0.23, 1, 0.32, 1)', // entries & feedback
    inOut: 'cubic-bezier(0.77, 0, 0.175, 1)', // on-screen movement
    gentle: 'cubic-bezier(0.4, 0, 0.6, 1)', // hover/color — bloom's curve
    spring: 'cubic-bezier(0.34, 1.4, 0.64, 1)', // subtle overshoot (chips only)
  },
} as const

/** Minimum interactive target for every control. */
export const touchMin = '44px'

/** Per-tool accent identities — the tool picks one accent family. */
export const toolAccents = {
  hub: { family: 'brand', label: 'steady rose' },
  bloom: { family: 'bloom', label: 'bloom pink' },
  jar: { family: 'jar', label: 'honey' },
  timeline: { family: 'timeline', label: 'sage' },
} as const

/** Timeline zone palette — user-selectable, all AA on canvas. */
export const zonePalette = {
  sage: colors.timeline[700],
  honey: colors.jar[700],
  clay: colors.overdrawn.strong,
  sky: '#3d6286',
  lavender: '#674195',
  rose: colors.brand[700],
  slate: '#4a5a6a',
} as const
