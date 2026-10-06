import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../middleware/error.middleware.js";
import { bearer, registerUser, removeUser } from "../../test-utils.js";
import { jobsRouter, purgeExpiredJobs, registerJobHandler } from "./jobs.routes.js";
import { createApp } from "../../app.js";

function toolApp() {
  const app = express();
  app.use(express.json());
  app.use("/jobs", jobsRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}

const app = toolApp();
const fullApp = createApp();
let alice: Awaited<ReturnType<typeof registerUser>>;
let bob: Awaited<ReturnType<typeof registerUser>>;

afterAll(async () => {
  if (alice) await removeUser(alice.email);
  if (bob) await removeUser(bob.email);
  await prisma.$disconnect();
});

describe("jobs gate (no workers registered)", () => {
  it("401 on GET /jobs without token", async () => {
    const res = await request(app).get("/jobs");
    expect(res.status).toBe(401);
  });

  it("404 NO_WORKER for unregistered types (fails fast, never stalls)", async () => {
    alice = await registerUser(fullApp, "job_a");
    bob = await registerUser(fullApp, "job_b");
    const res = await request(app)
      .post("/jobs")
      .set(bearer(alice.token))
      .send({ type: "video-convert", input: {} });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NO_WORKER");
  });

  it("400 for missing type", async () => {
    const res = await request(app).post("/jobs").set(bearer(alice.token)).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("404 JOB_NOT_FOUND for unknown id", async () => {
    const res = await request(app).get("/jobs/cabcdefghijklmnopqrstuvwx").set(bearer(alice.token));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("JOB_NOT_FOUND");
  });

  it("runs a registered handler end-to-end (echo worker)", async () => {
    registerJobHandler("test-echo", ({ input }) => Promise.resolve({ echoed: input }));
    const created = await request(app)
      .post("/jobs")
      .set(bearer(alice.token))
      .send({ type: "test-echo", input: { hello: "world" } });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe("queued");
    const id = created.body.data.id as string;
    // In-process worker resolves near-instantly; poll briefly.
    let seen = "";
    for (let i = 0; i < 20; i += 1) {
      const got = await request(app).get(`/jobs/${id}`).set(bearer(alice.token));
      seen = got.body.data.status as string;
      if (seen === "done") {
        expect(got.body.data.output).toEqual({ echoed: { hello: "world" } });
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(seen).toBe("done");
    await prisma.job.deleteMany({ where: { id } });
  });

  it("403 when reading another user's job", async () => {
    registerJobHandler("test-owned", () => Promise.resolve({ ok: true }));
    const created = await request(app)
      .post("/jobs")
      .set(bearer(alice.token))
      .send({ type: "test-owned" });
    const id = created.body.data.id as string;
    const res = await request(app).get(`/jobs/${id}`).set(bearer(bob.token));
    expect(res.status).toBe(403);
    await prisma.job.deleteMany({ where: { id } });
  });

  it("anonymous jobs are readable without a token", async () => {
    registerJobHandler("test-anon", () => Promise.resolve({ ok: true }));
    const created = await request(app).post("/jobs").send({ type: "test-anon" });
    expect(created.status).toBe(201);
    const id = created.body.data.id as string;
    const res = await request(app).get(`/jobs/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.userId).toBeNull();
    await prisma.job.deleteMany({ where: { id } });
  });

  it("lists only the caller's jobs", async () => {
    registerJobHandler("test-list", () => Promise.resolve(null));
    const created = await request(app)
      .post("/jobs")
      .set(bearer(alice.token))
      .send({ type: "test-list" });
    const id = created.body.data.id as string;
    const mine = await request(app).get("/jobs").set(bearer(alice.token));
    expect(mine.body.data.items.map((j: { id: string }) => j.id)).toContain(id);
    const others = await request(app).get("/jobs").set(bearer(bob.token));
    expect(others.body.data.items.map((j: { id: string }) => j.id)).not.toContain(id);
    await prisma.job.deleteMany({ where: { id } });
  });

  it("purgeExpiredJobs removes only finished, expired rows", async () => {
    const past = new Date(Date.now() - 1000);
    const [done, failed, queued] = await Promise.all([
      prisma.job.create({ data: { type: "t", status: "done", expiresAt: past } }),
      prisma.job.create({ data: { type: "t", status: "failed", expiresAt: past } }),
      prisma.job.create({ data: { type: "t", status: "queued", expiresAt: past } }),
    ]);
    expect(await purgeExpiredJobs()).toBe(2);
    expect(await prisma.job.findUnique({ where: { id: queued.id } })).not.toBeNull();
    await prisma.job.deleteMany({ where: { id: { in: [done.id, failed.id, queued.id] } } });
  });
});
