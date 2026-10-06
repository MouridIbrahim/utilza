import { QueryClient } from '@tanstack/react-query';

// §26 cache policy
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        // Catalog/categories: several minutes; admin: short (per-query override).
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

// Canonical query keys — §26
export const queryKeys = {
  categories: ['categories'],
  tools: (params) => ['tools', params],
  tool: (slug) => ['tool', slug],
  me: ['me'],
  favorites: ['favorites'],
  history: (params) => ['history', params],
  subscription: ['subscription'],
  adminTools: (params) => ['adminTools', params],
  adminUsers: (params) => ['adminUsers', params],
};

// Shared singleton so non-component helpers (logout, session-expiry)
// can clear/invalidate cached server state.
export const queryClient = createQueryClient();
