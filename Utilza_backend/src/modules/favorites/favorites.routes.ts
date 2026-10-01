import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import { asyncHandler, sendSuccess } from "../../utils/handler.js";
import { prisma } from "../../lib/prisma.js";
import { conflict, notFound } from "../../utils/errors.js";

const createSchema = z.object({ toolId: z.string().min(1).max(64) });
const idParams = z.object({ toolId: z.string().min(1).max(64) });

export const favoritesRouter = Router();
favoritesRouter.use(requireAuth);

favoritesRouter.get(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const rows = await prisma.favorite.findMany({
      where: { userId: req.user!.id },
      include: { tool: { select: { id: true, name: true, slug: true, icon: true } } },
      orderBy: { createdAt: "desc" },
    });
    sendSuccess(res, { items: rows });
  }),
);

favoritesRouter.post(
  "/",
  validate({ body: createSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    const { toolId } = req.body as { toolId: string };
    const tool = await prisma.tool.findUnique({ where: { id: toolId } });
    if (!tool || !tool.isActive) throw notFound("Tool not found.", "TOOL_NOT_FOUND");
    const existing = await prisma.favorite.findUnique({
      where: { userId_toolId: { userId: req.user!.id, toolId } },
    });
    if (existing) throw conflict("Already favorited.", "ALREADY_FAVORITED");
    const fav = await prisma.favorite.create({ data: { userId: req.user!.id, toolId } });
    sendSuccess(res, fav, 201);
  }),
);

favoritesRouter.delete(
  "/:toolId",
  validate({ params: idParams }),
  asyncHandler(async (req: AuthRequest, res) => {
    await prisma.favorite.deleteMany({
      where: { userId: req.user!.id, toolId: req.params["toolId"] as string },
    });
    sendSuccess(res, { deleted: true });
  }),
);
