import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validation.middleware.js";
import { asyncHandler, sendSuccess } from "../../utils/handler.js";
import { notFound } from "../../utils/errors.js";
import { getToolBySlug, listTools } from "./tools.service.js";

const listQuery = z.object({
  category: z.string().min(1).max(64).optional(),
  search: z.string().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const slugParams = z.object({ slug: z.string().min(1).max(100) });

export const toolsRouter = Router();

toolsRouter.get(
  "/",
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as {
      category?: string;
      search?: string;
      page: number;
      limit: number;
    };
    const result = await listTools({
      category: q.category,
      search: q.search,
      page: q.page,
      limit: q.limit,
    });
    sendSuccess(res, result);
  }),
);

toolsRouter.get(
  "/:slug",
  validate({ params: slugParams }),
  asyncHandler(async (req, res) => {
    const item = await getToolBySlug(req.params["slug"] as string);
    if (!item || (typeof item === "object" && "isActive" in item && !item.isActive))
      throw notFound("Tool not found.", "TOOL_NOT_FOUND");
    sendSuccess(res, item);
  }),
);
