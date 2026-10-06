import { apiClient, unwrap } from '../lib/api-client.js';

export async function getHistory({ page = 1, limit = 20 } = {}, signal) {
  const res = await apiClient.get('/history', { params: { page, limit }, signal });
  return unwrap(res); // { items, page, limit, total } newest first
}

export async function clearHistory() {
  const res = await apiClient.delete('/history');
  return unwrap(res); // { deleted:true } — caller's rows only
}
