import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { socialRouter, passportRouter } from "./presets.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/image/social", socialRouter);
  app.use("/tools/image/passport", passportRouter);
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

async function makePng(width = 800, height = 600): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 70, g: 130, b: 180 } },
  })
    .png()
    .toBuffer();
}

async function downloadMeta(fileId: string): Promise<{ width?: number; height?: number }> {
  const dl = await request(app)
    .get(`/api/v1/files/${fileId}`)
    .buffer(true)
    .parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk as Buffer));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
  expect(dl.status).toBe(200);
  return sharp(dl.body as Buffer).metadata();
}

function track(res: { body: { data: { fileId: string } } }): void {
  createdFileIds.push(res.body.data.fileId as string);
}

describe("POST /tools/image/social", () => {
  it("renders exact og canvas", async () => {
    const res = await request(app)
      .post("/tools/image/social")
      .field("preset", "og")
      .attach("files", await makePng(), "a.png");
    expect(res.status).toBe(200);
    track(res);
    expect(await downloadMeta(res.body.data.fileId as string)).toMatchObject({
      width: 1200,
      height: 630,
    });
  });

  it("400 for unknown preset", async () => {
    const res = await request(app)
      .post("/tools/image/social")
      .field("preset", "billboard")
      .attach("files", await makePng(), "a.png");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /tools/image/passport", () => {
  it("crops to 413x531", async () => {
    const res = await request(app)
      .post("/tools/image/passport")
      .attach("files", await makePng(), "a.png");
    expect(res.status).toBe(200);
    track(res);
    expect(await downloadMeta(res.body.data.fileId as string)).toMatchObject({
      width: 413,
      height: 531,
    });
  });
});
