import { useEffect, useRef, useState } from 'react'
import {
  Button,
  Chip,
  Icon,
  IconButton,
  Modal,
  Stepper,
} from '../../design'
import { cx } from '../../design/cx'
import { assertImageAllowed, MAX_IMAGES_PER_LEVEL } from '../../data/imageRules'
import type { ImageRef, LanternLevel, LanternScale, LanternScaleInput } from '../../data/types'
import { toneForLevel } from './present'

export interface ScaleTabProps {
  scale: LanternScale
  imagesByLevel: Record<string, ImageRef[]>
  saving: boolean
  onSaveScale: (input: LanternScaleInput) => Promise<void>
  onUploadImage: (file: File, levelId: string) => Promise<void>
  onDeleteImage: (ref: ImageRef) => Promise<void>
}

const MIN_LEVELS = 3
const MAX_LEVELS = 12

/** A fresh blank level for when the scale grows. */
function blankLevel(position: number): LanternLevel {
  return {
    id: crypto.randomUUID(),
    position,
    label: `Level ${position}`,
    description: '',
    actions: [],
  }
}

/** Rebuild the level list for a new count, preserving existing content. */
function resizeLevels(levels: LanternLevel[], count: number): LanternLevel[] {
  const kept = levels
    .filter((l) => l.position <= count)
    .map((l) => ({ ...l }))
  const added: LanternLevel[] = []
  for (let p = kept.length + 1; p <= count; p += 1) {
    added.push(blankLevel(p))
  }
  return [...kept, ...added]
}

