import { create } from 'zustand';

const RECENT_KEY = 'utilza.recent-searches';

export const usePaletteStore = create((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

export function getRecentSearches() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((s) => typeof s === 'string').slice(0, 6) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query) {
  const q = (query || '').trim().slice(0, 100);
  if (!q) return;
  try {
    const next = [q, ...getRecentSearches().filter((s) => s !== q)].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
}
