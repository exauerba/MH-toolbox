import type { ToolboxRepository } from '../../data/repository'
import { buildStarterScale } from './starterScale'

/**
 * Seeds the starter scale on first open. Idempotent: only writes when the
 * user has no scale yet, so it never clobbers edits or a restored export.
 */
export async function seedStarterScale(repo: ToolboxRepository): Promise<boolean> {
  const existing = await repo.getLanternScale()
  if (existing) return false
  await repo.saveLanternScale(buildStarterScale())
  return true
}