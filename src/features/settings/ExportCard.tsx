import { useState } from 'react'
import { Button, Icon } from '../../design'
import { useRepository } from '../../data/RepositoryProvider'
import { toISODate } from '../../shared/day'

/**
 * Export everything steady keeps as a portable JSON or CSV file. Downloads
 * happen via a transient object URL; jsdom lacks createObjectURL (tests stub
 * it), so the guard keeps the card harmless if a browser ever lacks it too.
 */
function downloadBlob(blob: Blob, filename: string) {
  if (typeof URL.createObjectURL !== 'function') return
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

type ExportKind = 'json' | 'csv'

export function ExportCard() {
  const repo = useRepository()
  const [exporting, setExporting] = useState<ExportKind | null>(null)

  async function handleExportJson() {
    setExporting('json')
    try {
      const bundle = await repo.exportAll()
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
      downloadBlob(blob, `steady-export-${toISODate(new Date())}.json`)
    } finally {
      setExporting(null)
    }
  }

  async function handleExportCsv() {
    setExporting('csv')
    try {
      const bundle = await repo.exportAll()
      const rows = bundle.jarLogs.map((log) => `${log.date},${log.spent},${log.label ?? ''}`)
      const blob = new Blob([['date,spent,label', ...rows].join('\n')], { type: 'text/csv' })
      downloadBlob(blob, `steady-jar-logs-${toISODate(new Date())}.csv`)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-muted px-3 py-2">
      <div className="min-w-0">
        <p className="font-bold text-ink">Export your data</p>
        <p className="text-sm text-ink-soft">
          Export everything as a file you can keep or move.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="primary"
          loading={exporting === 'json'}
          leadingIcon={<Icon name="download" size={18} />}
          onClick={() => void handleExportJson()}
        >
          Export JSON
        </Button>
        <Button
          variant="secondary"
          loading={exporting === 'csv'}
          onClick={() => void handleExportCsv()}
        >
          Export CSV
        </Button>
      </div>
    </div>
  )
}