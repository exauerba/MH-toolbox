import { useState } from 'react'
import type { DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Chip,
  Icon,
  IconButton,
  Tile,
  cx,
} from '../../design'
import {
  TOOLS,
  toolById,
  type ToolConfig,
  type ToolId,
} from '../../tools/tools.config'
import { usePinnedTools } from './pins'

interface ToolCardProps {
  tool: ToolConfig
  pinned: boolean
  showGrip?: boolean
  onTogglePin: (id: ToolId) => void
  onOpen: (tool: ToolConfig) => void
  onMoveUp?: () => void
  moveUpDisabled?: boolean
  onMoveDown?: () => void
  moveDownDisabled?: boolean
  draggable?: boolean
  onDragStart?: (e: DragEvent) => void
  onDragOver?: (e: DragEvent) => void
  onDrop?: (e: DragEvent) => void
  onDragEnd?: () => void
  isDragging?: boolean
}

function ToolCard({
  tool,
  pinned,
  showGrip,
  onTogglePin,
  onOpen,
  onMoveUp,
  moveUpDisabled,
  onMoveDown,
  moveDownDisabled,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
}: ToolCardProps) {
  const action = tool.comingSoon ? null : (
    <Button
      size="md"
      variant={pinned ? 'primary' : 'secondary'}
      className="pixel-btn min-w-0 flex-1"
      leadingIcon={
        <Icon
          name={tool.externalUrl ? 'external' : 'arrowRight'}
          size={16}
          pixel
        />
      }
      onClick={() => onOpen(tool)}
    >
      Open
    </Button>
  )

  const pin = tool.comingSoon ? null : (
    <IconButton
      icon="star"
      label={pinned ? `Unpin ${tool.name} from home` : `Pin ${tool.name} to home`}
      variant={pinned ? 'soft' : 'ghost'}
      filled={pinned}
      pixel
      aria-pressed={pinned}
      onClick={() => onTogglePin(tool.id)}
    />
  )

  const reorderControls = showGrip ? (
    <span className="flex items-center gap-0.5">
      <span aria-hidden="true" className="text-ink-soft">
        <Icon name="grip" size={18} pixel />
      </span>
      <IconButton
        icon="arrowUp"
        label={`Move ${tool.name} up`}
        variant="ghost"
        pixel
        disabled={moveUpDisabled}
        onClick={onMoveUp}
      />
      <IconButton
        icon="arrowDown"
        label={`Move ${tool.name} down`}
        variant="ghost"
        pixel
        disabled={moveDownDisabled}
        onClick={onMoveDown}
      />
    </span>
  ) : null

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cx('h-full', isDragging && 'opacity-50')}
    >
      <Card
        as="article"
        variant="tile"
        padding="md"
        className="pixel-card flex h-full flex-col gap-3"
      >
        <div className="flex items-start justify-between gap-3">
          <Tile icon={tool.icon} accent={tool.accent} size="lg" className="shrink-0" />
          {reorderControls}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="flex flex-wrap items-center gap-2 text-base font-extrabold text-ink">
            {tool.name}
            {tool.comingSoon && (
              <Chip tone="neutral" className="pixel-chip">
                Soon
              </Chip>
            )}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            {tool.description}
          </p>
        </div>

        {(action || pin) && (
          <div className="mt-1 flex items-center gap-2">
            {action}
            {pin}
          </div>
        )}
      </Card>
    </div>
  )
}

/**
 * The steady hub — a quiet landing page, not a dashboard. Pinned tools sit
 * at the top ("Your tools"), everything else lives in the directory below.
 */
export function HubHome() {
  const { pinned, togglePin, movePin, reorder } = usePinnedTools()
  const navigate = useNavigate()
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  const pinnedTools = pinned
    .map(toolById)
    .filter((tool) => !tool.comingSoon)
  const directoryTools = TOOLS.filter(
    (tool) => !pinned.includes(tool.id) || tool.comingSoon,
  )

  const openTool = (tool: ToolConfig) => {
    if (tool.externalUrl) {
      // Same-tab hand-off so bloom never feels like leaving steady.
      window.location.href = tool.externalUrl
    } else if (tool.route) {
      navigate(tool.route)
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="font-display max-w-2xl text-3xl font-bold leading-tight text-ink sm:text-4xl">
          A toolbox you can hold onto.
        </h1>
        <p className="mt-3 max-w-prose text-lg leading-relaxed text-ink-soft">
          Energy, mood, and the shape of your own story — warm, quiet, and
          never clinical. Everything stays on this device.
        </p>
      </header>

      <section aria-labelledby="pinned-heading">
        <h2
          id="pinned-heading"
          className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink-soft"
        >
          <Icon name="star" size={15} filled pixel />
          Your tools
        </h2>
        {pinnedTools.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {pinnedTools.map((tool, i) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                pinned
                showGrip
                onTogglePin={togglePin}
                onOpen={openTool}
                onMoveUp={() => movePin(tool.id, -1)}
                moveUpDisabled={i === 0}
                onMoveDown={() => movePin(tool.id, 1)}
                moveDownDisabled={i === pinnedTools.length - 1}
                draggable
                onDragStart={(e) => {
                  setDraggingIndex(i)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggingIndex !== null && draggingIndex !== i) {
                    reorder(draggingIndex, i)
                  }
                  setDraggingIndex(null)
                }}
                onDragEnd={() => setDraggingIndex(null)}
                isDragging={draggingIndex === i}
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-line p-4 text-sm text-ink-soft">
            Nothing pinned yet — tap the star on any tool to keep it at the
            top.
          </p>
        )}
      </section>

      <section aria-labelledby="directory-heading">
        <h2
          id="directory-heading"
          className="text-sm font-extrabold uppercase tracking-wide text-ink-soft"
        >
          All tools
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {directoryTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              pinned={false}
              onTogglePin={togglePin}
              onOpen={openTool}
            />
          ))}
        </div>
      </section>
    </div>
  )
}