import { apiClient, unwrap } from '../lib/api-client.js';

// Minimal Phase-1 surface. Full catalog hooks land in Phase 2.
export async function getCategories(signal) {
  const res = await apiClient.get('/categories', { signal });
  return unwrap(res); // { items }
}

export async function getTools(params = {}, signal) {
  const res = await apiClient.get('/tools', { params, signal });
  return unwrap(res); // { items, page, limit, total }
}

export async function getTool(slug, signal) {
  const res = await apiClient.get(`/tools/${encodeURIComponent(slug)}`, {
    signal,
  });
  return unwrap(res);
}

export async function getCategory(slug, signal) {
  const res = await apiClient.get(`/categories/${encodeURIComponent(slug)}`, {
    signal,
  });
  return unwrap(res);
}
