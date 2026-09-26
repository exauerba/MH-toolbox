import type { LanternScaleInput } from '../../data/types'

/**
 * The seeded default Lantern scale — 10 levels of distress/activation,
 * from "Grounded" to "Not safe alone". Warm, non-clinical, first-person
 * descriptions ("what this looks like for me") and imperative actions
 * ("what helps right now", addressed to the person supporting).
 *
 * Fully editable in-app; this is only the first-open seed.
 */

export const STARTER_SCALE_NAME = 'My Lantern'

export interface StarterLevelContent {
  label: string
  description: string
  actions: string[]
}

export const STARTER_LEVELS: StarterLevelContent[] = [
  {
    label: 'Grounded',
    description: 'I feel okay. Steady, present, myself.',
    actions: [
      'Nothing needed right now — just being here is enough',
      'A normal hello or check-in is lovely',
    ],
  },
  {
    label: 'Settled',
    description: 'Mostly calm. A little tired or quiet, but fine.',
    actions: [
      'Keep it easy — low-key company is nice',
      "Don't push for conversation",
    ],
  },
  {
    label: 'Slightly off',
    description: 'A small weight. I am a bit restless or low, but I can carry it.',
    actions: [
      'Ask me once how I am — I might say more',
      'A quiet walk or a snack helps',
    ],
  },
  {
    label: 'Uneasy',
    description: "Something is nagging. I'm more on edge than I look.",
    actions: [
      "Don't take my short answers personally",
      'Offer a distraction, or just sit with me',
    ],
  },
  {
    label: 'Struggling',
    description: "I'm working hard to keep it together. Small things feel big.",
    actions: [
      "Lower the stakes — take decisions off my plate",
      "Tell me I don't have to explain myself",
    ],
  },
  {
    label: 'Overwhelmed',
    description: "Too much is coming at once. I can't sort it on my own.",
    actions: [
      'Help me break the next hour into tiny steps',
      'Pick one thing and do it with me',
    ],
  },
  {
    label: 'Spiraling',
    description: "My thoughts are looping and getting louder. I'm losing my grip on calm.",
    actions: [
      'Stay close. Keep your voice low and slow',
      "Don't argue with my thoughts — just be with me",
    ],
  },
  {
    label: 'Fragile',
    description: "I feel like I could crack. I need you to hold the edges.",
    actions: [
      "Take over the practical stuff without asking",
      "Remind me I'm safe and I'm not alone",
    ],
  },
  {
    label: 'In crisis',
    description: "I'm in deep distress. I can't see a way through on my own.",
    actions: [
      "Stay with me. Don't leave me alone right now",
      'Help me call or text a crisis line together',
    ],
  },
  {
    label: "Not safe alone",
    description: "I'm afraid of what I might do. I need someone with me now.",
    actions: [
      'Do not leave me alone. Call 988 or 911 with me',
      'Remove anything I could hurt myself with',
      'Stay until a professional takes over',
    ],
  },
]

/**
 * Builds a fresh, editable starter scale with new ids on every call —
 * safe to seed more than once without colliding.
 */
export function buildStarterScale(): LanternScaleInput {
  return {
    name: STARTER_SCALE_NAME,
    levelCount: STARTER_LEVELS.length,
    levels: STARTER_LEVELS.map((level, i) => ({
      id: crypto.randomUUID(),
      position: i + 1,
      label: level.label,
      description: level.description,
      actions: [...level.actions],
    })),
  }
}