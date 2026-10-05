import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import {
  grayscaleRouter,
  blurRouter,
  sharpenRouter,
  brightnessRouter,
  contrastRouter,
} from "./filters.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/image/grayscale", grayscaleRouter);
  app.use("/tools/image/blur", blurRouter);
  app.use("/tools/image/sharpen", sharpenRouter);
  app.use("/tools/image/brightness", brightnessRouter);
  app.use("/tools/image/contrast", contrastRouter);
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

async function downloadMeta(
  fileId: string,
): Promise<{ format?: string; width?: number; height?: number }> {
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

describe("image filters", () => {
  it("grayscale keeps dims + png format", async () => {
    const res = await request(app)
      .post("/tools/image/grayscale")
      .attach("files", await makePng(), "a.png");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("image/png");
    track(res);
    const meta = await downloadMeta(res.body.data.fileId as string);
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(120);
  });

  it("blur with sigma + sharpen + brightness + contrast all succeed", async () => {
    const png = await makePng();
    const calls = [
      request(app).post("/tools/image/blur").field("sigma", "3").attach("files", png, "a.png"),
      request(app).post("/tools/image/sharpen").field("sigma", "2").attach("files", png, "a.png"),
      request(app)
        .post("/tools/image/brightness")
        .field("level", "1.5")
        .attach("files", png, "a.png"),
      request(app)
        .post("/tools/image/contrast")
        .field("level", "1.5")
        .attach("files", png, "a.png"),
    ];
    for (const call of calls) {
      const res = await call;
      expect(res.status).toBe(200);
      expect(res.body.data.mimeType).toBe("image/png");
      track(res);
    }
  });

  it("400 for out-of-range sigma (body schema)", async () => {
    const res = await request(app)
      .post("/tools/image/blur")
      .field("sigma", "999")
      .attach("files", await makePng(), "a.png");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("400 for non-image bytes", async () => {
    const res = await request(app)
      .post("/tools/image/grayscale")
      .attach("files", Buffer.from("nope"), "a.png");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not a valid image");
  });
});
