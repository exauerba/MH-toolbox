import type { IconName } from '../design';

/**
 * The steady toolbox — a single source of truth for what tools exist,
 * what they look like, and where they live. The hub renders straight
 * from this array; new tools are one entry here plus a route in AppShell.
 */

export type ToolId = 'jar' | 'bloom' | 'timeline' | 'more';

export type ToolAccent = 'hub' | 'bloom' | 'jar' | 'timeline';

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
}

export const BLOOM_URL = 'https://exauerba.github.io/pink-mood-tracker/';

/** Accent → tile classes, mirroring toolAccents in design tokens. */
export const accentTileClass: Record<ToolAccent, string> = {
  hub: 'bg-brand-100 text-brand-700 dark:bg-brand-300/20 dark:text-brand-300',
  bloom: 'bg-bloom-100 text-bloom-700 dark:bg-bloom-300/20 dark:text-bloom-300',
  jar: 'bg-jar-100 text-jar-700 dark:bg-jar-300/20 dark:text-jar-300',
  timeline:
    'bg-timeline-100 text-timeline-700 dark:bg-timeline-300/20 dark:text-timeline-300',
};

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
    id: 'more',
    name: 'More tools soon',
    tagline: 'The toolbox grows as you need it.',
    description: 'New tools arrive as they earn their place here.',
    icon: 'sparkle',
    accent: 'hub',
    comingSoon: true,
  },
];

export const DEFAULT_PINS: ToolId[] = ['jar', 'bloom'];

export const toolById = (id: ToolId): ToolConfig =>
  TOOLS.find((tool) => tool.id === id) ?? TOOLS[0];
