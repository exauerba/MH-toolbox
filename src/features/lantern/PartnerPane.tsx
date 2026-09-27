import { Button, Icon } from '../../design'
import type { LanternLevel, PartnerStatus } from '../../data/types'
import { CRISIS_REGIONS, DEFAULT_CRISIS_REGION_ID } from '../../shared/crisis'
import { isCrisisLevel, toneForLevel, type LanternTone } from './present'
import { currentLevelState, timeAgo, timeLeft } from './currentLevel'

interface PartnerPaneProps {
  status: PartnerStatus
  refreshing?: boolean
  onRefresh: () => void
}

const TONE_BADGE: Record<LanternTone, string> = {
  calm: 'bg-lantern-100 text-lantern-700',
  rising: 'bg-lantern-100 text-lantern-700',
  high: 'bg-warning-soft text-warning-ink',
  crisis: 'bg-error-soft text-error-ink',
}

const PANEL_TONE: Record<LanternTone, string> = {
  calm: 'border-lantern-200/50 bg-lantern-50/70',
  rising: 'border-lantern-200/50 bg-lantern-50/70',
  high: 'border-warning-300 bg-warning-soft/60',
  crisis: 'border-error-300 bg-error-soft/60',
}

/** Shared (read-only) levels arrive from the RPC without stable ids. */
function LevelLine({ level, isCurrent }: { level: LanternLevel; isCurrent: boolean }) {
  return (
    <li
      className={
        isCurrent
          ? 'rounded-xl border border-lantern-300 bg-lantern-50 px-3 py-2'
          : 'rounded-xl border border-transparent px-3 py-2'
      }
    >
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-bold tabular-nums text-ink-soft">{level.position}</span>
        <span className={isCurrent ? 'text-sm font-extrabold text-ink' : 'text-sm font-bold text-ink-soft'}>
          {level.label}
        </span>
        {isCurrent && <span className="text-xs font-bold text-lantern-700">· right now</span>}
      </div>
      {level.description && (
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">{level.description}</p>
      )}
    </li>
  )
}

/**
 * Partner pane — one person's lantern, read-only.
 *
 * Deliberately passive: no reply buttons, no nudges, no notifications. The
 * pane answers "where are they, and what helps" and nothing more. Research on
 * alarm fatigue and safety planning is consistent: a signal that fires on
 * every change stops being read. A stale level is shown in a neutral tone and
 * never as an alarm — the level simply expires, and the person who set it
 * decides when to set another.
 */
export function PartnerPane({ status, refreshing = false, onRefresh }: PartnerPaneProps) {
  const { sharerUsername, scaleName, levelCount, levels, currentLevel } = status
  const name = sharerUsername || 'They'
  const state = currentLevelState(currentLevel)
  // A level that has settled must never read as an alarm, so tone, urgency and
  // the crisis callout are only derived while the level is actually live. The
  // level's own words are still shown — just in a neutral tone.
  const live = state === 'live'
  const tone = live && currentLevel ? toneForLevel(currentLevel, levelCount) : null
  const urgent = tone === 'crisis' || tone === 'high'
  const crisis = live && !!currentLevel && isCrisisLevel(currentLevel, levelCount)
  const region = CRISIS_REGIONS.find((r) => r.id === DEFAULT_CRISIS_REGION_ID) ?? CRISIS_REGIONS[0]

  // Relational framing first; the number stays secondary.
  let headline = `${name} hasn't set a level yet.`
  if (state === 'live') {
    headline = urgent ? `${name} may need you right now.` : `${name} is at level ${currentLevel?.position}.`
  } else if (state === 'expired') {
    headline = `${name}'s last update has settled.`
  }

  return (
    <section
      className={`rounded-2xl border p-5 ${tone ? PANEL_TONE[tone] : 'border-lantern-200/50 bg-lantern-50/50'}`}
      aria-label={`${name}'s lantern`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink-soft">{name}</p>
          <h4 className="text-lg font-extrabold tracking-tight text-ink">{headline}</h4>
          <p className="mt-1 text-sm text-ink-soft">{scaleName}</p>
        </div>
        <Button
          variant="ghost"
          className="text-ink-soft"
          loading={refreshing}
          leadingIcon={<Icon name="refresh" size={16} />}
          onClick={onRefresh}
        >
          Refresh
        </Button>
      </div>

      {currentLevel && (
        <div className="mt-4 rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold tabular-nums ${TONE_BADGE[tone ?? 'calm']}`}
            >
              {currentLevel.position}
            </span>
            <div className="min-w-0">
              <p className="text-base font-extrabold text-ink">{currentLevel.label}</p>
              <p className="text-xs text-ink-soft">
                {state === 'live'
                  ? `Set ${timeAgo(currentLevel.setAt)} · ${timeLeft(currentLevel.expiresAt)}`
                  : `Last updated ${timeAgo(currentLevel.setAt)}`}
              </p>
            </div>
          </div>

          {currentLevel.description && (
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{currentLevel.description}</p>
          )}

          {currentLevel.actions.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                What helps {name.split(' ')[0]} right now
              </p>
              <ul className="mt-2 space-y-1.5">
                {currentLevel.actions.map((action) => (
                  <li key={action} className="flex gap-2 text-sm leading-relaxed text-ink">
                    <Icon name="sparkle" size={16} className="mt-0.5 shrink-0 text-lantern-600" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {crisis && (
            <div className="mt-4 rounded-xl border border-error-300 bg-error-soft/60 p-3">
              <p className="text-xs font-bold text-error-ink">This is a crisis level. Stay close.</p>
              <ul className="mt-1.5 space-y-1">
                {region.resources.map((r) => (
                  <li key={r.name} className="text-xs leading-relaxed text-ink-soft">
                    <a
                      href={r.href}
                      className="font-bold text-error-ink underline decoration-error-300/60 underline-offset-2"
                    >
                      {r.name}
                    </a>{' '}
                    — {r.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {state === 'expired' && (
        <p className="mt-4 rounded-xl border border-line bg-surface/60 px-4 py-3 text-sm leading-relaxed text-ink-soft">
          Levels settle after an hour. This is what was true then — {name} can set a new one any time.
        </p>
      )}

      <details className="mt-4 group">
        <summary className="cursor-pointer text-sm font-bold text-ink-soft hover:text-ink">
          See {name === 'They' ? 'their' : `${name}'s`} whole scale
        </summary>
        <ol className="mt-2 space-y-1">
          {levels.map((level) => (
            <LevelLine
              key={level.position}
              level={level}
              isCurrent={currentLevel?.position === level.position}
            />
          ))}
        </ol>
      </details>
    </section>
  )
}
