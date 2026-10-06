import { create } from 'zustand';
import { apiClient } from '../lib/api-client.js';

const TOKEN_KEY = 'utilza.token';

// Memory-first token store. Persisting to localStorage is a product decision:
// backend supports Bearer tokens only (no HttpOnly cookies), so persistence
// increases XSS longevity risk. Default: persist (convenience) — switch
// `persistToken` to false for memory-only sessions.
const persistToken = true;

function readToken() {
  try {
    return persistToken ? localStorage.getItem(TOKEN_KEY) : null;
  } catch {
    return null;
  }
}

function writeToken(token) {
  try {
    if (!persistToken) return;
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage failures (private mode, etc.)
  }
}

export const useSessionStore = create((set, get) => ({
  token: readToken(),
  user: null,
  adminChecked: false,
  isAdmin: false,

  setSession: ({ token, user }) => {
    writeToken(token ?? null);
    set({ token: token ?? null, user: user ?? null });
  },

  clearSession: () => {
    writeToken(null);
    set({ token: null, user: null, adminChecked: false, isAdmin: false });
  },

  setAdmin: ({ isAdmin }) => set({ isAdmin, adminChecked: true }),
  resetAdmin: () => set({ isAdmin: false, adminChecked: false }),

  setUser: (user) => set({ user: user ?? null }),

  getAuthHeader: () => {
    const { token } = get();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
}));

// Attach Bearer only when a token exists — public tools stay anonymous.
apiClient.interceptors.request.use((config) => {
  const { token } = useSessionStore.getState();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Central 401 handling is done by route guards / services (see Phase 1+3).
// Intentionally no auto-redirect here: public tool 401s must not bounce to login.
