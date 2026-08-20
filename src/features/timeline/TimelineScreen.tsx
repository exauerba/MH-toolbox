import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Icon,
  IconButton,
  Modal,
  SegmentedControl,
  TextArea,
  TextInput,
  cx,
  zonePalette,
} from '../../design'
import type {
  ImageRef,
  TimelineDisplayMode,
  TimelineEntry,
  TimelineOrientation,
  TimelineZone,
} from '../../data/types'
import { useRepository } from '../../data/RepositoryProvider'
import { assertImageAllowed, MAX_IMAGES_PER_ENTRY } from '../../data/imageRules'
import { formatDate } from './date'
import { TimelineHorizontal } from './TimelineHorizontal'

/** Fallback profile used when persisting the orientation for a fresh guest. */
const DEFAULT_PROFILE = {
  theme: 'system' as const,
  jarDefaultSpoons: 12,
  jarResetHour: 0,
  onboardingDone: false,
  localDataImportedAt: null,
}

/**
 * Zone colour picker — one swatch per curated zonePalette entry. The
 * selected swatch gets a ring + check, and every swatch carries its name
 * (colour never alone).
 */
function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-bold text-ink">Colour</legend>
      <div className="flex flex-wrap gap-2">
        {Object.entries(zonePalette).map(([name, hex]) => {
          const selected = value === hex
          return (
            <button
              key={name}
              type="button"
              aria-label={`Colour ${name}`}
              aria-pressed={selected}
              title={name}
              onClick={() => onChange(hex)}
              className={cx(
                'flex size-11 items-center justify-center rounded-full border-2 transition-transform duration-[var(--dur-fast)]',
                selected
                  ? 'scale-110 border-ink ring-2 ring-focus/60 ring-offset-2 ring-offset-canvas'
                  : 'border-transparent hover:scale-105',
              )}
              style={{ backgroundColor: hex }}
            >
              {selected && <Icon name="check" size={16} className="text-white" />}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/**
 * Entry create/edit/view modal. Images are validated app-side and uploaded
 * after the entry exists (create flow saves the entry first, then uploads).
 * In `viewing` mode the entry is shown read-only with an Edit action.
 */
function EntryModal({
  open,
  entry,
  zone,
  viewing,
  onClose,
  onEdit,
  onSaved,
}: {
  open: boolean
  entry: TimelineEntry | null
  zone: TimelineZone | null
  viewing: boolean
  onClose: () => void
  onEdit: () => void
  onSaved: () => Promise<void>
}) {
  const repo = useRepository()
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<string>(zonePalette.sage)
  const [displayMode, setDisplayMode] = useState<TimelineDisplayMode>('card')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<ImageRef[]>([])
  const [imageError, setImageError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setTitle(entry?.title ?? '')
    setStartDate(entry?.startDate ?? '')
    setEndDate(entry?.endDate ?? '')
    setDescription(entry?.description ?? '')
    setColor(entry?.color ?? zonePalette.sage)
    setDisplayMode(entry?.displayMode ?? 'card')
    setPendingFiles([])
    setExistingImages([])
    setImageError(null)
    setFormError(null)
    if (entry) {
      repo.listImages(entry.id).then(setExistingImages).catch(() => undefined)
    }
  }, [open, entry, repo])

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList)
    if (existingImages.length + pendingFiles.length + files.length > MAX_IMAGES_PER_ENTRY) {
      setImageError(`Max ${MAX_IMAGES_PER_ENTRY} images per entry`)
      return
    }
    for (const file of files) {
      try {
        assertImageAllowed(file)
      } catch (error) {
        setImageError(error instanceof Error ? error.message : 'That photo could not be added')
        return
      }
    }
    setPendingFiles((prev) => [...prev, ...files])
    setImageError(null)
  }

  const removePending = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExisting = async (ref: ImageRef) => {
    await repo.deleteImage(ref)
    setExistingImages((prev) => prev.filter((img) => img.id !== ref.id))
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setFormError('Give your entry a title')
      return
    }
    if (!startDate) {
      setFormError('Pick a start date')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const saved = await repo.saveTimelineEntry({
        id: entry?.id,
        title: title.trim(),
        startDate,
        endDate: endDate || null,
        description: description.trim(),
        color,
        displayMode,
      })
      for (const file of pendingFiles) {
        await repo.uploadImage(file, saved.id)
      }
      await onSaved()
      onClose()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save the entry')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={viewing ? 'Entry details' : entry ? 'Edit entry' : 'Add entry'}
      footer={
        viewing ? (
          <>
            <Button variant="secondary" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              loading={saving}
              leadingIcon={<Icon name="plus" size={18} pixel />}
            >
              Save entry
            </Button>
          </>
        )
      }
    >
      {viewing && entry ? (
        <div className="flex flex-col gap-4">
          <h3 className="font-display text-xl font-extrabold text-ink">{entry.title}</h3>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
            <Icon name="calendar" size={14} pixel />
            <time dateTime={entry.startDate}>{formatDate(entry.startDate)}</time>
            {entry.endDate && (
              <>
                <span aria-hidden="true">→</span>
                <time dateTime={entry.endDate}>{formatDate(entry.endDate)}</time>
              </>
            )}
          </p>
          {zone && (
            <p>
              <Chip tone="timeline" icon={<Icon name="flag" size={13} pixel />}>
                {zone.name}
              </Chip>
            </p>
          )}
          {entry.description && <p className="text-base leading-relaxed text-ink">{entry.description}</p>}
          {existingImages.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {existingImages.map((ref) => (
                <img
                  key={ref.id}
                  src={ref.url}
                  alt={entry.title}
                  className="h-24 w-24 rounded-lg border border-line object-cover"
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <TextInput
            label="Title"
            required
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="A moment, a place, a person…"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Start date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <TextInput
              label="End date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <TextArea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What made it matter? (optional)"
          />
          <ColorPicker value={color} onChange={setColor} />
          <SegmentedControl
            label="Display on the timeline"
            options={[
              { value: 'card', label: 'Card' },
              { value: 'compact', label: 'Compact' },
            ]}
            value={displayMode}
            onChange={(v) => setDisplayMode(v as TimelineDisplayMode)}
          />

          <div>
            <p className="text-sm font-bold text-ink">Photos</p>
            <p className="mt-1 text-sm text-ink-soft">
              {existingImages.length + pendingFiles.length}/{MAX_IMAGES_PER_ENTRY} — jpeg, png or webp,
              up to 5MB each.
            </p>
            {(existingImages.length > 0 || pendingFiles.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-3">
                {existingImages.map((ref) => (
                  <div key={ref.id} className="relative">
                    <img
                      src={ref.url}
                      alt={`${entry?.title ?? 'photo'} preview`}
                      className="h-24 w-24 rounded-lg border border-line object-cover"
                    />
                    <IconButton
                      icon="trash"
                      label="Remove this photo"
                      variant="ghost"
                      pixel
                      className="absolute -right-2 -top-2 bg-surface shadow-soft"
                      onClick={() => void removeExisting(ref)}
                    />
                  </div>
                ))}
                {pendingFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="relative flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface-muted"
                  >
                    <span className="px-2 text-center text-xs font-semibold text-ink-soft">{file.name}</span>
                    <IconButton
                      icon="trash"
                      label="Remove this photo"
                      variant="ghost"
                      pixel
                      className="absolute -right-2 -top-2 bg-surface shadow-soft"
                      onClick={() => removePending(index)}
                    />
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              aria-label="Add photo"
              onChange={(e) => {
                handleFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <Button
              variant="secondary"
              className="mt-3"
              leadingIcon={<Icon name="image" size={18} pixel />}
              onClick={() => fileInputRef.current?.click()}
            >
              Add photo
            </Button>
            {imageError && (
              <p role="alert" className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-error-ink">
                <Icon name="alert" size={16} />
                {imageError}
              </p>
            )}
          </div>

          {formError && (
            <p role="alert" className="flex items-center gap-1.5 text-sm font-semibold text-error-ink">
              <Icon name="alert" size={16} />
              {formError}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}

/**
 * Zone create/edit modal. Zones are named, coloured date-range bands; the
 * Delete action only appears when editing an existing zone.
 */
function ZoneModal({
  open,
  zone,
  onClose,
  onSaved,
}: {
  open: boolean
  zone: TimelineZone | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const repo = useRepository()
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(zonePalette.sage)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(zone?.name ?? '')
    setColor(zone?.color ?? zonePalette.sage)
    setStartDate(zone?.startDate ?? '')
    setEndDate(zone?.endDate ?? '')
    setFormError(null)
  }, [open, zone])

  const handleSave = async () => {
    if (!name.trim()) {
      setFormError('Name your zone')
      return
    }
    if (!startDate) {
      setFormError('Pick a start date')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      await repo.saveZone({
        id: zone?.id,
        name: name.trim(),
        color,
        startDate,
        endDate: endDate || null,
      })
      await onSaved()
      onClose()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save the zone')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!zone) return
    setSaving(true)
    try {
      await repo.deleteZone(zone.id)
      await onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={zone ? 'Edit zone' : 'Add zone'}
      footer={
        <>
          {zone && (
            <Button variant="danger" onClick={() => void handleDelete()} loading={saving}>
              Delete zone
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            loading={saving}
            leadingIcon={<Icon name="flag" size={18} pixel />}
          >
            Save zone
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextInput
          label="Name"
          required
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="A chapter, a season, a phase…"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Start date"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <TextInput
            label="End date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <ColorPicker value={color} onChange={setColor} />
        {formError && (
          <p role="alert" className="flex items-center gap-1.5 text-sm font-semibold text-error-ink">
            <Icon name="alert" size={16} />
            {formError}
          </p>
        )}
      </div>
    </Modal>
  )
}

/**
 * Personal Timeline — a vertical spine of user-defined zone bands and entry
 * cards. Entries carry title, date range, zone tag, description and up to
 * five images; zones are standalone coloured date-range bands that entries
 * fall into by their start date.
 */
export function TimelineScreen() {
  const navigate = useNavigate()
  const repo = useRepository()
  const [loaded, setLoaded] = useState(false)
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [zones, setZones] = useState<TimelineZone[]>([])
  const [imagesByEntry, setImagesByEntry] = useState<Record<string, ImageRef[]>>({})
  const [orientation, setOrientation] = useState<TimelineOrientation>(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(min-width: 768px)').matches
      ? 'horizontal'
      : 'vertical',
  )
  const [entryModal, setEntryModal] = useState<{
    open: boolean
    entry: TimelineEntry | null
    viewing: boolean
  }>({
    open: false,
    entry: null,
    viewing: false,
  })
  const [zoneModal, setZoneModal] = useState<{ open: boolean; zone: TimelineZone | null }>({
    open: false,
    zone: null,
  })
  const [deleteTarget, setDeleteTarget] = useState<TimelineEntry | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const [nextEntries, nextZones, profile] = await Promise.all([
        repo.listTimelineEntries(),
        repo.listZones(),
        repo.getProfile(),
      ])
      if (cancelled) return
      setEntries(nextEntries)
      setZones(nextZones)
      if (profile?.timelineOrientation) setOrientation(profile.timelineOrientation)
      const images: Record<string, ImageRef[]> = {}
      await Promise.all(nextEntries.map(async (entry) => (images[entry.id] = await repo.listImages(entry.id))))
      if (cancelled) return
      setImagesByEntry(images)
      setLoaded(true)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [repo])

  const reload = useCallback(async () => {
    const [nextEntries, nextZones] = await Promise.all([repo.listTimelineEntries(), repo.listZones()])
    setEntries(nextEntries)
    setZones(nextZones)
    const images: Record<string, ImageRef[]> = {}
    await Promise.all(nextEntries.map(async (entry) => (images[entry.id] = await repo.listImages(entry.id))))
    setImagesByEntry(images)
  }, [repo])

  const refreshEntryImages = useCallback(async (entryId: string) => {
    const images = await repo.listImages(entryId)
    setImagesByEntry((prev) => ({ ...prev, [entryId]: images }))
  }, [repo])

  const changeOrientation = (next: TimelineOrientation) => {
    setOrientation(next)
    // Persist like pins: fire-and-forget, optimistic local state. Spread the
    // fetched profile so future fields are never dropped.
    void (async () => {
      try {
        const profile = await repo.getProfile()
        await repo.setProfile({
          ...(profile ?? DEFAULT_PROFILE),
          timelineOrientation: next,
        })
      } catch {
        // Orientation still applies for this session.
      }
    })()
  }

  const openEntry = (entry: TimelineEntry | null, viewing = false) =>
    setEntryModal({ open: true, entry, viewing })
  const closeEntry = () => setEntryModal({ open: false, entry: null, viewing: false })
  const openZone = (zone: TimelineZone | null) => setZoneModal({ open: true, zone })
  const closeZone = () => setZoneModal({ open: false, zone: null })

  const deleteEntry = async (entry: TimelineEntry) => {
    await repo.deleteTimelineEntry(entry.id)
    setDeleteTarget(null)
    await reload()
  }

  const deleteImage = async (entryId: string, ref: ImageRef) => {
    await repo.deleteImage(ref)
    await refreshEntryImages(entryId)
  }

  const zoneForEntry = (entry: TimelineEntry) =>
    zones.find(
      (zone) => entry.startDate >= zone.startDate && (zone.endDate === null || entry.startDate <= zone.endDate),
    )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <IconButton
          icon="arrowLeft"
          label="Back to home"
          variant="ghost"
          pixel
          onClick={() => navigate('/')}
        />
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="pixel-tile flex size-10 items-center justify-center rounded-none bg-timeline-100 text-timeline-700 dark:bg-timeline-300/20 dark:text-timeline-300"
          >
            <Icon name="timeline" size={22} pixel />
          </span>
          <h1 className="font-display text-xl font-bold text-ink">Personal Timeline</h1>
        </div>
      </div>

      <Card variant="raised" padding="none" className="pixel-card overflow-hidden">
        {!loaded ? (
          <div role="status" className="p-6 text-sm text-ink-soft">
            Loading your timeline…
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h3 className="font-display flex items-center gap-2 text-xl font-bold text-ink">
                  <span className="pixel-tile flex size-10 items-center justify-center rounded-none bg-timeline-100 text-timeline-700 dark:bg-timeline-300/20 dark:text-timeline-300">
                    <Icon name="timeline" size={22} pixel />
                  </span>
                  My timeline
                </h3>
                <p className="mt-1 text-sm text-ink-soft">Zones you define — your words, your colours.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <SegmentedControl
                  label="Timeline orientation"
                  options={[
                    { value: 'vertical', label: 'Vertical' },
                    { value: 'horizontal', label: 'Horizontal' },
                  ]}
                  value={orientation}
                  onChange={(value) => changeOrientation(value as TimelineOrientation)}
                  className="max-w-56"
                />
                <Button
                  variant="secondary"
                  leadingIcon={<Icon name="plus" size={18} pixel />}
                  onClick={() => openEntry(null)}
                >
                  Add entry
                </Button>
              </div>
            </div>

            {/* Zone legend */}
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
              <span className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">Zones</span>
              {zones.map((zone) => (
                <span key={zone.id} className="flex items-center gap-1">
                  <Chip
                    className="pixel-chip"
                    icon={<span className="size-2.5 rounded-full" style={{ backgroundColor: zone.color }} />}
                  >
                    {zone.name}
                  </Chip>
                  <IconButton
                    icon="edit"
                    label={`Edit zone "${zone.name}"`}
                    variant="ghost"
                    pixel
                    onClick={() => openZone(zone)}
                  />
                </span>
              ))}
              <Button
                variant="secondary"
                leadingIcon={<Icon name="flag" size={18} pixel />}
                onClick={() => openZone(null)}
              >
                Add zone
              </Button>
            </div>

            {/* Body */}
            {entries.length === 0 && zones.length === 0 ? (
              <EmptyState
                icon="timeline"
                title="Nothing here yet"
                body="Your timeline starts empty on purpose. When you're ready, add a moment — a place, a person, a turning point."
                action={
                  <Button
                    variant="secondary"
                    leadingIcon={<Icon name="plus" size={18} pixel />}
                    onClick={() => openEntry(null)}
                  >
                    Add your first entry
                  </Button>
                }
              />
            ) : orientation === 'horizontal' ? (
              <TimelineHorizontal
                entries={entries}
                zones={zones}
                imagesByEntry={imagesByEntry}
                onOpenEntry={(entry) => openEntry(entry, true)}
                onEditEntry={(entry) => openEntry(entry, false)}
                onDeleteEntry={setDeleteTarget}
              />
            ) : (
              <ol className="flex flex-col gap-0 p-5">
                {entries.map((entry, index) => {
                  const zone = zoneForEntry(entry)
                  const last = index === entries.length - 1
                  const images = imagesByEntry[entry.id] ?? []
                  return (
                    <li key={entry.id} className={cx('relative flex gap-4 pb-8', last && 'pb-0')}>
                      {/* Spine */}
                      <span className="relative flex w-8 shrink-0 flex-col items-center">
                        <span
                          className="mt-3 size-4 rounded-full border-2 bg-surface"
                          style={{ borderColor: zone?.color }}
                        />
                        {!last && <span className="mt-1 w-px flex-1 bg-line-strong" aria-hidden="true" />}
                      </span>

                      {/* Zone edge band behind the entry */}
                      {zone && (
                        <span
                          aria-hidden="true"
                          data-zone-band="true"
                          className="absolute inset-y-0 right-0 w-1.5 rounded-full"
                          style={{ backgroundColor: zone.color }}
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <Card variant="soft" padding="md" className="w-full">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="text-base font-extrabold text-ink">{entry.title}</h4>
                            <div className="flex items-center gap-1">
                              <IconButton
                                icon="edit"
                                label={`Edit "${entry.title}"`}
                                variant="ghost"
                                pixel
                                onClick={() => openEntry(entry)}
                              />
                              <IconButton
                                icon="trash"
                                label={`Delete "${entry.title}"`}
                                variant="ghost"
                                pixel
                                onClick={() => setDeleteTarget(entry)}
                              />
                            </div>
                          </div>
                          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
                            <Icon name="calendar" size={14} pixel />
                            <time dateTime={entry.startDate}>{formatDate(entry.startDate)}</time>
                            {entry.endDate && (
                              <>
                                <span aria-hidden="true">→</span>
                                <time dateTime={entry.endDate}>{formatDate(entry.endDate)}</time>
                              </>
                            )}
                          </p>
                          {zone && (
                            <p className="mt-2">
                              <Chip tone="timeline" icon={<Icon name="flag" size={13} pixel />}>
                                {zone.name}
                              </Chip>
                            </p>
                          )}
                          {entry.description && (
                            <p className="mt-2 text-base leading-relaxed text-ink">{entry.description}</p>
                          )}
                          {images.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-3">
                              {images.map((ref) => (
                                <div key={ref.id} className="relative">
                                  <img
                                    src={ref.url}
                                    alt={entry.title}
                                    className="h-24 w-24 rounded-lg border border-line object-cover"
                                  />
                                  <IconButton
                                    icon="trash"
                                    label={`Remove photo from "${entry.title}"`}
                                    variant="ghost"
                                    pixel
                                    className="absolute -right-2 -top-2 bg-surface shadow-soft"
                                    onClick={() => void deleteImage(entry.id, ref)}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </Card>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </>
        )}
      </Card>

      <EntryModal
        open={entryModal.open}
        entry={entryModal.entry}
        zone={entryModal.entry ? (zoneForEntry(entryModal.entry) ?? null) : null}
        viewing={entryModal.viewing}
        onClose={closeEntry}
        onEdit={() => setEntryModal((prev) => ({ ...prev, viewing: false }))}
        onSaved={reload}
      />
      <ZoneModal open={zoneModal.open} zone={zoneModal.zone} onClose={closeZone} onSaved={reload} />
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete this entry?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => deleteTarget && void deleteEntry(deleteTarget)}>
              Delete entry
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-soft">
          This permanently deletes “{deleteTarget?.title}” and its photos from your timeline. It
          cannot be undone.
        </p>
      </Modal>
    </div>
  )
}