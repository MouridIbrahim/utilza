import { apiClient, unwrap } from '../lib/api-client.js';

// Admin access probe — success means the session email is in ADMIN_EMAILS.
// 403 = authenticated but not admin. 401 = session invalid.
export async function probeAdminAccess(signal) {
  const res = await apiClient.get('/admin/tools', {
    params: { limit: 1 },
    signal,
  });
  return unwrap(res);
}

export async function getAdminTools(params = {}, signal) {
  const res = await apiClient.get('/admin/tools', { params, signal });
  return unwrap(res);
}

export async function getAdminUsers(params = {}, signal) {
  const res = await apiClient.get('/admin/users', { params, signal });
  return unwrap(res);
}
