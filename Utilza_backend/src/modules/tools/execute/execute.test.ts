import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../middleware/error.middleware.js";
import { tempStorage } from "../../../lib/storage.js";
import { filesRouter } from "../../files/files.routes.js";
import { createFileToolHandler } from "./execute.js";

// Stub executor: concatenates inputs as text. Proves the shared flow
// (validate → temp id → process → temp storage → GeneratedFile → result)
// without building a real Wave 1 tool.
function stubApp() {
  const app = express();
  const stub = express.Router();
  stub.post(
    "/",
    ...createFileToolHandler({
      toolSlug: "stub-concat",
      maxFiles: 3,
      allowedExts: ["txt"],
      process: (inputs, ctx) => {
        if (!ctx.jobId) throw new Error("jobId missing");
        const buffer = Buffer.concat(inputs.map((i) => i.buffer));
        return Promise.resolve({ buffer, ext: "txt", mimeType: "text/plain" });
      },
    }),
  );
  app.use("/tools/stub-concat", stub);
  app.use("/api/v1/files", filesRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}

const app = stubApp();
const createdFileIds: string[] = [];

afterAll(async () => {
  for (const id of createdFileIds) {
    const row = await prisma.generatedFile.findUnique({ where: { id } });
    if (row) await tempStorage.del(row.storageKey).catch(() => false);
    await prisma.generatedFile.deleteMany({ where: { id } });
  }
  await prisma.$disconnect();
});

describe("execute helper (stub tool)", () => {
  it("executes and returns the shared envelope + GeneratedFile row", async () => {
    const res = await request(app)
      .post("/tools/stub-concat")
      .attach("files", Buffer.from("hello "), "a.txt")
      .attach("files", Buffer.from("world"), "b.txt");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data as Record<string, unknown>;
    expect(data["jobId"]).toBeTruthy();
    expect(data["fileId"]).toBeTruthy();
    expect(data["downloadUrl"]).toBe(`/api/v1/files/${data["fileId"]}`);
    expect(data["mimeType"]).toBe("text/plain");
    expect(data["size"]).toBe(11);
    expect(data["expiresAt"]).toBeTruthy();
    createdFileIds.push(data["fileId"] as string);

    const row = await prisma.generatedFile.findUnique({ where: { id: data["fileId"] as string } });
    expect(row?.toolSlug).toBe("stub-concat");
    expect(row?.status).toBe("ready");
  });

  it("400 when no file uploaded", async () => {
    const res = await request(app).post("/tools/stub-concat");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("400 for disallowed extension", async () => {
    const res = await request(app)
      .post("/tools/stub-concat")
      .attach("files", Buffer.from("MZ"), "evil.exe");
    expect(res.status).toBe(400);
  });

  it("413 for oversize file", async () => {
    const res = await request(app)
      .post("/tools/stub-concat")
      .attach("files", Buffer.alloc(10 * 1024 * 1024 + 1, 1), "big.txt");
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("FILE_TOO_LARGE");
  }, 30000);
});

describe("download endpoint", () => {
  it("streams executed bytes as an attachment", async () => {
    const exec = await request(app)
      .post("/tools/stub-concat")
      .attach("files", Buffer.from("dl-me"), "a.txt");
    const fileId = exec.body.data.fileId as string;
    createdFileIds.push(fileId);

    const res = await request(app).get(`/api/v1/files/${fileId}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.headers["content-disposition"]).not.toContain("a.txt");
    expect(res.text).toBe("dl-me");
  });

  it("404 FILE_NOT_FOUND for unknown id", async () => {
    const res = await request(app).get("/api/v1/files/cabcdefghijklmnopqrstuvwx");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("FILE_NOT_FOUND");
  });

  it("410 FILE_EXPIRED for expired rows", async () => {
    const stored = await tempStorage.put(Buffer.from("stale"), { ext: "txt" });
    const row = await prisma.generatedFile.create({
      data: {
        toolSlug: "stub-concat",
        storageKey: stored.key,
        mimeType: "text/plain",
        size: 5,
        status: "ready",
        expiresAt: new Date(Date.now() - 1_000),
      },
    });
    createdFileIds.push(row.id);
    const res = await request(app).get(`/api/v1/files/${row.id}`);
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe("FILE_EXPIRED");
  });
});
