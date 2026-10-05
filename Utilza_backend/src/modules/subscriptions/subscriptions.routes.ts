import { Router } from "express";
import { requireAuth, type AuthRequest } from "../../middleware/auth.middleware.js";
import { asyncHandler, sendSuccess } from "../../utils/handler.js";
import { prisma } from "../../lib/prisma.js";

export const subscriptionsRouter = Router();

// Public stub: payment providers cannot send a Bearer token. Real webhook
// verification arrives with the premium billing milestone.
subscriptionsRouter.post("/webhook", (_req, res) => {
  res.status(501).json({
    success: false,
    error: {
      code: "NOT_IMPLEMENTED",
      message: "Subscriptions are stubbed for MVP.",
    },
  });
});

subscriptionsRouter.use(requireAuth);

subscriptionsRouter.get(
  "/me",
  asyncHandler(async (req: AuthRequest, res) => {
    const sub = await prisma.subscription.findUnique({ where: { userId: req.user!.id } });
    sendSuccess(res, sub ?? { status: "free", tier: "free" });
  }),
);
