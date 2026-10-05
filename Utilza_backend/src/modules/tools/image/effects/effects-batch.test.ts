import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { pixelateRouter, imageWatermarkRouter } from "../effects/effects.routes.js";
import { imageMetadataRouter } from "../metadata/metadata.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/image/pixelate", pixelateRouter);
  app.use("/tools/image/watermark", imageWatermarkRouter);
  app.use("/tools/image/metadata", imageMetadataRouter);
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

async function makePng(): Promise<Buffer> {
  return sharp({
    create: { width: 200, height: 120, channels: 3, background: { r: 180, g: 60, b: 40 } },
  })
    .png()
    .toBuffer();
}

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

describe("POST /tools/image/pixelate", () => {
  it("keeps dimensions while destroying detail", async () => {
    const res = await request(app)
      .post("/tools/image/pixelate")
      .field("blocks", "8")
      .attach("files", await makePng(), "a.png");
    expect(res.status).toBe(200);
    track(res);
    const meta = await sharp(await downloadBytes(res.body.data.fileId as string)).metadata();
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(120);
  });
});

describe("POST /tools/image/watermark", () => {
  it("overlays text and stays a valid png", async () => {
    const res = await request(app)
      .post("/tools/image/watermark")
      .field("text", "DRAFT")
      .attach("files", await makePng(), "a.png");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("image/png");
    track(res);
    const meta = await sharp(await downloadBytes(res.body.data.fileId as string)).metadata();
    expect(meta.format).toBe("png");
  });

  it("400 when text missing", async () => {
    const res = await request(app)
      .post("/tools/image/watermark")
      .attach("files", await makePng(), "a.png");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /tools/image/metadata", () => {
  it("reports sharp metadata without bytes", async () => {
    const png = await makePng();
    const res = await request(app).post("/tools/image/metadata").attach("files", png, "a.png");
    expect(res.status).toBe(200);
    expect(res.body.data.format).toBe("png");
    expect(res.body.data.width).toBe(200);
    expect(res.body.data.height).toBe(120);
    expect(res.body.data.size).toBe(png.length);
  });
});
