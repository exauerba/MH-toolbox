import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, EmptyState, Icon, IconButton, SegmentedControl } from '../../design'
import type { IconName } from '../../design'
import { useRepository } from '../../data/RepositoryProvider'
import type { ImageRef, LanternLevel, LanternScale, LanternScaleInput } from '../../data/types'
import { seedStarterScale } from './demoData'
import { PartnersTab } from './PartnersTab'
import { PresentMode } from './PresentMode'
import { ScaleTab } from './ScaleTab'
import { ShareTab } from './ShareTab'

type LanternTab = 'scale' | 'show' | 'share' | 'partners'

export function LanternScreen() {
  const repo = useRepository()
  const navigate = useNavigate()

  const [tab, setTab] = useState<LanternTab>('scale')
  const [scale, setScale] = useState<LanternScale | null>(null)
  const [imagesByLevel, setImagesByLevel] = useState<Record<string, ImageRef[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [presenting, setPresenting] = useState(false)

  const loadImages = useCallback(
    async (levels: LanternLevel[]): Promise<Record<string, ImageRef[]>> => {
      const entries = await Promise.all(
        levels.map(async (level) => {
          const refs = await repo.listLanternImages(level.id)
          return [level.id, refs] as const
        }),
      )
      return Object.fromEntries(entries)
    },
    [repo],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await repo.getLanternScale()
      setScale(data)
      if (data) {
        setImagesByLevel(await loadImages(data.levels))
      } else {
        setImagesByLevel({})
      }
    } catch {
      setError('Failed to load your lantern')
    } finally {
      setLoading(false)
    }
  }, [repo, loadImages])

  useEffect(() => {
    void load()
  }, [load])

  const handleSaveScale = async (input: LanternScaleInput) => {
    setSaving(true)
    setError(null)
    try {
      const saved = await repo.saveLanternScale(input)
      setScale(saved)
      setImagesByLevel(await loadImages(saved.levels))
    } catch {
      setError('Failed to save your lantern')
    } finally {
      setSaving(false)
    }
  }

  const handleUploadImage = async (file: File, levelId: string) => {
    setError(null)
    try {
      await repo.uploadLanternImage(file, levelId)
      setImagesByLevel(await loadImages(scale?.levels ?? []))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add photo')
    }
  }

  const handleDeleteImage = async (ref: ImageRef) => {
    setError(null)
    try {
      await repo.deleteLanternImage(ref)
      setImagesByLevel(await loadImages(scale?.levels ?? []))
    } catch {
      setError('Could not remove photo')
    }
  }

  const handleSeed = async () => {
    if (seeding) return
    setSeeding(true)
    setError(null)
    try {
      await seedStarterScale(repo)
      await load()
    } catch {
      setError('Could not create your starter scale')
    } finally {
      setSeeding(false)
    }
  }

  const header = (
    <header className="mb-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <IconButton
          icon="arrowLeft"
          label="Back to home"
          variant="ghost"
          round
          className="bg-lantern-100/60 text-ink-soft hover:bg-lantern-100"
          onClick={() => navigate('/')}
        />
        <h1 className="text-3xl font-medium tracking-tight text-ink">Lantern</h1>
      </div>
    </header>
  )

  const tabs: { value: string; label: string; icon: IconName }[] = [
    { value: 'scale', label: 'Scale', icon: 'lantern' },
    { value: 'show', label: 'Show', icon: 'play' },
    { value: 'share', label: 'Share', icon: 'share' },
    { value: 'partners', label: 'Partners', icon: 'user' },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden bg-lantern-50 py-8 px-4 sm:px-8">
      {/* Ambient glow — a soft lantern light behind the card */}
      <div className="pointer-events-none absolute -inset-20 z-0">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-lantern-200/50 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-lantern-300/30 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl">
        {header}

        <Card
          variant="soft"
          padding="lg"
          className="overflow-hidden border-none bg-surface/80 shadow-tactile-mid backdrop-blur-md"
        >
          <SegmentedControl
            label="Sections"
            value={tab}
            onChange={(value) => setTab(value as LanternTab)}
            className="mb-6 border-lantern-200/40 bg-lantern-50/60 sm:mb-8"
            options={tabs}
            wrap
          />

          {error && (
            <div className="mb-6 rounded-2xl bg-error-soft px-4 py-3 text-sm text-error-ink">{error}</div>
          )}

          {loading ? (
            <div data-testid="loading-lantern" className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 w-full animate-pulse rounded-2xl bg-lantern-100/60" />
              ))}
            </div>
          ) : !scale ? (
            <EmptyState
              icon="lantern"
              title="Light your lantern"
              body="Build a scale of how you feel — from grounded to your hardest moment — with the words and actions that help at each step. Then hand it to the people who love you."
              action={
                <Button
                  onClick={handleSeed}
                  disabled={seeding}
                  leadingIcon={<Icon name="sparkle" size={16} pixel />}
                >
                  Start with a warm starter scale
                </Button>
              }
            />
          ) : tab === 'scale' ? (
            <ScaleTab
              scale={scale}
              imagesByLevel={imagesByLevel}
              saving={saving}
              onSaveScale={handleSaveScale}
              onUploadImage={handleUploadImage}
              onDeleteImage={handleDeleteImage}
            />
          ) : tab === 'show' ? (
            <div className="animate-pop-in space-y-6 py-8 text-center">
              <Icon name="lantern" size={48} className="mx-auto text-lantern-400" />
              <h3 className="text-xl font-semibold text-ink">Present mode</h3>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-ink-soft">
                First, tap where you are on your scale. Then hand your phone to someone you
                trust — they'll see one level at a time, what it looks like for you, and
                exactly what helps.
              </p>
              <Button
                className="rounded-full bg-lantern-600 text-white shadow-tactile-mid hover:bg-lantern-700"
                leadingIcon={<Icon name="play" size={16} />}
                onClick={() => setPresenting(true)}
              >
                Start presenting
              </Button>
            </div>
          ) : tab === 'partners' ? (
            <PartnersTab scale={scale} onError={setError} />
          ) : (
            <ShareTab scale={scale} onError={setError} />
          )}
        </Card>
      </div>

      {scale && (
        <PresentMode
          open={presenting}
          onClose={() => setPresenting(false)}
          scale={scale}
          imagesByLevel={imagesByLevel}
        />
      )}
    </div>
  )
}