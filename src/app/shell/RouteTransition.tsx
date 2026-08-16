import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * One subtle authored moment per route change: the incoming screen fades in
 * and rises 8px (--dur-slow / --ease-out via .animate-slide-up). Remounting
 * on pathname keeps the transition clean, and the global reduced-motion
 * kill-switch collapses it to an instant swap.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="animate-slide-up">
      {children}
    </div>
  );
}
