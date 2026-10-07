import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../stores/theme.js';

export function ThemeToggle({ compact }) {
  const { theme, toggle } = useThemeStore();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={dark}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`rounded-[10px] border border-[var(--color-border)] p-2 hover:bg-[var(--color-surface-subtle)] ${compact || ''}`}
    >
      {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
