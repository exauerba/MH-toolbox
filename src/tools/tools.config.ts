import type { IconName } from '../design';

/**
 * The steady toolbox — a single source of truth for what tools exist,
 * what they look like, and where they live. The hub renders straight
 * from this array; new tools are one entry here plus a route in AppShell.
 */

export type ToolId = 'jar' | 'bloom' | 'timeline' | 'more' | 'breathe' | 'lantern';

export type ToolAccent = 'hub' | 'bloom' | 'jar' | 'timeline' | 'breathe' | 'lantern';

export interface ToolConfig {
  id: ToolId;
  name: string;
  tagline: string;
  /** Longer one-liner used on the directory cards. */
  description: string;
  icon: IconName;
  accent: ToolAccent;
  /** In-app route. Omitted for external tools. */
  route?: string;
  /** Same-tab hand-off target for external tools. */
  externalUrl?: string;
  pinnedByDefault?: boolean;
  comingSoon?: boolean;
  /** Marks the tool as beta on the hub cards. */
  beta?: boolean;
}

export const BLOOM_URL = 'https://exauerba.github.io/pink-mood-tracker/';

export const TOOLS: ToolConfig[] = [
  {
    id: 'jar',
    name: 'Energy Jar',
    tagline: 'Spoon-theory tracker — see your energy at a glance.',
    description:
      'Your spoons for the day, kept in one place. Quick-add, gentle limits, and a jar you can actually see.',
    icon: 'jar',
    accent: 'jar',
    route: '/tools/jar',
    pinnedByDefault: true,
  },
  {
    id: 'bloom',
    name: 'Mood & Symptom Tracker',
    tagline: 'Your daily check-ins and patterns, in bloom.',
    description:
      'A calm daily check-in and the patterns it grows into — in the same warm tones as steady.',
    icon: 'sparkle',
    accent: 'bloom',
    externalUrl: BLOOM_URL,
    pinnedByDefault: true,
  },
    {
      id: 'timeline',
      name: 'Personal Timeline',
      tagline: 'Build the story of your life, one zone at a time.',
      description:
        'Moments, zones, and the shape of your own story — your words, your colours, never shared.',
      icon: 'timeline',
      accent: 'timeline',
      route: '/tools/timeline',
    },
    {
      id: 'breathe',
      name: 'Breathe',
      tagline: 'Guided breathing exercises for calm and focus.',
      description:
        'Simple breathing exercises to help you find calm, reduce stress, and improve focus.',
      icon: 'wind',
      accent: 'breathe',
      route: '/tools/breathe',
      pinnedByDefault: true,
      beta: true,
    },
    {
      id: 'lantern',
      name: 'Lantern',
      tagline: 'A scale of distress, and what helps — for the people who love you.',
      description:
        'Name where you are on your own scale, and hand your people the exact words and actions that help in the moment.',
      icon: 'lantern',
      accent: 'lantern',
      route: '/tools/lantern',
      pinnedByDefault: true,
    },
    {
      id: 'more',
      name: 'More tools soon',
      tagline: 'The toolbox grows as you need it.',
      description: 'New tools arrive as they earn their place here.',
      icon: 'sparkle',
      accent: 'hub',
      comingSoon: true,
    },
];

export const DEFAULT_PINS: ToolId[] = TOOLS.filter((tool) => tool.pinnedByDefault).map((tool) => tool.id);

export const toolById = (id: ToolId): ToolConfig =>
  TOOLS.find((tool) => tool.id === id) ?? TOOLS[0];
