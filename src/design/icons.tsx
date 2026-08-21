import type { ReactNode, SVGProps } from 'react'
import { PIXEL_SPRITES } from './pixelSprites'

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
  | 'arrowUp'
  | 'arrowDown'
  | 'battery'
  | 'brain'
  | 'alert'
  | 'calendar'
  | 'chip'
  | 'check'
  | 'chevronDown'
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronUp'
  | 'close'
  | 'clock'
  | 'cloud'
  | 'copy'
  | 'download'
  | 'droplet'
  | 'edit'
  | 'external'
  | 'filter'
  | 'flower'
  | 'flag'
  | 'grip'
  | 'gauge'
  | 'heart'
  | 'help'
  | 'home'
  | 'image'
  | 'info'
  | 'jar'
  | 'leaf'
  | 'lock'
  | 'logout'
  | 'menu'
  | 'message'
  | 'more-horizontal'
  | 'minus'
  | 'moon'
  | 'phone'
  | 'plus'
  | 'refresh'
  | 'save'
  | 'search'
  | 'settings'
  | 'share'
  | 'shield'
  | 'smile'
  | 'sparkle'
  | 'spoon'
  | 'star'
  | 'sun'
  | 'thermometer'
  | 'success'
  | 'timeline'
  | 'trash'
  | 'undo'
  | 'user'
  | 'zzz'

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
  arrowUp: () => (
    <g {...strokeProps()}>
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </g>
  ),
  arrowDown: () => (
    <g {...strokeProps()}>
      <path d="M12 5v14" />
      <path d="M19 12l-7 7-7-7" />
    </g>
  ),
  battery: () => (
    <g {...strokeProps()}>
      <rect x="2" y="7" width="18" height="10" rx="2" />
      <path d="M22 11v2" />
      <path d="M6 10v4" />
      <path d="M10 10v4" />
      <path d="M14 10v4" />
    </g>
  ),
  brain: () => (
    <g {...strokeProps()}>
      <path d="M9 3a3 3 0 0 0-3 3c0 .3 0 .6.1.9A3 3 0 0 0 4 9.5c0 .6.2 1.1.5 1.6A3 3 0 0 0 5 15a3 3 0 0 0 3 2.5c.3.9 1.1 1.6 2 1.9V5.5A2.5 2.5 0 0 0 9 3z" />
      <path d="M15 3a3 3 0 0 1 3 3c0 .3 0 .6-.1.9A3 3 0 0 1 20 9.5c0 .6-.2 1.1-.5 1.6a3 3 0 0 1 .5 3.9 3 3 0 0 1-3 2.5c-.3.9-1.1 1.6-2 1.9V5.5A2.5 2.5 0 0 1 15 3z" />
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
  chip: () => (
    <g {...strokeProps()}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
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
  cloud: () => (
    <g {...strokeProps()}>
      <path d="M17.5 19H6a4 4 0 0 1-.6-8A5 5 0 0 1 15 7.5 4.5 4.5 0 0 1 17.5 19z" />
    </g>
  ),
  copy: () => (
    <g {...strokeProps()}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </g>
  ),
  download: () => (
    <g {...strokeProps()}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </g>
  ),
  droplet: () => (
    <g {...strokeProps()}>
      <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />
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
  filter: () => (
    <g {...strokeProps()}>
      <path d="M3 5h18l-7 8v6l-4 2v-8z" />
    </g>
  ),
  flower: () => (
    <g {...strokeProps()}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2a3 3 0 0 1 3 3 3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1 3-3z" />
      <path d="M12 14a3 3 0 0 1 3 3 3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1 3-3z" />
      <path d="M4 7a3 3 0 0 1 3 3 3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1 3-3z" />
      <path d="M20 7a3 3 0 0 1 3 3 3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1 3-3z" />
      <path d="M12 15v6" />
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
  help: () => (
    <g {...strokeProps()}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 2" />
      <path d="M12 17h.01" />
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
  jar: () => (
    <g {...strokeProps()}>
      <path d="M4 4h16" />
      <path d="M5 4v2h14V4" />
      <path d="M7 6h10v13a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3z" />
      <path d="M9 11h6" />
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
  logout: () => (
    <g {...strokeProps()}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </g>
  ),
  menu: () => (
    <g {...strokeProps()}>
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </g>
  ),
  message: () => (
    <g {...strokeProps()}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </g>
  ),
  'more-horizontal': () => (
    <g {...strokeProps()}>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
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
  phone: () => (
    <g {...strokeProps()}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z" />
    </g>
  ),
  plus: () => (
    <g {...strokeProps()}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </g>
  ),
  refresh: () => (
    <g {...strokeProps()}>
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 3v6h-6" />
    </g>
  ),
  save: () => (
    <g {...strokeProps()}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </g>
  ),
  share: () => (
    <g {...strokeProps()}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4" />
      <path d="M15.4 6.5l-6.8 4" />
    </g>
  ),
  shield: () => (
    <g {...strokeProps()}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </g>
  ),
  smile: () => (
    <g {...strokeProps()}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14s1.5 2.5 4 2.5 4-2.5 4-2.5" />
      <path d="M9 9h.01" />
      <path d="M15 9h.01" />
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
  thermometer: () => (
    <g {...strokeProps()}>
      <path d="M14 4a2 2 0 0 0-4 0v9.5a4 4 0 1 0 4 0z" />
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
  undo: () => (
    <g {...strokeProps()}>
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
    </g>
  ),
  user: () => (
    <g {...strokeProps()}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a7 7 0 0 1 14 0v1" />
    </g>
  ),
  zzz: () => (
    <g {...strokeProps()}>
      <path d="M4 12h6l-6 8h6" />
      <path d="M14 4h6l-6 8h6" />
    </g>
  ),
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
            ) : cell === 'x' ? (
              <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" opacity={0.55} />
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

