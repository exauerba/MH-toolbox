import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Icon, IconButton, TextInput } from '../../design'
import { useAuthMode, useRepository } from '../../data/RepositoryProvider'
import type {
  LanternCurrentLevel,
  LanternPartnership,
  LanternScale,
  PartnerStatus,
} from '../../data/types'
import { PartnerPane } from './PartnerPane'
import { SetLevelSheet } from './SetLevelSheet'
import { currentLevelState, timeAgo, timeLeft } from './currentLevel'

interface PartnersTabProps {
  scale: LanternScale
  onError: (message: string) => void
}

function sideName(p: LanternPartnership): string {
  return p.side === 'outgoing' ? (p.partnerUsername ?? 'them') : (p.sharerUsername ?? 'them')
}

/**
 * Partners tab — two halves that only look related.
 *
 * Top: your own current level. It works for everyone, signed in or not, and
 * is never gated behind having partners: naming where you are is useful on its
 * own. It settles after an hour by itself, so there is nothing to keep up.
 *
 * Below: the people you connect with. Outgoing rows are people who can see
 * your level; incoming rows are people who share theirs with you. Only
 * incoming active partnerships get a pane, and that pane is read-only — there
 * are no reply buttons, because a signal that demands a response is a signal
 * people start muting.
 */
export function PartnersTab({ scale, onError }: PartnersTabProps) {
  const repo = useRepository()
  const { mode } = useAuthMode()
  const signedIn = mode === 'signed-in'

  const [current, setCurrent] = useState<LanternCurrentLevel | null>(null)
  const [partnerships, setPartnerships] = useState<LanternPartnership[]>([])
  const [statuses, setStatuses] = useState<PartnerStatus[]>([])
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const [level, list] = await Promise.all([repo.getCurrentLevel(), repo.listPartnerships()])
      setCurrent(level)
      setPartnerships(list)
      if (signedIn) setStatuses(await repo.getPartnerStatus())
    } catch {
      // Guest mode has no partnerships; an empty list is the correct state.
    } finally {
      setLoading(false)
    }
  }, [repo, signedIn])

  useEffect(() => {
    void load()
  }, [load])

  // The set level can outlive a scale edit that removed it, so keep the level
  // and the status together: the card only renders when both are present.
  const currentMatch = useMemo(() => {
    if (!current) return null
    const level = scale.levels.find((l) => l.id === current.levelId)
    return level ? { level, status: current } : null
  }, [scale.levels, current])
  const state = currentLevelState(current)

  const run = async (key: string, work: () => Promise<void>) => {
    setBusy(key)
    try {
      await work()
      await load()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(null)
    }
  }

  const handleSet = (levelId: string) => run('set', async () => void (await repo.setCurrentLevel(levelId)))
  const handleClear = () => run('clear', () => repo.clearCurrentLevel())
  const handleRefresh = () => run('refresh', async () => setStatuses(await repo.getPartnerStatus()))
  const handleAdd = () =>
    run('add', async () => {
      await repo.addPartner(username.trim())
      setUsername('')
    })
  const handleAccept = (id: string) => run(`accept:${id}`, () => repo.acceptPartnership(id))
  const handleDecline = (id: string) => run(`decline:${id}`, () => repo.declinePartnership(id))
  const handleRevoke = (id: string) => run(`revoke:${id}`, () => repo.revokePartnership(id))

  const incoming = partnerships.filter((p) => p.side === 'incoming' && p.status !== 'revoked')
  const outgoing = partnerships.filter((p) => p.side === 'outgoing' && p.status !== 'revoked')
  const live = statuses.length > 0

  return (
    <div className="animate-pop-in space-y-8">
      <section>
        <h3 className="text-lg font-semibold text-ink">Your current level</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          {state === 'none' && 'Nobody sees this unless you add them. Set it when it helps you name where you are.'}
          {state === 'live' &&
            'The people you added can see this. It settles on its own, so there is nothing to keep up.'}
          {state === 'expired' && 'This settled on its own. Set a new one whenever it helps.'}
        </p>

        <div className="mt-4 rounded-2xl border border-lantern-200/50 bg-lantern-50/60 p-4">
          {currentMatch ? (
            <>
              <p className="text-base font-extrabold text-ink">
                {currentMatch.level.label}
                <span className="ml-2 text-xs font-bold tabular-nums text-ink-soft">
                  {currentMatch.level.position}
                </span>
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                {state === 'live'
                  ? `Set ${timeAgo(currentMatch.status.setAt)} · ${timeLeft(currentMatch.status.expiresAt)}`
                  : `Last set ${timeAgo(currentMatch.status.setAt)} · settled`}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {state === 'live' ? (
                  <Button
                    variant="secondary"
                    loading={busy === 'set'}
                    leadingIcon={<Icon name="check" size={16} />}
                    onClick={() => void handleSet(currentMatch.level.id)}
                  >
                    Still true?
                  </Button>
                ) : (
                  <Button
                    className="bg-lantern-600 text-white hover:bg-lantern-700"
                    leadingIcon={<Icon name="plus" size={16} />}
                    onClick={() => setSheetOpen(true)}
                  >
                    Set a new level
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setSheetOpen(true)}>
                  Change
                </Button>
                <Button
                  variant="ghost"
                  className="text-ink-soft hover:text-error-ink"
                  loading={busy === 'clear'}
                  onClick={() => void handleClear()}
                >
                  Clear
                </Button>
              </div>
            </>
          ) : (
            <Button
              className="bg-lantern-600 text-white hover:bg-lantern-700"
              leadingIcon={<Icon name="plus" size={16} />}
              onClick={() => setSheetOpen(true)}
            >
              Set my level
            </Button>
          )}
        </div>
      </section>

      <section className="border-t border-lantern-200/40 pt-8">
        <h3 className="text-lg font-semibold text-ink">People who share with you</h3>
        {signedIn ? (
          <>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              When someone adds you, their scale and current level appear here. You can reach out —
              no need to solve anything.
            </p>

            {loading ? (
              <div className="mt-4 h-20 animate-pulse rounded-xl bg-lantern-100/60" />
            ) : incoming.length === 0 && !live ? (
              <p className="mt-4 text-sm text-ink-soft">Nobody yet.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {incoming
                  .filter((p) => p.status === 'pending')
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lantern-200/50 bg-lantern-50/60 px-4 py-3"
                    >
                      <p className="text-sm text-ink">
                        <span className="font-bold">{sideName(p)}</span> would like to share their scale
                        with you.
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          className="bg-lantern-600 text-white hover:bg-lantern-700"
                          loading={busy === `accept:${p.id}`}
                          onClick={() => void handleAccept(p.id)}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="ghost"
                          loading={busy === `decline:${p.id}`}
                          onClick={() => void handleDecline(p.id)}
                        >
                          Not now
                        </Button>
                      </div>
                    </div>
                  ))}

                {statuses.map((s) => (
                  <PartnerPane
                    key={s.sharerId}
                    status={s}
                    refreshing={busy === 'refresh'}
                    onRefresh={() => void handleRefresh()}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Seeing someone else's lantern needs an account — you would need one too, so you can
            connect back. Setting your own level above works right now, in guest mode.
          </p>
        )}
      </section>

      {signedIn && (
        <section className="border-t border-lantern-200/40 pt-8">
          <h3 className="text-lg font-semibold text-ink">People who can see your level</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Add someone by username. They accept, then they can see your level and your scale. You
            can remove them any time.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <TextInput
              label="Their username"
              placeholder="e.g. sam"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="sm:max-w-56"
            />
            <Button
              variant="secondary"
              className="self-end"
              loading={busy === 'add'}
              disabled={!username.trim()}
              leadingIcon={<Icon name="user" size={16} />}
              onClick={() => void handleAdd()}
            >
              Add person
            </Button>
          </div>

          {outgoing.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">Nobody yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {outgoing.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lantern-200/40 bg-lantern-50/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">{sideName(p)}</p>
                    <p className="text-xs text-ink-soft">
                      {p.status === 'pending' ? 'Waiting for them to accept' : 'Can see your level'}
                    </p>
                  </div>
                  <IconButton
                    icon="trash"
                    label={`Remove ${sideName(p)}`}
                    variant="ghost"
                    className="text-ink-soft hover:text-error-ink"
                    onClick={() => void handleRevoke(p.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <SetLevelSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        scale={scale}
        current={current}
        onSet={handleSet}
        onClear={handleClear}
        onError={onError}
      />
    </div>
  )
}
