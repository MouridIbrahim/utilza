import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import sharp, { type Metadata } from "sharp";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { resizeImageRouter } from "../resize-image/resize-image.routes.js";
import { cropImageRouter } from "../crop-image/crop-image.routes.js";
import { rotateImageRouter } from "../rotate-image/rotate-image.routes.js";
import { flipImageRouter } from "../flip-image/flip-image.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/image/resize", resizeImageRouter);
  app.use("/tools/image/crop", cropImageRouter);
  app.use("/tools/image/rotate", rotateImageRouter);
  app.use("/tools/image/flip", flipImageRouter);
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

async function makePng(width = 400, height = 300): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 10, g: 120, b: 200 } },
  })
    .png()
    .toBuffer();
}

async function downloadMeta(fileId: string): Promise<Metadata> {
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

describe("POST /tools/image/resize", () => {
  it("halves width keeping aspect, never upscales", async () => {
    const res = await request(app)
      .post("/tools/image/resize")
      .field("width", "200")
      .attach("files", await makePng(), "a.png");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("image/png");
    track(res);
    const meta = await downloadMeta(res.body.data.fileId as string);
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(150);
  });

  it("400 when neither width nor height given", async () => {
    const res = await request(app)
      .post("/tools/image/resize")
      .attach("files", await makePng(), "a.png");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /tools/image/crop", () => {
  it("crops the exact region", async () => {
    const res = await request(app)
      .post("/tools/image/crop")
      .field("left", "10")
      .field("top", "20")
      .field("width", "100")
      .field("height", "50")
      .attach("files", await makePng(), "a.png");
    expect(res.status).toBe(200);
    track(res);
    const meta = await downloadMeta(res.body.data.fileId as string);
    expect(meta.width).toBe(100);
    expect(meta.height).toBe(50);
  });

  it("400 when the region exceeds the image", async () => {
    const res = await request(app)
      .post("/tools/image/crop")
      .field("left", "350")
      .field("top", "0")
      .field("width", "100")
      .field("height", "50")
      .attach("files", await makePng(), "a.png");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("exceeds image dimensions");
  });
});

describe("POST /tools/image/rotate", () => {
  it("swaps dimensions on 90°", async () => {
    const res = await request(app)
      .post("/tools/image/rotate")
      .field("angle", "90")
      .attach("files", await makePng(), "a.png");
    expect(res.status).toBe(200);
    track(res);
    const meta = await downloadMeta(res.body.data.fileId as string);
    expect(meta.width).toBe(300);
    expect(meta.height).toBe(400);
  });

  it("400 for bad angle", async () => {
    const res = await request(app)
      .post("/tools/image/rotate")
      .field("angle", "45")
      .attach("files", await makePng(), "a.png");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /tools/image/flip", () => {
  it("mirrors keeping dimensions and format", async () => {
    const res = await request(app)
      .post("/tools/image/flip")
      .field("direction", "horizontal")
      .attach("files", await makePng(), "a.png");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("image/png");
    track(res);
    const meta = await downloadMeta(res.body.data.fileId as string);
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(300);
    expect(meta.format).toBe("png");
  });

  it("400 for bad direction", async () => {
    const res = await request(app)
      .post("/tools/image/flip")
      .field("direction", "diagonal")
      .attach("files", await makePng(), "a.png");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
