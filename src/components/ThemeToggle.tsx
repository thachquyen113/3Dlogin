import { Moon, Sparkles, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import type { ThemeMode } from '../types';

interface ThemeToggleProps {
  theme: ThemeMode;
  onSelectTheme: (mode: ThemeMode) => void;
}

export function ThemeToggle({ theme, onSelectTheme }: ThemeToggleProps) {
  return (
    <div
      role="group"
      aria-label="Visual theme switcher"
      className="theme-toggle-shell relative inline-flex items-center p-1 rounded-xl gap-1"
    >
      {/* Light / Sunshine Button */}
      <button
        type="button"
        onClick={() => onSelectTheme('light')}
        aria-pressed={theme === 'light'}
        className="relative z-10 flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          color: theme === 'light' ? '#78350f' : 'var(--text-secondary)',
        }}
      >
        {theme === 'light' && (
          <motion.span
            layoutId="activeThemeSurface"
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="absolute inset-0 rounded-lg shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '1px solid rgba(245, 158, 11, 0.38)',
            }}
          />
        )}
        <Sun
          className="relative z-10 w-4 h-4 transition-transform duration-300"
          style={{
            transform: theme === 'light' ? 'rotate(0deg) scale(1.08)' : 'rotate(-30deg) scale(0.95)',
            color: theme === 'light' ? '#d97706' : 'currentColor',
          }}
        />
        <span className="relative z-10">Light</span>
      </button>

      {/* Dark / Starry Night Button */}
      <button
        type="button"
        onClick={() => onSelectTheme('dark')}
        aria-pressed={theme === 'dark'}
        className="relative z-10 flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          color: theme === 'dark' ? '#e0f2fe' : 'var(--text-secondary)',
        }}
      >
        {theme === 'dark' && (
          <motion.span
            layoutId="activeThemeSurface"
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="absolute inset-0 rounded-lg shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              border: '1px solid rgba(125, 211, 252, 0.35)',
            }}
          />
        )}
        <Moon
          className="relative z-10 w-4 h-4 transition-transform duration-300"
          style={{
            transform: theme === 'dark' ? 'rotate(0deg) scale(1.06)' : 'rotate(24deg) scale(0.95)',
            color: theme === 'dark' ? '#93c5fd' : 'currentColor',
          }}
        />
        <span className="relative z-10">Dark</span>
        {theme === 'dark' && (
          <Sparkles className="relative z-10 w-3 h-3 text-amber-200" />
        )}
      </button>
    </div>
  );
}
