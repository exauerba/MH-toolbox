/**
 * Pinned tools, backed by the active repository (Dexie for guests, Supabase
 * when signed in). One-time migration from the old localStorage key so
 * existing guests keep their layout.
 */
import { useCallback, useEffect, useState } from 'react'

import { useAuthMode, useRepository } from '../../data/RepositoryProvider'
import { DEFAULT_PINS, TOOLS, type ToolId } from '../../tools/tools.config'

const STORAGE_KEY = 'steady:pins'

const PINNABLE = new Set<ToolId>(TOOLS.filter((t) => !t.comingSoon).map((t) => t.id))

function sanitize(pins: unknown): ToolId[] {
  if (!Array.isArray(pins)) return []
  const valid = pins.filter((p): p is ToolId => typeof p === 'string' && PINNABLE.has(p as ToolId))
  return Array.from(new Set(valid))
}

function readLocalPins(): ToolId[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    const valid = sanitize(parsed)
    return valid.length > 0 ? valid : null
  } catch {
    return null
  }
}

export interface PinnedTools {
  pinned: ToolId[]
  togglePin(id: ToolId): void
  movePin(id: ToolId, direction: -1 | 1): void
  reorder(fromIndex: number, toIndex: number): void
}

export function usePinnedTools(): PinnedTools {
  const repo = useRepository()
  const { mode } = useAuthMode()
  const [pinned, setPinned] = useState<ToolId[]>(DEFAULT_PINS)

  useEffect(() => {
    let cancelled = false
    repo
      .getPins()
      .then((pins) => {
        if (cancelled) return
        const valid = sanitize(pins)
        if (valid.length > 0) {
          setPinned(valid)
          return
        }
        // Empty repo: migrate a guest's old localStorage layout once, else defaults.
        if (mode === 'guest') {
          const stored = readLocalPins()
          if (stored) {
            repo.setPins(stored).catch(() => {})
            localStorage.removeItem(STORAGE_KEY)
            setPinned(stored)
            return
          }
        }
        setPinned([...DEFAULT_PINS])
      })
      .catch(() => {
        if (!cancelled) setPinned([...DEFAULT_PINS])
      })
    return () => {
      cancelled = true
    }
  }, [repo, mode])

  const togglePin = useCallback(
    (id: ToolId) => {
      if (!PINNABLE.has(id)) return
      setPinned((current) => {
        const next = current.includes(id) ? current.filter((p) => p !== id) : [...current, id]
        repo.setPins(next).catch(() => {})
        return next
      })
    },
    [repo],
  )

  const movePin = useCallback(
    (id: ToolId, direction: -1 | 1) => {
      setPinned((current) => {
        const index = current.indexOf(id)
        const target = index + direction
        if (index === -1 || target < 0 || target >= current.length) return current
        const next = [...current]
        const tmp = next[index]
        next[index] = next[target]
        next[target] = tmp
        repo.setPins(next).catch(() => {})
        return next
      })
    },
    [repo],
  )

  const reorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      setPinned((current) => {
        if (
          fromIndex < 0 ||
          fromIndex >= current.length ||
          toIndex < 0 ||
          toIndex >= current.length ||
          fromIndex === toIndex
        ) {
          return current
        }
        const next = [...current]
        const [moved] = next.splice(fromIndex, 1)
        next.splice(toIndex, 0, moved)
        repo.setPins(next).catch(() => {})
        return next
      })
    },
    [repo],
  )

  return { pinned, togglePin, movePin, reorder }
}