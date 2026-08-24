import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert } from '../../design';
import { useAuthMode } from '../../data/RepositoryProvider';

const DISMISS_KEY = 'steady:guest-banner-dismissed';

/**
 * Shown while a user is signed out: everything is stored on this device.
 * The whole banner is a button that takes the user to the sign-in form on
 * the Settings screen. Dismissal is per session — the reminder returns on
 * the next visit.
 */
export function GuestBanner() {
  const { mode } = useAuthMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === '1',
  );

  if (mode === 'signed-in') return null;

  // The sign-in form lives on Settings — the banner is redundant there.
  if (location.pathname === '/settings') return null;

  if (dismissed) return null;

  return (
    <Alert
      variant="info"
      title="Guest mode"
      dismissible
      pixel
      onClick={() => navigate('/settings', { state: { openSignIn: true } })}
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
