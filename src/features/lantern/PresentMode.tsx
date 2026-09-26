import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Icon, IconButton } from '../../design'
import type { ImageRef, LanternScale } from '../../data/types'
import { CRISIS_REGIONS, DEFAULT_CRISIS_REGION_ID } from '../../shared/crisis'
import { isCrisisLevel, toneForLevel } from './present'
import { cx } from '../../design/cx'

interface PresentModeProps {
  open: boolean
  onClose: () => void
  scale: LanternScale
  imagesByLevel: Record<string, ImageRef[]>
}

type Phase = 'locate' | 'present'

const toneNumeral = {
  calm: 'bg-lantern-300/20 text-lantern-200',
  rising: 'bg-lantern-200/20 text-lantern-100',
  high: 'bg-warning-300/20 text-warning-200',
  crisis: 'bg-error-300/20 text-error-200',
} as const

/**
 * Present mode — a fullscreen, hand-over view of the scale.
 *
 * Two phases: "locate" (the owner taps where they are right now) then
 * "present" (one level at a time, huge numerals, what-helps actions, and a
 * crisis callout on the top levels). Designed to be read at arm's length by
 * someone who is not the owner. Escape closes; arrow keys navigate.
 */
export function PresentMode({ open, onClose, scale, imagesByLevel }: PresentModeProps) {
  const [phase, setPhase] = useState<Phase>('locate')
  const [index, setIndex] = useState(0)

  const levels = useMemo(() => [...scale.levels].sort((a, b) => a.position - b.position), [scale])
  const level = levels[index]
  const tone = level ? toneForLevel(level, scale.levelCount) : 'calm'
  const crisis = level ? isCrisisLevel(level, scale.levelCount) : false
  const region = CRISIS_REGIONS.find((r) => r.id === DEFAULT_CRISIS_REGION_ID) ?? CRISIS_REGIONS[0]

  const goTo = useCallback(
    (next: number) => {
      setIndex(Math.min(Math.max(next, 0), levels.length - 1))
    },
    [levels.length],
  )

  useEffect(() => {
    if (!open) return
    setPhase('locate')
    setIndex(0)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      } else if (phase === 'present' && event.key === 'ArrowRight') {
        goTo(index + 1)
      } else if (phase === 'present' && event.key === 'ArrowLeft') {
        goTo(index - 1)
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open, phase, index, goTo, onClose])

  if (!open) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Present your lantern"
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-lantern-900 text-lantern-50 animate-fade-in"
    >
      {/* Warm glow behind the content */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-lantern-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between">
          <p className="text-sm font-semibold tracking-wide text-lantern-200">{scale.name}</p>
          <IconButton
            icon="close"
            label="Close present mode"
            variant="ghost"
            className="text-lantern-200 hover:bg-lantern-800 hover:text-lantern-50"
            onClick={onClose}
          />
        </header>

        {phase === 'locate' ? (
          <div className="flex flex-1 flex-col justify-center py-8">
            <h2 className="text-2xl font-semibold text-lantern-50 sm:text-3xl">
              Where are you right now?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-lantern-200">
              Tap the level that fits. Then hand your phone over — they'll see one level at a
              time, with exactly what helps.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {levels.map((lvl, i) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => {
                    setIndex(i)
                    setPhase('present')
                  }}
                  className={cx(
                    'flex items-center gap-3 rounded-2xl border border-lantern-700 bg-lantern-800/60 px-4 py-3 text-left transition-colors hover:border-lantern-500 hover:bg-lantern-800',
                    isCrisisLevel(lvl, scale.levelCount) && 'border-error-400/40',
                  )}
                >
                  <span
                    className={cx(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold',
                      toneNumeral[toneForLevel(lvl, scale.levelCount)],
                    )}
                  >
                    {lvl.position}
                  </span>
                  <span className="text-sm font-medium leading-snug text-lantern-50">
                    {lvl.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : level ? (
          <div className="flex flex-1 flex-col justify-center py-6">
            <div className="flex items-center gap-4">
              <span
                className={cx(
                  'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-4xl font-extrabold sm:h-20 sm:w-20 sm:text-5xl',
                  toneNumeral[tone],
                )}
              >
                {level.position}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-lantern-300">
                  {tone === 'crisis'
                    ? 'Crisis — stay close'
                    : tone === 'high'
                      ? 'High — keep watching'
                      : tone === 'rising'
                        ? 'Rising — check in'
                        : 'Steady'}
                </p>
                <h2 className="text-2xl font-semibold text-lantern-50 sm:text-3xl">{level.label}</h2>
              </div>
            </div>

            {level.description && (
              <p className="mt-6 text-base leading-relaxed text-lantern-100 sm:text-lg">
                {level.description}
              </p>
            )}

            {level.actions.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-semibold text-lantern-200">What helps right now</p>
                <ul className="mt-3 space-y-2">
                  {level.actions.map((action, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-xl bg-lantern-800/60 px-4 py-3 text-sm leading-relaxed text-lantern-50"
                    >
                      <Icon name="sparkle" size={16} className="mt-0.5 shrink-0 text-lantern-300" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {imagesByLevel[level.id]?.length > 0 && (
              <div className="mt-6 flex gap-3 overflow-x-auto pb-1">
                {imagesByLevel[level.id].map((img) => (
                  <img
                    key={img.id}
                    src={img.url}
                    alt=""
                    className="h-32 w-32 shrink-0 rounded-xl object-cover ring-1 ring-lantern-700"
                  />
                ))}
              </div>
            )}

            {crisis && (
              <div className="mt-6 rounded-2xl border border-error-400/40 bg-error-soft/10 p-4">
                <p className="text-sm font-bold text-error-200">This is a crisis level.</p>
                <ul className="mt-2 space-y-1.5">
                  {region.resources.map((r) => (
                    <li key={r.name} className="text-sm leading-relaxed text-lantern-100">
                      <a
                        href={r.href}
                        className="font-semibold text-error-200 underline decoration-error-300/50 underline-offset-2 hover:text-error-100"
                      >
                        {r.name}
                      </a>{' '}
                      — {r.detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-4">
              <Button
                variant="ghost"
                className="text-lantern-200 hover:bg-lantern-800 hover:text-lantern-50"
                leadingIcon={<Icon name="arrowLeft" size={16} />}
                disabled={index === 0}
                onClick={() => goTo(index - 1)}
              >
                Lower
              </Button>
              <div className="flex items-center gap-1.5" aria-label={`Level ${level.position} of ${levels.length}`}>
                {levels.map((lvl, i) => (
                  <button
                    key={lvl.id}
                    type="button"
                    aria-label={`Go to level ${lvl.position}`}
                    onClick={() => goTo(i)}
                    className={cx(
                      'h-2 rounded-full transition-all',
                      i === index ? 'w-6 bg-lantern-200' : 'w-2 bg-lantern-700 hover:bg-lantern-500',
                    )}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                className="text-lantern-200 hover:bg-lantern-800 hover:text-lantern-50"
                trailingIcon={<Icon name="arrowRight" size={16} />}
                disabled={index === levels.length - 1}
                onClick={() => goTo(index + 1)}
              >
                Higher
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}