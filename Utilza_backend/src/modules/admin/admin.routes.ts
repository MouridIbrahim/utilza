import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireAdmin, type AuthRequest } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import { asyncHandler, sendSuccess } from "../../utils/handler.js";
import { prisma } from "../../lib/prisma.js";
import { registryTools } from "../tools/tool-registry.js";

// Read-only admin endpoints. Write operations arrive with the admin console
// (02-BACKEND.md:38 administrative functionality). ADMIN_EMAILS gates access.
const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().min(1).max(100).optional(),
});

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get(
  "/tools",
  validate({ query: listQuery }),
  asyncHandler(async (req: AuthRequest, res) => {
    const { page, limit, search } = req.query as unknown as {
      page: number;
      limit: number;
      search?: string;
    };
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { slug: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};
    try {
      const [total, items] = await Promise.all([
        prisma.tool.count({ where }),
        prisma.tool.findMany({
          where,
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            categoryId: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: "asc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);
      sendSuccess(res, { items, page, limit, total });
    } catch {
      const items = registryTools
        .filter(
          (t) =>
            !search ||
            t.slug.includes(search) ||
            t.name.toLowerCase().includes(search.toLowerCase()),
        )
        .slice((page - 1) * limit, page * limit);
      sendSuccess(res, { items, page, limit, total: registryTools.length });
    }
  }),
);

adminRouter.get(
  "/users",
  validate({ query: listQuery }),
  asyncHandler(async (req: AuthRequest, res) => {
    const { page, limit, search } = req.query as unknown as {
      page: number;
      limit: number;
      search?: string;
    };
    const where = search ? { email: { contains: search, mode: "insensitive" as const } } : {};
    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        // Never expose passwordHash (02-BACKEND.md:189).
        select: { id: true, email: true, name: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    sendSuccess(res, { items, page, limit, total });
  }),
);
