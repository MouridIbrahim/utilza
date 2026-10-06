import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validation.middleware.js";
import { requireAuth, optionalAuth, type AuthRequest } from "../../middleware/auth.middleware.js";
import { asyncHandler, sendSuccess } from "../../utils/handler.js";
import { forbidden, notFound } from "../../utils/errors.js";
import { prisma } from "../../lib/prisma.js";

export type JobHandler = (job: { id: string; input: unknown }) => Promise<unknown>;

// Dispatch table for background processors. Empty until FFmpeg-backed media
// workers land (T115); enqueueing an unregistered type fails fast with 404
// instead of silently stalling — covered by tests.
const handlers = new Map<string, JobHandler>();

export function registerJobHandler(type: string, handler: JobHandler): void {
  handlers.set(type, handler);
}

export function hasJobHandler(type: string): boolean {
  return handlers.has(type);
}

const createSchema = z.object({
  type: z.string().min(1).max(64),
  input: z.unknown().optional(),
});

const idParams = z.object({ id: z.string().min(20).max(30) });

async function runJob(id: string): Promise<void> {
  // Fire-and-forget: every DB touch is guarded so cleanup races (tests,
  // expiry sweeps) surface as silent no-ops, never unhandled rejections.
  try {
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job || job.status !== "queued") return;
    const handler = handlers.get(job.type);
    if (!handler) {
      await prisma.job
        .update({
          where: { id },
          data: { status: "failed", error: `No worker registered for job type "${job.type}".` },
        })
        .catch(() => undefined);
      return;
    }
    await prisma.job.update({ where: { id }, data: { status: "running" } });
    try {
      const output = (await handler({ id, input: job.input })) ?? null;
      await prisma.job.update({
        where: { id },
        data: { status: "done", output: output as object },
      });
    } catch (err) {
      await prisma.job
        .update({
          where: { id },
          data: { status: "failed", error: String((err as Error)?.message ?? err).slice(0, 500) },
        })
        .catch(() => undefined);
    }
  } catch {
    // Row deleted mid-flight (cleanup race) — nothing to do.
  }
}

function checkOwnership(job: { userId: string | null }, auth: AuthRequest, action: string): void {
  if (job.userId !== null && (!auth.user || auth.user.id !== job.userId))
    throw forbidden(`You do not own this job (${action}).`);
}

export const jobsRouter = Router();

jobsRouter.post(
  "/",
  optionalAuth,
  validate({ body: createSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    // Auth optional: anonymous jobs are readable by unguessable id.
    const userId = req.user?.id ?? null;
    const { type, input } = req.body as { type: string; input?: unknown };
    if (!handlers.has(type))
      throw notFound(`No worker registered for job type "${type}".`, "NO_WORKER");
    const job = await prisma.job.create({
      data: {
        type,
        status: "queued",
        userId,
        input: (input as object) ?? null,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    });
    // Fire-and-forget in-process worker; the row is the source of truth.
    void runJob(job.id);
    sendSuccess(res, job, 201);
  }),
);

jobsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const items = await prisma.job.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    sendSuccess(res, { items });
  }),
);

jobsRouter.get(
  "/:id",
  optionalAuth,
  validate({ params: idParams }),
  asyncHandler(async (req: AuthRequest, res) => {
    const job = await prisma.job.findUnique({ where: { id: req.params["id"] as string } });
    if (!job) throw notFound("Job not found.", "JOB_NOT_FOUND");
    checkOwnership(job, req, "read");
    sendSuccess(res, job);
  }),
);

// Deletes finished jobs past expiry. Returns the removed count.
export async function purgeExpiredJobs(now = new Date()): Promise<number> {
  const { count } = await prisma.job.deleteMany({
    where: {
      expiresAt: { lte: now },
      status: { in: ["done", "failed"] },
    },
  });
  return count;
}
