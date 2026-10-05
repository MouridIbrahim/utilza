import express from "express";
import { gunzipSync } from "node:zlib";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import JSZip from "jszip";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { textMergeRouter, textSplitRouter, gzipRouter } from "./text-tools.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/file/merge", textMergeRouter);
  app.use("/tools/file/split", textSplitRouter);
  app.use("/tools/file/compress", gzipRouter);
  app.use("/api/v1/files", filesRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}

const app = toolApp();
const createdFileIds: string[] = [];

afterAll(async () => {
  for (const id of createdFileIds) {
    const row = await prisma.generatedFile.findUnique({ where: { id } });
    if (row) await tempStorage.del(row.storageKey).catch(() => false);
    await prisma.generatedFile.deleteMany({ where: { id } });
  }
  await prisma.$disconnect();
});

async function downloadBytes(fileId: string): Promise<Buffer> {
  const dl = await request(app)
    .get(`/api/v1/files/${fileId}`)
    .buffer(true)
    .parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk as Buffer));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
  expect(dl.status).toBe(200);
  return dl.body as Buffer;
}

function track(res: { body: { data: { fileId: string } } }): void {
  createdFileIds.push(res.body.data.fileId as string);
}

describe("POST /tools/file/merge", () => {
  it("concatenates uniform text files", async () => {
    const res = await request(app)
      .post("/tools/file/merge")
      .attach("files", Buffer.from("one"), "a.txt")
      .attach("files", Buffer.from("two"), "b.txt");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("text/plain");
    track(res);
    expect((await downloadBytes(res.body.data.fileId as string)).toString()).toBe("one\ntwo");
  });

  it("400 for mixed extensions", async () => {
    const res = await request(app)
      .post("/tools/file/merge")
      .attach("files", Buffer.from("x"), "a.txt")
      .attach("files", Buffer.from("y"), "b.md");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("same extension");
  });
});

describe("POST /tools/file/split", () => {
  it("splits lines into a ZIP of parts", async () => {
    const lines = Array.from({ length: 10 }, (_, i) => `line${i + 1}`).join("\n");
    const res = await request(app)
      .post("/tools/file/split")
      .attach("files", Buffer.from(lines), "a.txt");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("application/zip");
    track(res);
    const zip = await JSZip.loadAsync(await downloadBytes(res.body.data.fileId as string));
    const names = Object.keys(zip.files).filter((n) => !zip.files[n]?.dir);
    expect(names.length).toBeGreaterThan(1);
    const first = await zip.file(names[0] as string)?.async("string");
    expect(first).toContain("line1");
  });

  it("400 for binary input", async () => {
    const res = await request(app)
      .post("/tools/file/split")
      .attach("files", Buffer.from([0x00, 0x01]), "a.txt");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("UTF-8");
  });
});

describe("POST /tools/file/compress", () => {
  it("gzip round-trips", async () => {
    const original = Buffer.from("compress me! ".repeat(100));
    const res = await request(app).post("/tools/file/compress").attach("files", original, "a.txt");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("application/gzip");
    track(res);
    const gz = await downloadBytes(res.body.data.fileId as string);
    expect(gunzipSync(gz)).toEqual(original);
    expect(gz.length).toBeLessThan(original.length);
  });
});
