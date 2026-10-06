import { apiClient } from '../lib/api-client.js';

const ALLOWED_EVENTS = new Set([
  'tool_opened',
  'tool_completed',
  'tool_failed',
  'file_uploaded',
  'result_downloaded',
  'result_copied',
  'tool_favorited',
  'search_performed',
]);

// Fire-and-forget. Never blocks UI, never throws, never sends unknown slugs
// (backend 400s unknown toolSlug — skip those silently).
export function trackEvent(event, toolSlug) {
  if (!ALLOWED_EVENTS.has(event)) return;
  try {
    const body = { event, platform: 'web' };
    if (toolSlug) body.toolSlug = toolSlug;
    apiClient.post('/analytics', body).catch(() => {});
  } catch {
    // ignore — analytics must never break tool flows
  }
}
