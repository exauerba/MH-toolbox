import type { IconName } from '../icons'
import { Icon } from '../icons'
import { cx } from '../cx'

export type TileAccent = 'hub' | 'bloom' | 'jar' | 'timeline' | 'warning'

const tileAccentClass: Record<TileAccent, string> = {
  hub: 'bg-brand-100 text-brand-700 dark:bg-brand-300/20 dark:text-brand-300',
  bloom: 'bg-bloom-100 text-bloom-700 dark:bg-bloom-300/20 dark:text-bloom-300',
  jar: 'bg-jar-100 text-jar-700 dark:bg-jar-300/20 dark:text-jar-300',
  timeline: 'bg-timeline-100 text-timeline-700 dark:bg-timeline-300/20 dark:text-timeline-300',
  warning: 'bg-warning-soft text-warning-ink',
}

interface TileProps {
  icon: IconName
  accent?: TileAccent
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  label?: string
}

export function Tile({ icon, accent = 'hub', size = 'md', className, label }: TileProps) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      className={cx(
        'pixel-tile flex items-center justify-center rounded-none',
        size === 'sm' && 'size-8',
        size === 'md' && 'size-10',
        size === 'lg' && 'size-12',
        size === 'xl' && 'size-16',
        tileAccentClass[accent],
        className,
      )}
    >
      <Icon
        name={icon}
        size={size === 'sm' ? 16 : size === 'md' ? 20 : size === 'lg' ? 24 : 32}
        pixel
      />
    </span>
  )
}

export type { TileProps }
