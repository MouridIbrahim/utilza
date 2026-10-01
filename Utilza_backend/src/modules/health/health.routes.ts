import { Router } from "express";
import { asyncHandler, sendSuccess } from "../../utils/handler.js";
import { checkDb } from "../../lib/prisma.js";

export const healthRouter = Router();

healthRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const db = await checkDb();
    sendSuccess(res, {
      status: "ok",
      uptime: process.uptime(),
      db,
      version: "0.1.0",
    });
  }),
);
