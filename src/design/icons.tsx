import type { ReactNode, SVGProps } from 'react'

/**
 * steady icon set — inline SVG, stroke-based, currentColor.
 * Decorative by default (aria-hidden) unless a caller provides an
 * accessible name via `label` (renders role="img" + aria-label).
 */

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName
  size?: number | string
  /** Set true to render the "filled" variant of icons that support it. */
  filled?: boolean
  /** Provide to make the icon meaningful to assistive tech. */
  label?: string
  /**
   * Cozy 16-bit mode — render the hand-authored pixel sprite for this
   * icon when one exists (falls back to the stroke path otherwise).
   * Opt-in so the rest of the app keeps its stroke icons.
   */
  pixel?: boolean
}

export type IconName =
  | 'arrowLeft'
  | 'arrowRight'
  | 'alert'
  | 'calendar'
  | 'check'
  | 'chevronDown'
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronUp'
  | 'close'
  | 'clock'
  | 'download'
  | 'edit'
  | 'external'
  | 'flag'
  | 'grip'
  | 'gauge'
  | 'heart'
  | 'home'
  | 'image'
  | 'info'
  | 'leaf'
  | 'lock'
  | 'menu'
  | 'minus'
  | 'moon'
  | 'plus'
  | 'search'
  | 'settings'
  | 'sparkle'
  | 'spoon'
  | 'star'
  | 'sun'
  | 'success'
  | 'timeline'
  | 'trash'