function LevelEditorModal({
  level,
  levelCount,
  images,
  saving,
  onClose,
  onSave,
  onUploadImage,
  onDeleteImage,
}: {
  level: LanternLevel
  levelCount: number
  images: ImageRef[]
  saving: boolean
  onClose: () => void
  onSave: (level: LanternLevel) => void
  onUploadImage: (file: File, levelId: string) => Promise<void>
  onDeleteImage: (ref: ImageRef) => Promise<void>
}) {
  const [label, setLabel] = useState(level.label)
  const [description, setDescription] = useState(level.description)
  const [actions, setActions] = useState<string[]>(level.actions)
  const [actionDraft, setActionDraft] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const addAction = () => {
    const value = actionDraft.trim()
    if (!value) return
    if (actions.includes(value)) {
      setActionDraft('')
      return
    }
    setActions([...actions, value])
    setActionDraft('')
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setUploadError(null)
    try {
      assertImageAllowed(file)
      setUploading(true)
      await onUploadImage(file, level.id)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not add photo')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const tone = toneForLevel(level, levelCount)

  return (
    <Modal
      open
      onClose={onClose}
      title={`Level ${level.position}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave({ ...level, label: label.trim() || level.label, description: description.trim(), actions })}
            disabled={saving || !label.trim()}
            leadingIcon={<Icon name="check" size={16} />}
          >
            Save level
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="lantern-level-label" className="block text-sm font-medium text-ink-soft">
            What this level is called
          </label>
          <input
            id="lantern-level-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Overwhelmed"
            className="h-11 w-full rounded-2xl border-none bg-surface-muted px-4 text-ink transition-colors focus:bg-white focus:ring-2 focus:ring-lantern-400"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="lantern-level-description" className="block text-sm font-medium text-ink-soft">
            What this looks like for me
          </label>
          <textarea
            id="lantern-level-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What you might notice, say, or feel at this level…"
            className="block w-full rounded-2xl border-none bg-surface-muted px-4 py-3 text-sm text-ink transition-colors focus:bg-white focus:ring-2 focus:ring-lantern-400"
          />
        </div>

        <div className="space-y-2">
          <span className="block text-sm font-medium text-ink-soft">What helps right now</span>
          <div className="flex flex-wrap gap-2">
            {actions.map((a, i) => (
              <div key={i} className="flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink">
                <span>{a}</span>
                <button
                  type="button"
                  aria-label={`Remove action: ${a}`}
                  onClick={() => setActions(actions.filter((_, idx) => idx !== i))}
                  className="text-ink-soft hover:text-error-ink"
                >
                  ×
                </button>
              </div>
            ))}
            {actions.length === 0 && (
              <p className="text-sm italic text-ink-soft">No actions yet — add the first one below.</p>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={actionDraft}
              onChange={(e) => setActionDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addAction()
                }
              }}
              placeholder="e.g. Sit with me, no talking"
              className="h-11 flex-1 rounded-2xl border-none bg-surface-muted px-4 text-sm text-ink transition-colors focus:bg-white focus:ring-2 focus:ring-lantern-400"
            />
            <Button variant="secondary" onClick={addAction} disabled={!actionDraft.trim()}>
              Add
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <span className="block text-sm font-medium text-ink-soft">
            Photos ({images.length}/{MAX_IMAGES_PER_LEVEL})
          </span>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {images.map((img) => (
                <div key={img.id} className="relative">
                  <img
                    src={img.url}
                    alt=""
                    className="h-24 w-24 rounded-2xl border border-line object-cover shadow-tactile-low"
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => void onDeleteImage(img)}
                    className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-surface text-ink-soft shadow-tactile-mid hover:text-error-ink"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {images.length < MAX_IMAGES_PER_LEVEL && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => void handleFile(e.target.files?.[0])}
              />
              <Button
                variant="secondary"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                leadingIcon={<Icon name="image" size={16} />}
              >
                {uploading ? 'Adding…' : 'Add a photo'}
              </Button>
            </>
          )}
          {uploadError && <p className="text-sm text-error-ink">{uploadError}</p>}
          <p className="text-xs text-ink-soft">
            Photos stay private to you — they only appear in present mode, never in a shared link.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-lantern-50 px-4 py-3 text-sm text-lantern-700">
          <Icon name="lantern" size={16} />
          <span>
            Tone: <strong>{tone}</strong> — shown to your person in present mode.
          </span>
        </div>
      </div>
    </Modal>
  )
}

function LevelRow({
  level,
  levelCount,
  images,
  onEdit,
  onDelete,
}: {
  level: LanternLevel
  levelCount: number
  images: ImageRef[]
  onEdit: () => void
  onDelete: () => void
}) {
  const tone = toneForLevel(level, levelCount)
  return (
    <li className="rounded-2xl border border-line bg-surface p-4 shadow-tactile-low">
      <div className="flex items-start gap-3">
        <div
          className={cx(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-extrabold',
            tone === 'crisis'
              ? 'bg-error-soft text-error-ink'
              : tone === 'high'
                ? 'bg-warning-soft text-warning-ink'
                : 'bg-lantern-100 text-lantern-700',
          )}
          aria-hidden="true"
        >
          {level.position}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-semibold text-ink">{level.label}</p>
            <div className="flex shrink-0 items-center gap-1">
              <IconButton icon="edit" label={`Edit level ${level.position}`} variant="ghost" onClick={onEdit} />
              <IconButton icon="trash" label={`Delete level ${level.position}`} variant="ghost" onClick={onDelete} />
            </div>
          </div>
          {level.description && (
            <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{level.description}</p>
          )}
          {level.actions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {level.actions.slice(0, 3).map((a) => (
                <Chip key={a} tone="neutral" className="text-xs">
                  {a}
                </Chip>
              ))}
              {level.actions.length > 3 && (
                <Chip tone="neutral" className="text-xs">
                  +{level.actions.length - 3} more
                </Chip>
              )}
            </div>
          )}
          {images.length > 0 && (
            <div className="mt-2 flex gap-2">
              {images.slice(0, 3).map((img) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt=""
                  className="h-10 w-10 rounded-lg border border-line object-cover"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

export function ScaleTab({
  scale,
  imagesByLevel,
  saving,
  onSaveScale,
  onUploadImage,
  onDeleteImage,
}: ScaleTabProps) {
  const [draft, setDraft] = useState<LanternScale>(scale)
  const [editingLevel, setEditingLevel] = useState<LanternLevel | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<LanternLevel | null>(null)

  // Re-sync the working copy whenever the persisted scale changes.
  useEffect(() => {
    setDraft(scale)
  }, [scale])

  const persist = (next: LanternScale) => {
    setDraft(next)
    void onSaveScale({
      name: next.name,
      levelCount: next.levelCount,
      levels: next.levels,
    })
  }

  const handleNameChange = (name: string) => {
    persist({ ...draft, name })
  }

  const handleCountChange = (count: number) => {
    persist({ ...draft, levelCount: count, levels: resizeLevels(draft.levels, count) })
  }

  const handleSaveLevel = (level: LanternLevel) => {
    const levels = draft.levels.map((l) => (l.id === level.id ? level : l))
    persist({ ...draft, levels })
    setEditingLevel(null)
  }

  const handleDeleteLevel = (level: LanternLevel) => {
    const levels = draft.levels
      .filter((l) => l.id !== level.id)
      .map((l, i) => ({ ...l, position: i + 1 }))
    persist({ ...draft, levelCount: levels.length, levels })
    setConfirmDelete(null)
  }

  const handleUploadImage = async (file: File, levelId: string) => {
    await onUploadImage(file, levelId)
  }

  const handleDeleteImage = async (ref: ImageRef) => {
    await onDeleteImage(ref)
  }

  const editingImages = editingLevel ? (imagesByLevel[editingLevel.id] ?? []) : []

  return (
    <div className="animate-pop-in space-y-8">
      {/* Scale settings */}
      <div className="space-y-5 rounded-3xl border border-lantern-200/40 bg-lantern-50/40 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <label htmlFor="lantern-scale-name" className="block text-sm font-medium text-ink-soft">
              Scale name
            </label>
            <input
              id="lantern-scale-name"
              type="text"
              value={draft.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="h-11 w-full rounded-2xl border-none bg-surface px-4 text-ink transition-colors focus:bg-white focus:ring-2 focus:ring-lantern-400"
            />
          </div>
          <div className="space-y-2">
            <span className="block text-sm font-medium text-ink-soft">Number of levels</span>
            <Stepper
              value={draft.levelCount}
              onChange={handleCountChange}
              min={MIN_LEVELS}
              max={MAX_LEVELS}
              label="Number of levels"
              disabled={saving}
            />
          </div>
        </div>
        <p className="text-xs leading-relaxed text-ink-soft">
          Level 1 is your most grounded, everyday self. The top level is your hardest moment — it
          always shows crisis resources. You can edit every label, description, action and photo.
        </p>
      </div>

      {/* Level list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">Your levels</h3>
          <span className="text-xs font-medium text-ink-soft">
            {draft.levels.length} of {draft.levelCount}
          </span>
        </div>
        {draft.levels.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-soft">No levels yet.</p>
        ) : (
          <ul className="space-y-3">
            {draft.levels.map((level) => (
              <LevelRow
                key={level.id}
                level={level}
                levelCount={draft.levelCount}
                images={imagesByLevel[level.id] ?? []}
                onEdit={() => setEditingLevel(level)}
                onDelete={() => setConfirmDelete(level)}
              />
            ))}
          </ul>
        )}
      </div>

      {editingLevel && (
        <LevelEditorModal
          level={editingLevel}
          levelCount={draft.levelCount}
          images={editingImages}
          saving={saving}
          onClose={() => setEditingLevel(null)}
          onSave={handleSaveLevel}
          onUploadImage={handleUploadImage}
          onDeleteImage={handleDeleteImage}
        />
      )}

      {confirmDelete && (
        <Modal
          open
          onClose={() => setConfirmDelete(null)}
          title={`Delete level ${confirmDelete.position}?`}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
                Keep it
              </Button>
              <Button
                onClick={() => handleDeleteLevel(confirmDelete)}
                disabled={saving}
                leadingIcon={<Icon name="trash" size={16} />}
              >
                Delete level
              </Button>
            </>
          }
        >
          <p className="text-sm leading-relaxed text-ink-soft">
            “{confirmDelete.label}” and its photos will be removed. Remaining levels renumber
            automatically.
          </p>
        </Modal>
      )}
    </div>
  )
}