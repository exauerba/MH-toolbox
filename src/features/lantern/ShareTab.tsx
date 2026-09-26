import { useCallback, useEffect, useState } from 'react'
import { Button, Icon, IconButton, TextInput } from '../../design'
import { useAuthMode, useRepository } from '../../data/RepositoryProvider'
import type { LanternScale, LanternShare } from '../../data/types'
import { formatScaleForText } from './format'

interface ShareTabProps {
  scale: LanternScale
  onError: (message: string) => void
}

function shareUrl(token: string): string {
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#/share/${token}`
}

/**
 * Share tab — copy the scale as plain text (everyone), or mint a private
 * read-only partner link (signed-in only). Partner links are text-only:
 * photos never leave the owner's device.
 */
export function ShareTab({ scale, onError }: ShareTabProps) {
  const repo = useRepository()
  const { mode } = useAuthMode()
  const [copied, setCopied] = useState(false)
  const [shares, setShares] = useState<LanternShare[]>([])
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [loadingShares, setLoadingShares] = useState(false)

  const loadShares = useCallback(async () => {
    setLoadingShares(true)
    try {
      setShares(await repo.listLanternShares())
    } catch {
      // Guest mode has no shares — an empty list is the correct state.
    } finally {
      setLoadingShares(false)
    }
  }, [repo])

  useEffect(() => {
    if (mode === 'signed-in') void loadShares()
  }, [mode, loadShares])

  const handleCopyText = async () => {
    const text = formatScaleForText(scale)
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: scale.name, text })
        return
      }
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return // share sheet dismissed
      onError('Could not copy your scale. Try again, or copy from the Scale tab.')
    }
  }

  const handleCreateShare = async () => {
    const label = name.trim()
    if (!label || creating) return
    setCreating(true)
    try {
      await repo.createLanternShare(label)
      setName('')
      await loadShares()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not create a partner link')
    } finally {
      setCreating(false)
    }
  }

  const handleCopyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl(token))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      onError('Could not copy the link')
    }
  }

  const handleRevoke = async (id: string) => {
    try {
      await repo.revokeLanternShare(id)
      await loadShares()
    } catch {
      onError('Could not revoke that link')
    }
  }

  return (
    <div className="animate-pop-in space-y-8">
      <section>
        <h3 className="text-lg font-semibold text-ink">Copy as text</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Your whole scale as plain text — send it in any message, to anyone, on any phone.
        </p>
        <Button
          className="mt-4 rounded-full bg-lantern-600 text-white shadow-tactile-mid hover:bg-lantern-700"
          leadingIcon={<Icon name={copied ? 'check' : 'copy'} size={16} />}
          onClick={() => void handleCopyText()}
        >
          {copied ? 'Copied!' : 'Copy as text'}
        </Button>
      </section>

      <section className="border-t border-lantern-200/40 pt-8">
        <h3 className="text-lg font-semibold text-ink">Partner link</h3>
        {mode === 'signed-in' ? (
          <>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              A private, read-only link to your scale — no photos, just the words. Give it to
              someone you trust. You can revoke it any time.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <TextInput
                label="Who is this for?"
                placeholder="e.g. Sam"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="sm:max-w-56"
              />
              <Button
                variant="secondary"
                className="self-end"
                loading={creating}
                disabled={!name.trim()}
                leadingIcon={<Icon name="share" size={16} />}
                onClick={() => void handleCreateShare()}
              >
                Create link
              </Button>
            </div>

            {loadingShares ? (
              <div className="mt-4 h-16 animate-pulse rounded-xl bg-lantern-100/60" />
            ) : shares.filter((s) => !s.revokedAt).length === 0 ? (
              <p className="mt-4 text-sm text-ink-soft">No partner links yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {shares
                  .filter((s) => !s.revokedAt)
                  .map((share) => (
                  <li
                    key={share.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lantern-200/40 bg-lantern-50/60 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink">{share.label}</p>
                      <p className="truncate text-xs text-ink-soft">{shareUrl(share.token)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        leadingIcon={<Icon name="copy" size={14} />}
                        onClick={() => void handleCopyLink(share.token)}
                      >
                        Copy
                      </Button>
                      <IconButton
                        icon="trash"
                        label={`Revoke link for ${share.label}`}
                        variant="ghost"
                        className="text-ink-soft hover:text-error-ink"
                        onClick={() => void handleRevoke(share.id)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Partner links need an account. Sign in to create a private link — or just use
            copy-as-text above, which works for everyone.
          </p>
        )}
      </section>
    </div>
  )
}