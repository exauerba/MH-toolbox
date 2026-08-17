import { Card, Icon, SegmentedControl } from '../../design';
import { useTheme } from '../../app/shell/theme';
import { AccountCard } from './AccountCard';
import { DeleteAccountCard } from './DeleteAccountCard';
import { DeleteDataCard } from './DeleteDataCard';
import { ExportCard } from './ExportCard';

/**
 * Settings — a calm surface, not a wall of options. Theme works now;
 * account and data actions describe what's coming and stay honest about it.
 */
export function SettingsScreen() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          Settings
        </h1>
        <p className="mt-3 max-w-prose text-lg leading-relaxed text-ink-soft">
          Make steady yours. Nothing here is ever shared unless you sign in.
        </p>
      </header>

      <Card padding="lg" className="pixel-card">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink">
          <Icon name="moon" size={18} pixel />
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
            pixel
          />
        </div>
      </Card>

      <Card padding="lg" className="pixel-card">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink">
          <Icon name="lock" size={18} pixel />
          Your data
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          <AccountCard />

          <ExportCard />

          <DeleteDataCard />

          <DeleteAccountCard />
        </div>
      </Card>
    </div>
  );
}
