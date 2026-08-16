import { Card, Icon, IconButton, SegmentedControl } from '../../design';
import { useTheme } from '../../app/shell/theme';

/**
 * Settings — a calm surface, not a wall of options. Theme works now;
 * account and data actions describe what's coming and stay honest about it.
 */
export function SettingsScreen() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-extrabold text-ink sm:text-4xl">
          Settings
        </h1>
        <p className="mt-3 max-w-prose text-lg leading-relaxed text-ink-soft">
          Make steady yours. Nothing here is ever shared unless you sign in.
        </p>
      </header>

      <Card padding="lg">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink">
          <Icon name="moon" size={18} />
          Appearance
        </h2>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-sm">
            <p className="font-bold text-ink">Theme</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              Light keeps the pages warm; dark is easier on the eyes at night.
            </p>
          </div>
          <SegmentedControl
            label="Theme"
            value={theme}
            onChange={(value) => setTheme(value as 'light' | 'dark')}
            className="w-44"
            options={[
              { value: 'light', label: 'Light', icon: 'sun' },
              { value: 'dark', label: 'Dark', icon: 'moon' },
            ]}
          />
        </div>
      </Card>

      <Card padding="lg">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink">
          <Icon name="lock" size={18} />
          Your data
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-muted px-3 py-2">
            <div className="min-w-0">
              <p className="font-bold text-ink">Account</p>
              <p className="text-sm text-ink-soft">
                Using steady locally on this device. Sign in to back your tools
                up across devices.
              </p>
            </div>
            <IconButton
              icon="lock"
              label="Sign in — coming soon"
              variant="secondary"
              disabled
              className="disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-muted px-3 py-2">
            <div className="min-w-0">
              <p className="font-bold text-ink">Export your data</p>
              <p className="text-sm text-ink-soft">
                Download everything steady keeps for you, as a file you own.
              </p>
            </div>
            <IconButton
              icon="download"
              label="Export data — coming soon"
              variant="secondary"
              disabled
              className="disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-muted px-3 py-2">
            <div className="min-w-0">
              <p className="font-bold text-ink">Delete your data</p>
              <p className="text-sm text-ink-soft">
                Wipe your tools from this device. This can't be undone.
              </p>
            </div>
            <IconButton
              icon="trash"
              label="Delete data — coming soon"
              variant="secondary"
              disabled
              className="disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
