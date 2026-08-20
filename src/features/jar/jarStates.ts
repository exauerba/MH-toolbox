import type { IconName } from '../../design'

export type JarState = 'healthy' | 'low' | 'overdrawn'

export interface StateMeta {
  label: string
  icon: IconName
  copy: string
}

/**
 * The three jar states, always conveyed by icon + label + copy — never
 * colour alone. Shared by the shipped JarScreen and the styleguide JarHero
 * so the copy can never drift between them.
 */
export const STATE_META: Record<JarState, StateMeta> = {
  healthy: {
    label: 'Plenty left',
    icon: 'check',
    copy: 'Plenty left today. Rest when you need it — your spoons are yours.',
  },
  low: {
    label: 'Running low',
    icon: 'gauge',
    copy: 'Running low is okay. Maybe pick the one thing that matters most, and let the rest wait.',
  },
  overdrawn: {
    label: 'Borrowed from tomorrow',
    icon: 'heart',
    copy: "You've used more than today's jar. That's information, not failure — tomorrow starts fresh.",
  },
}
