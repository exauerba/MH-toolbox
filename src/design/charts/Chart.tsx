import { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  LineController,
  BarController,
  LineElement,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  type ChartConfiguration,
  type ChartOptions,
} from 'chart.js'
import { usePrefersReducedMotion } from '../motion'
import { cx } from '../cx'

ChartJS.register(
  LineController,
  BarController,
  LineElement,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
)

export interface ChartProps {
  /** Chart.js configuration (options.animation is overridden for reduced motion). */
  config: ChartConfiguration
  /** Accessible label — charts are never rendered alone, always paired with text. */
  label: string
  className?: string
}

/**
 * Thin Chart.js wrapper. Render-only (no data mutation). Disables animation
 * when the OS prefers reduced motion. Consumers MUST pair every chart with a
 * text summary/sentence — charts are never the only representation.
 */
export function Chart({ config, label, className }: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const options: ChartOptions = {
      ...(config.options ?? {}),
      responsive: true,
      maintainAspectRatio: false,
    }

    if (reduced) {
      options.animation = false as never
    }

    const chart = new ChartJS(canvas, { ...config, options })

    return () => {
      chart.destroy()
    }
  }, [config, reduced])

  return (
    <div className={cx('relative h-64 w-full', className)}>
      <canvas ref={canvasRef} role="img" aria-label={label} />
    </div>
  )
}