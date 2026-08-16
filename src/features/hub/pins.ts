import { useCallback, useState } from 'react';
import { DEFAULT_PINS, TOOLS, type ToolId } from '../../tools/tools.config';

const STORAGE_KEY = 'steady:pins';

const PINNABLE = new Set<ToolId>(
  TOOLS.filter((tool) => !tool.comingSoon).map((tool) => tool.id),
);

/** Read pins from localStorage; first launch falls back to the defaults. */
function readPins(): ToolId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [...DEFAULT_PINS];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_PINS];
    const valid = parsed.filter(
      (id): id is ToolId =>
        typeof id === 'string' && (PINNABLE as Set<string>).has(id),
    );
    // Keep an order-preserving list, first occurrence wins.
    return Array.from(new Set(valid));
  } catch {
    return [...DEFAULT_PINS];
  }
}

function writePins(pins: ToolId[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
  } catch {
    // Storage unavailable (private mode) — pins just stay in memory.
  }
}

/**
 * Which tools sit at the top of the hub. Persisted locally so a signed-out
 * guest keeps their layout on this device; sign-in sync is a later step.
 */
export function usePinnedTools() {
  const [pinned, setPinned] = useState<ToolId[]>(readPins);

  const togglePin = useCallback((id: ToolId) => {
    setPinned((current) => {
      if (!PINNABLE.has(id)) return current;
      const next = current.includes(id)
        ? current.filter((pinnedId) => pinnedId !== id)
        : [...current, id];
      writePins(next);
      return next;
    });
  }, []);

  return { pinned, togglePin };
}
