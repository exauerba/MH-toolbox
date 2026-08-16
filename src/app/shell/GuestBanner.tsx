import { useState } from 'react';
import { Alert } from '../../design';

const DISMISS_KEY = 'steady:guest-banner-dismissed';

/**
 * Shown while a user is signed out: everything is stored on this device.
 * Dismissal is per session — the reminder returns on the next visit.
 */
export function GuestBanner() {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === '1',
  );

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
