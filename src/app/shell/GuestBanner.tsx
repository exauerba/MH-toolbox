import { useState } from 'react';
import { Alert } from '../../design';
import { useAuthMode } from '../../data/RepositoryProvider';

const DISMISS_KEY = 'steady:guest-banner-dismissed';

/**
 * Shown while a user is signed out: everything is stored on this device.
 * Dismissal is per session — the reminder returns on the next visit.
 */
export function GuestBanner() {
  const { mode } = useAuthMode();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === '1',
  );

  if (mode === 'signed-in') return null;

  if (dismissed) return null;

  return (
    <Alert
      variant="info"
      title="Guest mode"
      dismissible
      pixel
      onDismiss={() => {
        setDismissed(true);
        try {
          sessionStorage.setItem(DISMISS_KEY, '1');
        } catch {
          // Session storage unavailable — banner stays dismissible in memory.
        }
      }}
    >
      Using locally on this device — sign in to back this up.
    </Alert>
  );
}
