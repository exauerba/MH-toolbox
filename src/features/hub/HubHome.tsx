import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Chip,
  Icon,
  IconButton,
  cx,
} from '../../design';
import {
  TOOLS,
  toolById,
  accentTileClass,
  type ToolConfig,
  type ToolId,
} from '../../tools/tools.config';
import { usePinnedTools } from './pins';

interface ToolCardProps {
  tool: ToolConfig;
  pinned: boolean;
  showGrip?: boolean;
  onTogglePin: (id: ToolId) => void;
  onOpen: (tool: ToolConfig) => void;
}

function ToolCard({
  tool,
  pinned,
  showGrip,
  onTogglePin,
  onOpen,
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
  );

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
  );

  return (
    <Card
      as="article"
      variant="tile"
      padding="md"
      className="pixel-card flex h-full flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          aria-hidden="true"
          className={cx(
            'pixel-tile flex size-12 shrink-0 items-center justify-center',
            accentTileClass[tool.accent],
          )}
        >
          <Icon name={tool.icon} size={26} pixel />
        </span>
        {showGrip && (
          <span aria-hidden="true" className="text-ink-faint">
            <Icon name="grip" size={18} pixel />
          </span>
        )}
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
          {tool.tagline}
        </p>
      </div>

      {(action || pin) && (
        <div className="mt-1 flex items-center gap-2">
          {action}
          {pin}
        </div>
      )}
    </Card>
  );
}

/**
 * The steady hub — a quiet landing page, not a dashboard. Pinned tools sit
 * at the top ("Your tools"), everything else lives in the directory below.
 */
export function HubHome() {
  const { pinned, togglePin } = usePinnedTools();
  const navigate = useNavigate();

  const pinnedTools = pinned
    .map(toolById)
    .filter((tool) => !tool.comingSoon);
  const directoryTools = TOOLS.filter(
    (tool) => !pinned.includes(tool.id) || tool.comingSoon,
  );

  const openTool = (tool: ToolConfig) => {
    if (tool.externalUrl) {
      // Same-tab hand-off so bloom never feels like leaving steady.
      window.location.href = tool.externalUrl;
    } else if (tool.route) {
      navigate(tool.route);
    }
  };

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
            {pinnedTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                pinned
                showGrip
                onTogglePin={togglePin}
                onOpen={openTool}
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
  );
}
