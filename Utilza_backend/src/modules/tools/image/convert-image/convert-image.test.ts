import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { convertImageRouter } from "./convert-image.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/image/convert", convertImageRouter);
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

function noisyRaw(width: number, height: number): Buffer {
  const raw = Buffer.alloc(width * height * 3);
  let seed = 987654321;
  for (let i = 0; i < raw.length; i += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    raw[i] = seed % 256;
  }
  return raw;
}

async function makePng(): Promise<Buffer> {
  return sharp(noisyRaw(200, 150), { raw: { width: 200, height: 150, channels: 3 } })
    .png()
    .toBuffer();
}

async function convert(file: Buffer, name: string, format: string): Promise<request.Response> {
  return request(app)
    .post("/tools/image/convert")
    .field("format", format)
    .attach("files", file, name);
}

describe("POST /tools/image/convert", () => {
  it("converts png → jpg with dimensions preserved", async () => {
    const res = await convert(await makePng(), "a.png", "jpg");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("image/jpeg");
    createdFileIds.push(res.body.data.fileId as string);

    const dl = await request(app).get(res.body.data.downloadUrl as string);
    expect(dl.status).toBe(200);
    expect(dl.headers["content-disposition"]).toContain(".jpg");
    const meta = await sharp(dl.body as Buffer).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(150);
  });

  it("converts jpg → webp", async () => {
    const jpg = await sharp(noisyRaw(120, 90), { raw: { width: 120, height: 90, channels: 3 } })
      .jpeg({ quality: 90 })
      .toBuffer();
    const res = await convert(jpg, "a.jpg", "webp");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("image/webp");
    createdFileIds.push(res.body.data.fileId as string);
    const meta = await sharp(
      Buffer.from(
        (await request(app).get(res.body.data.downloadUrl as string))
          .body as unknown as ArrayBuffer,
      ),
    ).metadata();
    expect(meta.format).toBe("webp");
  });

  it("400 for unsupported target format (body schema)", async () => {
    const res = await convert(await makePng(), "a.png", "gif");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("400 for missing format", async () => {
    const res = await request(app)
      .post("/tools/image/convert")
      .attach("files", await makePng(), "a.png");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("400 when two files uploaded (exactly one)", async () => {
    const png = await makePng();
    const res = await request(app)
      .post("/tools/image/convert")
      .field("format", "jpg")
      .attach("files", png, "a.png")
      .attach("files", png, "b.png");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("Exactly one image");
  });

  it("400 for non-image bytes", async () => {
    const res = await request(app)
      .post("/tools/image/convert")
      .field("format", "jpg")
      .attach("files", Buffer.from("not an image"), "photo.png");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not a valid image");
  });
});
