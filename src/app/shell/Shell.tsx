import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { GuestBanner } from './GuestBanner';
import { RouteTransition } from './RouteTransition';

/**
 * Page chrome around every route: sticky header with nav, the guest
 * reminder, a warm-canvas container, and a quiet footer. The route
 * transition keys on pathname so only the page body animates.
 */
export function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  // The styleguide is a dev-only surface — keep it free of app chrome.
  const isStyleguide = pathname === '/styleguide';

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="w-full flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          {!isStyleguide && (
            <div className="mb-6">
              <GuestBanner />
            </div>
          )}
          <RouteTransition>{children}</RouteTransition>
        </div>
      </main>
      <footer className="mt-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
          <p className="text-center text-sm text-ink-faint">
            steady — warm, quiet, and never clinical.
          </p>
        </div>
      </footer>
    </div>
  );
}
