import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import { asyncHandler, sendSuccess } from "../../utils/handler.js";
import { prisma } from "../../lib/prisma.js";

const createSchema = z.object({
  toolSlug: z.string().min(1).max(100),
  inputSummary: z.string().max(500).optional(),
});

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const historyRouter = Router();
historyRouter.use(requireAuth);

historyRouter.get(
  "/",
  validate({ query: listQuery }),
  asyncHandler(async (req: AuthRequest, res) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const [total, items] = await Promise.all([
      prisma.toolHistory.count({ where: { userId: req.user!.id } }),
      prisma.toolHistory.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    sendSuccess(res, { items, page, limit, total });
  }),
);

historyRouter.post(
  "/",
  validate({ body: createSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    const { toolSlug, inputSummary } = req.body as { toolSlug: string; inputSummary?: string };
    const row = await prisma.toolHistory.create({
      data: { userId: req.user!.id, toolSlug, inputSummary: inputSummary ?? null },
    });
    sendSuccess(res, row, 201);
  }),
);

historyRouter.delete(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    await prisma.toolHistory.deleteMany({ where: { userId: req.user!.id } });
    sendSuccess(res, { deleted: true });
  }),
);