function strokeProps() {
  return {
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
}

const ICON_PATHS: Record<IconName, (filled: boolean) => ReactNode> = {
  arrowLeft: () => (
    <g {...strokeProps()}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </g>
  ),
  arrowRight: () => (
    <g {...strokeProps()}>
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </g>
  ),
  alert: () => (
    <g {...strokeProps()}>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </g>
  ),
  calendar: () => (
    <g {...strokeProps()}>
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
    </g>
  ),
  check: () => (
    <g {...strokeProps()}>
      <path d="M4 12.5l5 5L20 7" />
    </g>
  ),
  chevronDown: () => (
    <g {...strokeProps()}>
      <path d="M6 9l6 6 6-6" />
    </g>
  ),
  chevronLeft: () => (
    <g {...strokeProps()}>
      <path d="M15 18l-6-6 6-6" />
    </g>
  ),
  chevronRight: () => (
    <g {...strokeProps()}>
      <path d="M9 18l6-6-6-6" />
    </g>
  ),
  chevronUp: () => (
    <g {...strokeProps()}>
      <path d="M18 15l-6-6-6 6" />
    </g>
  ),
  close: () => (
    <g {...strokeProps()}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </g>
  ),
  clock: () => (
    <g {...strokeProps()}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </g>
  ),
  download: () => (
    <g {...strokeProps()}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </g>
  ),
  edit: () => (
    <g {...strokeProps()}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
    </g>
  ),
  external: () => (
    <g {...strokeProps()}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14L21 3" />
    </g>
  ),
  flag: () => (
    <g {...strokeProps()}>
      <path d="M4 21V4" />
      <path d="M4 4h13l-2.5 4L17 12H4" />
      <path d="M2.5 21h4" />
    </g>
  ),
  grip: () => (
    <g {...strokeProps()} strokeWidth="0">
      {[6, 12, 18].map((y) => (
        <g key={y}>
          <circle cx="9" cy={y} r="1.6" fill="currentColor" />
          <circle cx="15" cy={y} r="1.6" fill="currentColor" />
        </g>
      ))}
    </g>
  ),
  gauge: () => (
    <g {...strokeProps()}>
      <path d="M5.5 19a9 9 0 1 1 13 0" />
      <path d="M12 14l3-4" />
    </g>
  ),
  heart: (filled) => (
    <g {...strokeProps()} fill={filled ? 'currentColor' : 'none'}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </g>
  ),
  home: () => (
    <g {...strokeProps()}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
    </g>
  ),
  image: () => (
    <g {...strokeProps()}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </g>
  ),
  info: () => (
    <g {...strokeProps()}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </g>
  ),
  leaf: () => (
    <g {...strokeProps()}>
      <path d="M4 20c0-9 6-14 16-14 0 9-5 14-16 14z" />
      <path d="M4 20c2-8 6-12 12-14" />
    </g>
  ),
  lock: () => (
    <g {...strokeProps()}>
      <rect x="4" y="11" width="16" height="10" rx="3" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </g>
  ),
  menu: () => (
    <g {...strokeProps()}>
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </g>
  ),
  minus: () => (
    <g {...strokeProps()}>
      <path d="M5 12h14" />
    </g>
  ),
  moon: () => (
    <g {...strokeProps()}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
    </g>
  ),
  plus: () => (
    <g {...strokeProps()}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </g>
  ),
  search: () => (
    <g {...strokeProps()}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </g>
  ),
  settings: () => (
    <g {...strokeProps()}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z" />
    </g>
  ),
  sparkle: () => (
    <g {...strokeProps()}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
    </g>
  ),
  spoon: () => (
    <g {...strokeProps()}>
      <path d="M7 8h10l1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
      <path d="M7 8l1-4h8l1 4" />
      <path d="M10 8V4" />
      <path d="M14 8V4" />
    </g>
  ),
  star: (filled) => (
    <g {...strokeProps()} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8l-5.8 3.1 1.1-6.5L2.6 9.8l6.5-.9z" />
    </g>
  ),
  sun: () => (
    <g {...strokeProps()}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </g>
  ),
  success: () => (
    <g {...strokeProps()}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l3 3 5-6" />
    </g>
  ),
  timeline: () => (
    <g {...strokeProps()}>
      <path d="M5 3v18" />
      <path d="M5 6h13l-2 4 2 4H5" />
      <path d="M3 21h4" />
    </g>
  ),
  trash: () => (
    <g {...strokeProps()}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </g>
  ),
}

/**
 * Cozy 16-bit pixel sprites — hand-authored ASCII grids.
 * 'X' = filled pixel, '.' = empty. Icons without a sprite here fall
 * back to their stroke path. `filled` icons render a solid variant;
 * otherwise an outline variant (star, heart) or the single art.
 */
const PIXEL_SPRITES: Partial<Record<IconName, string[] | { solid: string[]; outline: string[] }>> = {
  spoon: [
    '..XXXX..',
    '.XXXXXX.',
    '.XXXXXX.',
    '..XXXX..',
    '...XX...',
    '...XX...',
    '...XX...',
    '........',
  ],
  star: {
    solid: [
      '...XX...',
      '..XXXX..',
      '.XXXXXX.',
      'XXXXXXXX',
      'XXXXXXXX',
      '.XXXXXX.',
      '..XXXX..',
      '...XX...',
    ],
    outline: [
      '...XX...',
      '..X..X..',
      '.X....X.',
      'X......X',
      'X......X',
      '.X....X.',
      '..X..X..',
      '...XX...',
    ],
  },
  heart: {
    solid: [
      '.XX..XX.',
      'XXXXXXXX',
      'XXXXXXXX',
      'XXXXXXXX',
      '.XXXXXX.',
      '..XXXX..',
      '...XX...',
      '........',
    ],
    outline: [
      '.XX..XX.',
      'X.XX.XX.',
      'X......X',
      'X......X',
      '.X....X.',
      '..X..X..',
      '...XX...',
      '........',
    ],
  },
  sparkle: [
    '...X....',
    '..XXX...',
    '.XXXXX..',
    'XXXXXXX.',
    '.XXXXX..',
    '..XXX...',
    '...X....',
    '........',
  ],
  timeline: [
    '.X......',
    '.X......',
    '.XXXXXX.',
    '..X.....',
    '..XXXX..',
    '....X...',
    '....X...',
    '........',
  ],
  grip: [
    'XX..XX..',
    'XX..XX..',
    '........',
    'XX..XX..',
    'XX..XX..',
    '........',
    'XX..XX..',
    'XX..XX..',
  ],
  arrowLeft: [
    '.....X..',
    '....XX..',
    '...XXX..',
    'XXXXXXX.',
    'XXXXXXX.',
    '...XXX..',
    '....XX..',
    '.....X..',
  ],
  arrowRight: [
    '..X.....',
    '..XX....',
    '..XXX...',
    '.XXXXXXX',
    '.XXXXXXX',
    '..XXX...',
    '..XX....',
    '..X.....',
  ],
  external: [
    '......XX',
    '.....XX.',
    '...XXXX.',
    '...X..X.',
    '..X...X.',
    '.X....X.',
    'X.....X.',
    'XXXXXXX.',
  ],
  plus: [
    '...XX...',
    '...XX...',
    '...XX...',
    'XXXXXXXX',
    'XXXXXXXX',
    '...XX...',
    '...XX...',
    '...XX...',
  ],
  close: [
    'XX....XX',
    '.XX..XX.',
    '..XXXX..',
    '...XX...',
    '...XX...',
    '..XXXX..',
    '.XX..XX.',
    'XX....XX',
  ],
  check: [
    '........',
    '........',
    '........',
    'XX......',
    'X.XX....',
    'X..XX...',
    'X...XXXX',
    '........',
  ],
  gauge: [
    '..XXXX..',
    '.XXXXXX.',
    'X.XX...X',
    'X..XX..X',
    'X...XX.X',
    'X....XXX',
    '.XXXXXX.',
    '........',
  ],
  edit: [
    '.....XX.',
    '....XXX.',
    '...XXX..',
    '..XXX...',
    '.XXX....',
    'XX......',
    '........',
    '........',
  ],
  trash: [
    '..XXXX..',
    '.XXXXXX.',
    'XXXXXXXX',
    'XX.XX.XX',
    'XX.XX.XX',
    'XX.XX.XX',
    '.XXXXXX.',
    '........',
  ],
}

export function Icon({ name, size = 20, filled = false, pixel = false, label, ...rest }: IconProps) {
  const sprite = PIXEL_SPRITES[name]
  const rows =
    sprite == null ? null : Array.isArray(sprite) ? sprite : filled ? sprite.solid : sprite.outline

  if (pixel && rows) {
    const height = rows.length
    const width = rows[0].length
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={size}
        height={size}
        focusable="false"
        shapeRendering="crispEdges"
        aria-hidden={label ? undefined : true}
        role={label ? 'img' : undefined}
        aria-label={label}
        data-icon={name}
        {...rest}
      >
        {rows.map((row, y) =>
          row.split('').map((cell, x) =>
            cell === 'X' ? (
              <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
            ) : null,
          ),
        )}
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      focusable="false"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      data-icon={name}
      {...rest}
    >
      {ICON_PATHS[name](filled)}
    </svg>
  )
}
