import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Modal } from '../../design'
import { useAuthMode, useRepository } from '../../data/RepositoryProvider'
import { LocalRepository } from '../../data/local/LocalRepository'
import { migrateLocalToSupabase } from '../../data/migrateLocal'

/**
 * After a guest signs in, offer to import the on-device (Dexie) data into
 * their account so it's backed up across devices. Shown only when the local
 * DB holds data the account hasn't imported yet; the check is best-effort and
 * dismissal is per session — the prompt returns on the next visit.
 */
export function MigrationPrompt() {
  const { mode } = useAuthMode()
  const remote = useRepository()
  const local = useMemo(() => new LocalRepository(), [])
  const [needsMigration, setNeedsMigration] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mode !== 'signed-in') return
    let cancelled = false
    async function check() {
      try {
        const bundle = await local.exportAll()
        const remoteProfile = await remote.getProfile()
        const hasLocalData = Boolean(
          bundle.profile ||
            bundle.pins.length > 0 ||
            bundle.jarDays.length > 0 ||
            bundle.jarLogs.length > 0 ||
            bundle.timelineEntries.length > 0 ||
            bundle.timelineZones.length > 0 ||
            bundle.timelineImages.length > 0,
        )
        if (!cancelled && hasLocalData && !remoteProfile?.localDataImportedAt) {
          setNeedsMigration(true)
        }
      } catch {
        // Best-effort check — never crash the shell.
      }
    }
    void check()
    return () => {
      cancelled = true
    }
  }, [mode, local, remote])

  if (mode !== 'signed-in') return null

  async function handleImport() {
    setImporting(true)
    setError(null)
    try {
      const result = await migrateLocalToSupabase(local, remote)
      if (result.migrated || result.reason === 'already-imported') {
        setNeedsMigration(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  if (!needsMigration) return null

  return (
    <Modal
      open
      onClose={() => setNeedsMigration(false)}
      title="Bring your local data with you?"
      footer={
        <>
          <Button variant="secondary" disabled={importing} onClick={() => setNeedsMigration(false)}>
            Not now
          </Button>
          <Button loading={importing} onClick={() => void handleImport()}>
            Import my data
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-ink-soft">
        You have data saved on this device from guest mode — your pins, jar, and timeline.
        Import it into your account so it's backed up across devices? Your local copy stays on
        this device either way.
      </p>
      {error && <Alert variant="error">{error}</Alert>}
    </Modal>
  )
}