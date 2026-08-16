import { useNavigate } from 'react-router-dom';
import { Icon, IconButton } from '../../design';
import { TimelineHero } from '../../design/hero/TimelineHero';

/**
 * The Personal Timeline tool space — sage accent identity, back to the
 * hub, and the timeline preview rendered without its implementation spec.
 */
export function TimelineScreen() {
  const navigate = useNavigate();

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

      <TimelineHero spec={false} />
    </div>
  );
}
