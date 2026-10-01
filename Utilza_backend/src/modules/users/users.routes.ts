import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import { asyncHandler, sendSuccess } from "../../utils/handler.js";
import { prisma } from "../../lib/prisma.js";
import { unauthorized } from "../../utils/errors.js";

const patchSchema = z.object({
  name: z.string().min(1).max(100).nullable().optional(),
});

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get(
  "/me",
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw unauthorized("Unauthorized.");
    sendSuccess(res, { id: user.id, email: user.email, name: user.name });
  }),
);

usersRouter.patch(
  "/me",
  validate({ body: patchSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name: req.body.name ?? undefined },
    });
    sendSuccess(res, { id: user.id, email: user.email, name: user.name });
  }),
);

usersRouter.delete(
  "/me",
  asyncHandler(async (req: AuthRequest, res) => {
    await prisma.user.delete({ where: { id: req.user!.id } });
    sendSuccess(res, { deleted: true });
  }),
);
