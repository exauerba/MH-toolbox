import { useState } from 'react'
import { Alert, Button, Icon, Modal } from '../../design'
import { useAuthMode } from '../../data/RepositoryProvider'
import { supabase } from '../../config/supabase'

/**
 * Permanently delete the signed-in account and all backed-up data via the
 * steady-delete-account edge function. The session dies server-side, so the
 * repository provider flips back to guest automatically.
 */
export function DeleteAccountCard() {
  const { mode } = useAuthMode()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!supabase || mode !== 'signed-in') return null
  const client = supabase

  async function handleConfirm() {
    setDeleting(true)
    setError(null)
    try {
      const { data: sessionData } = await client.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Not signed in')
      const { error: invokeError } = await client.functions.invoke('steady-delete-account', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (invokeError) throw invokeError
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-muted px-3 py-2">
      <div className="min-w-0">
        <p className="font-bold text-ink">Delete account</p>
        <p className="text-sm text-ink-soft">
          Permanently deletes your account and all backed-up data. This cannot be undone.
        </p>
      </div>
      <Button
        variant="danger"
        leadingIcon={<Icon name="trash" size={18} />}
        onClick={() => {
          setError(null)
          setOpen(true)
        }}
      >
        Delete account
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete your account?"
        footer={
          <>
            <Button variant="secondary" disabled={deleting} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={() => void handleConfirm()}>
              Delete forever
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-soft">
          This permanently deletes your account and everything backed up to it — pins, jar,
          timeline, and images. It cannot be undone.
        </p>
        {error && <Alert variant="error">{error}</Alert>}
      </Modal>
    </div>
  )
}