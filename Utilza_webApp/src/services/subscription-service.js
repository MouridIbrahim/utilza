import { apiClient, unwrap } from '../lib/api-client.js';

// Read-only. No upgrade/cancel/invoice/payment UI — webhook is 501.
export async function getSubscription(signal) {
  const res = await apiClient.get('/subscriptions/me', { signal });
  return unwrap(res); // row or { status:'free', tier:'free' }
}
