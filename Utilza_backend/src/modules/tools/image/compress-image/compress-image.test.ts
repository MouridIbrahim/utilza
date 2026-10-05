import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { compressImageRouter } from "./compress-image.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/image/compress", compressImageRouter);
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

// Deterministic noisy image: weak structure compresses poorly at q100,
// so q30 must shrink it.
function noisyPixels(width: number, height: number): Buffer {
  const raw = Buffer.alloc(width * height * 3);
  let seed = 123456789;
  for (let i = 0; i < raw.length; i += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    raw[i] = seed % 256;
  }
  return raw;
}

async function makeBigJpeg(): Promise<Buffer> {
  return sharp(noisyPixels(400, 300), { raw: { width: 400, height: 300, channels: 3 } })
    .jpeg({ quality: 100 })
    .toBuffer();
}

describe("POST /tools/image/compress", () => {
  it("shrinks a noisy JPEG and keeps dimensions + format", async () => {
    const big = await makeBigJpeg();
    const res = await request(app)
      .post("/tools/image/compress")
      .field("quality", "30")
      .attach("files", big, "photo.jpg");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("image/jpeg");
    createdFileIds.push(res.body.data.fileId as string);
    expect(Number(res.body.data.size)).toBeLessThan(big.length);

    const dl = await request(app).get(res.body.data.downloadUrl as string);
    expect(dl.status).toBe(200);
    expect(dl.headers["content-type"]).toContain("image/jpeg");
    const meta = await sharp(dl.body as Buffer).metadata();
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(300);
    expect(meta.format).toBe("jpeg");
  });

  it("400 for out-of-range quality (body schema)", async () => {
    const big = await makeBigJpeg();
    const res = await request(app)
      .post("/tools/image/compress")
      .field("quality", "101")
      .attach("files", big, "photo.jpg");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("400 when two files uploaded (exactly one)", async () => {
    const big = await makeBigJpeg();
    const res = await request(app)
      .post("/tools/image/compress")
      .attach("files", big, "a.jpg")
      .attach("files", big, "b.jpg");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("Exactly one image");
  });

  it("400 for non-image bytes with an image name", async () => {
    const res = await request(app)
      .post("/tools/image/compress")
      .attach("files", Buffer.from("not an image"), "photo.png");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not a valid image");
  });
});
