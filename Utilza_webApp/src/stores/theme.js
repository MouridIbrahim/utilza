import { useEffect } from 'react';
import { create } from 'zustand';

const THEME_KEY = 'utilza.theme';

function initialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore storage failures
  }
  return 'light';
}

export const useThemeStore = create((set) => ({
  theme: initialTheme(),
  toggle: () =>
    set((s) => {
      const next = s.theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        // ignore storage failures
      }
      return { theme: next };
    }),
}));

// Applies data-theme to <html>. Mount once near the providers.
export function ThemeEffect() {
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return null;
}
