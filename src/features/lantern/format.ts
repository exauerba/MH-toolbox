import type { LanternLevel, LanternScale } from '../../data/types'

/**
 * Plain-text rendering of a scale — the "copy as text" share format.
 * Reads well in a text message: no markdown, no emoji, no styling.
 */

export function formatLevelForText(level: LanternLevel): string {
  const lines = [`${level.position}. ${level.label}`, `   ${level.description}`]
  if (level.actions.length > 0) {
    lines.push(`   What helps: ${level.actions.join('; ')}`)
  }
  return lines.join('\n')
}

export function formatScaleForText(scale: LanternScale): string {
  const header = `${scale.name} — where I am, and what helps`
  const body = [...scale.levels]
    .sort((a, b) => a.position - b.position)
    .map(formatLevelForText)
    .join('\n\n')
  return `${header}\n\n${body}`
}