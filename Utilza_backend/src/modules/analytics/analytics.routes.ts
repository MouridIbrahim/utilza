import { Router } from "express";
import { z } from "zod";
import { analyticsLimiter } from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import { asyncHandler, sendSuccess } from "../../utils/handler.js";
import { badRequest } from "../../utils/errors.js";
import { logger } from "../../lib/logger.js";
import { getToolBySlug } from "../tools/tools.service.js";

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
    const { event, toolSlug, platform } = req.body as {
      event: string;
      toolSlug?: string;
      platform: string;
    };
    // Only record events for tools that exist (registry or DB).
    if (toolSlug && !(await getToolBySlug(toolSlug)))
      throw badRequest("Unknown toolSlug.", "VALIDATION_ERROR");
    // Lightweight: log only, no PII. Future: persist to UsageEvent table.
    logger.info({ analytics: { event, toolSlug, platform } }, "analytics_event");
    sendSuccess(res, { recorded: true }, 201);
  }),
);
