import { Router } from "express";
import { asyncHandler, sendSuccess } from "../../utils/handler.js";
import { notFound } from "../../utils/errors.js";
import { getCategoryBySlug, listCategories } from "./categories.service.js";
import { categoriesAdminRouter } from "./categories.admin.routes.js";

export const categoriesRouter = Router();

categoriesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const items = await listCategories();
    sendSuccess(res, { items });
  }),
);

categoriesRouter.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const item = await getCategoryBySlug(req.params["slug"] as string);
    if (!item) throw notFound("Category not found.", "CATEGORY_NOT_FOUND");
    sendSuccess(res, item);
  }),
);

// Admin write stubs (501). Mounted last so public GETs match first.
categoriesRouter.use(categoriesAdminRouter);
