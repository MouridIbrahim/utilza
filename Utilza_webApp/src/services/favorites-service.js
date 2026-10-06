import { apiClient, unwrap } from '../lib/api-client.js';

// Phase-2 minimal surface for FavoriteButton gating.
// Full favorites page (optimistic list management) lands in Phase 6.
export async function getFavorites(signal) {
  const res = await apiClient.get('/favorites', { signal });
  return unwrap(res); // { items }
}

export async function addFavorite(toolId) {
  const res = await apiClient.post('/favorites', { toolId });
  return unwrap(res);
}

export async function removeFavorite(toolId) {
  const res = await apiClient.delete(`/favorites/${encodeURIComponent(toolId)}`);
  return unwrap(res);
}
