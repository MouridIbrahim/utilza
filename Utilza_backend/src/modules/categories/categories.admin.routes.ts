import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth, requireAdmin } from "../../middleware/auth.middleware.js";

// Admin mutations are intentionally not implemented yet (TASK-009 decision).
// They sit behind auth + admin gate and return 501 NOT_IMPLEMENTED until a
// full admin console (or AdminUser model, 02-BACKEND.md:87) exists.
// Documented in docs/API.md.
function notImplemented(action: string) {
  return (_req: Request, res: Response): void => {
    res.status(501).json({
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: `Admin action "${action}" is not available yet.`,
      },
    });
  };
}

// Per-route guards (not router.use) so public GET routes on the parent
// categories router are unaffected.
export const categoriesAdminRouter = Router();

categoriesAdminRouter.post("/", requireAuth, requireAdmin, notImplemented("category create"));
categoriesAdminRouter.patch("/:slug", requireAuth, requireAdmin, notImplemented("category update"));
categoriesAdminRouter.delete(
  "/:slug",
  requireAuth,
  requireAdmin,
  notImplemented("category delete"),
);
