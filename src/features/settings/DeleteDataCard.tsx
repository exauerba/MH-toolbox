import { useMemo, useState } from 'react'
import { Alert, Button, Icon, Modal } from '../../design'
import { useAuthMode, useRepository } from '../../data/RepositoryProvider'
import { createAuthService } from '../../auth/authCore'

/**
 * Wipe all steady data on this device. Signed-in users are signed out after
 * the wipe (their account and cloud copy remain); guests just lose the local
 * data. Destructive, so always confirmed in a modal first.
 */
export function DeleteDataCard() {
  const repo = useRepository()
  const { mode } = useAuthMode()
  const authService = useMemo(() => createAuthService(), [])
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setDeleting(true)
    setError(null)
    try {
      await repo.deleteAllData()
      if (mode === 'signed-in') {
        await authService.signOut()
      }
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
        <p className="font-bold text-ink">Delete your data</p>
        <p className="text-sm text-ink-soft">
          Delete all steady data on this device. This cannot be undone.
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
        Delete data
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete all data?"
        footer={
          <>
            <Button variant="secondary" disabled={deleting} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={() => void handleConfirm()}>
              Delete everything
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-soft">
          This permanently wipes your pins, jar, timeline, and images from this device. It
          cannot be undone.
        </p>
        {error && <Alert variant="error">{error}</Alert>}
      </Modal>
    </div>
  )
}