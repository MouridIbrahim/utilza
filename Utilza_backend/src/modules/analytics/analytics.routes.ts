import { Router } from "express";
import { z } from "zod";
import { analyticsLimiter } from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import { asyncHandler, sendSuccess } from "../../utils/handler.js";
import { logger } from "../../lib/logger.js";

const ALLOWED_EVENTS = [
  "tool_opened",
  "tool_completed",
  "tool_failed",
  "file_uploaded",
  "result_downloaded",
  "result_copied",
  "tool_favorited",
  "search_performed",
] as const;

const eventSchema = z.object({
  event: z.enum(ALLOWED_EVENTS),
  toolSlug: z.string().min(1).max(100).optional(),
  platform: z.enum(["web", "android", "ios", "unknown"]).default("unknown"),
});

export const analyticsRouter = Router();

analyticsRouter.post(
  "/",
  analyticsLimiter,
  validate({ body: eventSchema }),
  asyncHandler(async (req, res) => {
    // Lightweight: log only, no PII. Future: persist to UsageEvent table.
    logger.info({ analytics: req.body }, "analytics_event");
    sendSuccess(res, { recorded: true }, 201);
  }),
);
