import { useState } from 'react'
import { Button, Icon, Modal } from '../../design'
import { cx } from '../../design/cx'
import type { LanternCurrentLevel, LanternScale } from '../../data/types'
import { isCrisisLevel } from './present'
import { CURRENT_LEVEL_WINDOW_COPY } from './currentLevel'

interface SetLevelSheetProps {
  open: boolean
  onClose: () => void
  scale: LanternScale
  current: LanternCurrentLevel | null
  onSet: (levelId: string) => Promise<void>
  onClear: () => Promise<void>
  onError: (message: string) => void
}

/**
 * Set-level sheet — label first.
 *
 * Naming what is happening is itself the regulation, so the feelings word is
 * the primary target and the number is secondary. The chosen level's "what
 * helps" list is shown before confirming, which turns a status update into a
 * cue for coping rather than a score to report.
 */
export function SetLevelSheet({
  open,
  onClose,
  scale,
  current,
  onSet,
  onClear,
  onError,
}: SetLevelSheetProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [pending, setPending] = useState<'set' | 'clear' | null>(null)

  const levels = [...scale.levels].sort((a, b) => a.position - b.position)
  const chosen = levels.find((l) => l.id === selected) ?? null

  const close = () => {
    setSelected(null)
    onClose()
  }

  const handleSet = async () => {
    if (!chosen || pending) return
    setPending('set')
    try {
      await onSet(chosen.id)
      setSelected(null)
      onClose()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not set your level')
    } finally {
      setPending(null)
    }
  }

  const handleClear = async () => {
    if (pending) return
    setPending('clear')
    try {
      await onClear()
      setSelected(null)
      onClose()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not clear your level')
    } finally {
      setPending(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Where are you right now?"
      size="lg"
      footer={
        <>
          {current && (
            <Button variant="ghost" loading={pending === 'clear'} onClick={() => void handleClear()}>
              Clear my level
            </Button>
          )}
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            className="bg-lantern-600 text-white hover:bg-lantern-700"
            loading={pending === 'set'}
            disabled={!chosen}
            leadingIcon={<Icon name="check" size={16} />}
            onClick={() => void handleSet()}
          >
            Set this level
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-ink-soft">
        The people you've added will see this level and what helps at it. It settles on its own after{' '}
        {CURRENT_LEVEL_WINDOW_COPY} — you never have to keep it up to date.
      </p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {levels.map((level) => {
          const isSelected = selected === level.id
          const isCurrent = current?.levelId === level.id
          const crisis = isCrisisLevel(level, scale.levelCount)
          return (
            <li key={level.id}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelected(level.id)}
                className={cx(
                  'w-full rounded-xl border px-4 py-3 text-left transition-colors',
                  isSelected
                    ? 'border-lantern-500 bg-lantern-50'
                    : crisis
                      ? 'border-error-200/60 bg-error-soft/30 hover:border-error-300'
                      : 'border-lantern-200/50 bg-surface hover:border-lantern-300',
                )}
              >
                {/* Label first, number second — naming it is the point. */}
                <span className="flex items-baseline gap-2">
                  <span className="text-base font-extrabold text-ink">{level.label}</span>
                  <span className="text-xs font-bold tabular-nums text-ink-soft">
                    {level.position}
                  </span>
                </span>
                {level.description && (
                  <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
                    {level.description}
                  </span>
                )}
                {isCurrent && (
                  <span className="mt-1.5 inline-block text-xs font-bold text-lantern-700">
                    Your current level
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {chosen && chosen.actions.length > 0 && (
        <div className="mt-5 rounded-xl border border-lantern-200/50 bg-lantern-50/70 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            What helps at {chosen.label}
          </p>
          <ul className="mt-2 space-y-1.5">
            {chosen.actions.map((action) => (
              <li key={action} className="flex gap-2 text-sm leading-relaxed text-ink">
                <Icon name="sparkle" size={16} className="mt-0.5 shrink-0 text-lantern-600" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}
