import type { Chart } from 'chart.js'

type BandBandOptions = {
  /** Dataset index whose data the band centres on. */
  targetDatasetIndex: number
}

type RawDotsOptions = {
  /** Dataset index whose data points are dot-drawn. */
  rawDatasetIndex: number
}

function numericValues(data: unknown[]): number[] {
  return data
    .map((d): number => {
      if (typeof d === 'number') return d
      if (d && typeof d === 'object') {
        const o = d as { y?: number }
        if (typeof o.y === 'number') return o.y
      }
      return NaN
    })
    .filter((v) => Number.isFinite(v))
}

/**
 * Shaded mean ± 1SD band drawn behind the datasets (decorative — exact
 * readings always come from the line data and text summaries).
 */
export const normalBandPlugin = {
  id: 'normalBand',
  beforeDatasetsDraw(chart: Chart, _args: unknown, options: BandBandOptions) {
    const { ctx, chartArea } = chart
    if (!chartArea) return
    const meta = chart.getDatasetMeta(options.targetDatasetIndex)
    const yScale = meta.yScale
    if (!yScale) return

    const values = numericValues(chart.data.datasets[options.targetDatasetIndex]?.data ?? [])
    if (values.length < 2) return

    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)

    const top = Math.min(yScale.getPixelForValue(mean + sd), chartArea.bottom)
    const bottom = Math.max(yScale.getPixelForValue(mean - sd), chartArea.top)

    ctx.save()
    ctx.fillStyle = 'rgba(157, 120, 255, 0.14)' // breathe-600 at 14%
    ctx.fillRect(chartArea.left, top, chartArea.width, Math.abs(bottom - top))
    ctx.restore()
  },
}

/**
 * Small raw (un-smoothed) data dots drawn on top of datasets, so individual
 * readings stay visible alongside a rolling-average line.
 */
export const rawDotsPlugin = {
  id: 'rawDots',
  afterDatasetsDraw(chart: Chart, _args: unknown, options: RawDotsOptions) {
    const { ctx } = chart
    const meta = chart.getDatasetMeta(options.rawDatasetIndex)
    if (meta.hidden || !meta.yScale) return

    const values = numericValues(chart.data.datasets[options.rawDatasetIndex]?.data ?? [])

    meta.data.forEach((point, i) => {
      const value = values[i]
      if (typeof value !== 'number') return
      const y = meta.yScale!.getPixelForValue(value)
      ctx.save()
      ctx.beginPath()
      ctx.arc(point.x, y, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(125, 76, 255, 0.85)' // breathe-700 at 85%
      ctx.fill()
      ctx.restore()
    })
  },
}