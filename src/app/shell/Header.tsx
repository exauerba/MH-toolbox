import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon, IconButton, cx } from '../../design';
import { useTheme } from './theme';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: 'home' as const, end: true },
  { to: '/settings', label: 'Settings', icon: 'settings' as const, end: false },
  { to: '/about', label: 'About', icon: 'info' as const, end: false },
];

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      // Collapse when scrolling down past the header; reveal when scrolling up.
      if (y > 96 && delta > 4) setHidden(true);
      else if (delta < -4 || y <= 96) setHidden(false);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cx(
        'sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-sm',
        'transition-transform duration-[var(--dur-normal)] ease-[var(--ease-out)]',
        hidden && '-translate-y-full',
      )}
    >
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-3">
          <p className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="pixel-tile flex size-10 items-center justify-center rounded-none bg-brand-100 text-brand-700 dark:bg-brand-300/20 dark:text-brand-300"
            >
              <Icon name="leaf" size={20} pixel />
            </span>
            <span className="font-display text-xl font-bold text-ink">steady</span>
          </p>
          <IconButton
            icon={theme === 'dark' ? 'sun' : 'moon'}
            label={
              theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
            }
            variant="ghost"
            pixel
            onClick={toggleTheme}
          />
        </div>

        <nav
          aria-label="Primary"
          className="flex items-center gap-1 border-t border-line py-2"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'pressable flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold',
                  isActive
                    ? 'text-ink'
                    : 'text-ink-soft hover:text-ink',
                )
              }
            >
              <Icon name={item.icon} size={17} pixel />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
