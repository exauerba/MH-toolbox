/**
 * steady design system — public API.
 *
 * Feature work packages import tokens, icons, and primitives from here.
 * Everything in `src/design` is owned by the design-direction work package;
 * feature code should consume this barrel and never invent colours, spacing,
 * motion, or copy.
 */

export * from './tokens'
export { usePrefersReducedMotion, useSyncReducedMotion, syncReducedMotionAttribute } from './motion'
export { Icon } from './icons'
export type { IconName } from './icons'
export * from './primitives'
export { cx } from './cx'
