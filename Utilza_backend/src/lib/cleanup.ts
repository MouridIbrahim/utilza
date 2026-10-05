import { logger } from "./logger.js";
import type { StorageAdapter } from "./storage.js";

// Lifecycle expiry for temporary tool files (06 §13). Pure function over the
// StorageAdapter interface — works for local temp storage today and object
// storage later. Returns the number of expired entries removed.
export async function purgeExpiredFiles(storage: StorageAdapter): Promise<number> {
  const removed = await storage.cleanupExpired();
  if (removed > 0) logger.info({ removed }, "Expired temp files purged");
  return removed;
}

// Periodic purge for long-lived processes. Returns a stop function so tests
// and shutdown hooks can cancel it. Not wired into server.ts yet — Wave 1
// tool routes will start it (or a cron/worker will own it in Phase 9).
export function scheduleCleanup(storage: StorageAdapter, intervalMs = 15 * 60 * 1000): () => void {
  const timer = setInterval(() => {
    purgeExpiredFiles(storage).catch((err) => logger.error({ err }, "Temp file purge failed"));
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
