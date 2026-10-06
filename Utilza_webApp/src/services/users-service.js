import { apiClient, unwrap } from '../lib/api-client.js';

// Only name update is supported. No password/email/picture/MFA endpoints.
export async function getUserMe(signal) {
  const res = await apiClient.get('/users/me', { signal });
  return unwrap(res); // { id, email, name }
}

export async function updateUserMe({ name }) {
  const res = await apiClient.patch('/users/me', { name });
  return unwrap(res);
}

export async function deleteUserMe() {
  const res = await apiClient.delete('/users/me');
  return unwrap(res); // { deleted:true } — cascades favorites/history/subscription
}
