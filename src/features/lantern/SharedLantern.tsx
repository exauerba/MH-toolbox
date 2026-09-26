import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Icon } from '../../design'
import { supabase } from '../../config/supabase'
import { CRISIS_REGIONS, DEFAULT_CRISIS_REGION_ID } from '../../shared/crisis'
import { isCrisisLevel } from './present'
import { cx } from '../../design/cx'

interface SharedLevel {
  position: number
  label: string
  description: string
  actions: string[]
}

interface SharedScale {
  name: string
  levelCount: number
  levels: SharedLevel[]
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'missing' }
  | { status: 'ready'; scale: SharedScale }

/**
 * Read-only view of a shared lantern, served at /share/:token.
 * Works for visitors without an account: the RPC is granted to `anon` and
 * returns text-only data (labels, descriptions, actions) — never photos,
 * never the owner's identity.
 */
export function SharedLantern() {
  const { token } = useParams<{ token: string }>()
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!supabase) {
        setState({ status: 'error', message: 'Sharing is not available in this build.' })
        return
      }
      if (!token) {
        setState({ status: 'missing' })
        return
      }
      try {
        const { data, error } = await supabase.rpc('get_shared_scale', { p_token: token })
        if (cancelled) return
        if (error) {
          setState({ status: 'error', message: 'This link could not be opened.' })
        } else if (!data) {
          setState({ status: 'missing' })
        } else {
          setState({ status: 'ready', scale: data as SharedScale })
        }
      } catch {
        if (!cancelled) setState({ status: 'error', message: 'This link could not be opened.' })
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [token])

  const region = CRISIS_REGIONS.find((r) => r.id === DEFAULT_CRISIS_REGION_ID) ?? CRISIS_REGIONS[0]

  return (
    <div className="relative min-h-screen overflow-hidden bg-lantern-50 py-8 px-4 sm:px-8">
      <div className="pointer-events-none absolute -inset-20 z-0">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-lantern-200/50 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl">
        {state.status === 'loading' && (
          <div data-testid="loading-shared" className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 w-full animate-pulse rounded-2xl bg-lantern-100/60" />
            ))}
          </div>
        )}

        {state.status === 'error' && (
          <div className="rounded-2xl bg-error-soft px-5 py-6 text-center">
            <Icon name="alert" size={32} className="mx-auto text-error-ink" />
            <p className="mt-3 font-semibold text-error-ink">{state.message}</p>
          </div>
        )}

        {state.status === 'missing' && (
          <div className="rounded-2xl bg-surface px-5 py-10 text-center shadow-tactile-mid">
            <Icon name="lantern" size={40} className="mx-auto text-lantern-400" />
            <h1 className="mt-4 text-xl font-semibold text-ink">This lantern isn't lit</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
              The link may have been revoked, or it never existed. Ask the person who shared it
              for a fresh link.
            </p>
          </div>
        )}

        {state.status === 'ready' && (
          <div className="animate-pop-in">
            <header className="mb-6 text-center">
              <Icon name="lantern" size={36} className="mx-auto text-lantern-400" />
              <h1 className="mt-3 text-2xl font-semibold text-ink">{state.scale.name}</h1>
              <p className="mt-1 text-sm text-ink-soft">
                {state.scale.levelCount} levels — where they are, and what helps.
              </p>
            </header>

            <ol className="space-y-4">
              {[...state.scale.levels]
                .sort((a, b) => a.position - b.position)
                .map((level) => {
                  const crisis = isCrisisLevel(level, state.scale.levelCount)
                  return (
                    <li
                      key={level.position}
                      className={cx(
                        'rounded-2xl border bg-surface/80 p-5 shadow-tactile-mid',
                        crisis ? 'border-error-200' : 'border-lantern-200/40',
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <span
                          className={cx(
                            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold',
                            crisis
                              ? 'bg-error-soft text-error-ink'
                              : 'bg-lantern-100 text-lantern-700',
                          )}
                        >
                          {level.position}
                        </span>
                        <div className="min-w-0">
                          <h2 className="font-semibold text-ink">{level.label}</h2>
                          {level.description && (
                            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                              {level.description}
                            </p>
                          )}
                          {level.actions.length > 0 && (
                            <ul className="mt-3 space-y-1.5">
                              {level.actions.map((action, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-sm leading-relaxed text-ink"
                                >
                                  <Icon
                                    name="sparkle"
                                    size={14}
                                    className="mt-0.5 shrink-0 text-lantern-400"
                                  />
                                  {action}
                                </li>
                              ))}
                            </ul>
                          )}
                          {crisis && (
                            <div className="mt-4 rounded-xl bg-error-soft px-4 py-3">
                              <p className="text-sm font-bold text-error-ink">
                                This is a crisis level — stay close.
                              </p>
                              <ul className="mt-1.5 space-y-1">
                                {region.resources.map((r) => (
                                  <li key={r.name} className="text-sm leading-relaxed text-ink-soft">
                                    <a
                                      href={r.href}
                                      className="font-semibold text-error-ink underline decoration-error-300/50 underline-offset-2"
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
                      </div>
                    </li>
                  )
                })}
            </ol>

            <p className="mt-8 text-center text-xs text-ink-faint">
              Shared with care from steady — a private, read-only lantern.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}