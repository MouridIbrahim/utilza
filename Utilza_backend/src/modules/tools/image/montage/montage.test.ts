import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import sharp, { type Metadata } from "sharp";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { montageRouter } from "./montage.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/image/montage", montageRouter);
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

async function makePng(color = { r: 100, g: 150, b: 200 }): Promise<Buffer> {
  return sharp({
    create: { width: 100, height: 100, channels: 3, background: color },
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
  console.log("DOWNLOAD STATUS:", dl.status, "FILE ID:", fileId, "BODY LENGTH:", dl.body?.length);
  expect(dl.status).toBe(200);
  const metadata = sharp(dl.body as Buffer).metadata();
  console.log("SHARP METADATA:", JSON.stringify(await metadata, null, 2));
  return metadata;
}

function track(res: { body: { data: { fileId: string } } }): void {
  createdFileIds.push(res.body.data.fileId as string);
}

describe("POST /tools/image/montage", () => {
  it("creates a 2x2 montage", async () => {
    const res = await request(app)
      .post("/tools/image/montage")
      .field("cols", "2")
      .field("rows", "2")
      .attach("files", await makePng({ r: 200, g: 50, b: 50 }), "a.png")
      .attach("files", await makePng({ r: 50, g: 200, b: 50 }), "b.png")
      .attach("files", await makePng({ r: 50, g: 50, b: 200 }), "c.png")
      .attach("files", await makePng({ r: 200, g: 200, b: 50 }), "d.png");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("image/png");
    console.log("FILE ID:", res.body.data.fileId);
    track(res);
    const meta = await downloadMeta(res.body.data.fileId as string);
    console.log("META KEYS:", Object.keys(meta));
    console.log("META:", JSON.stringify(meta, null, 2).slice(0, 500));
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(200);
  });

  it("creates a 1x3 montage with custom gap and background", async () => {
    const res = await request(app)
      .post("/tools/image/montage")
      .field("cols", "3")
      .field("rows", "1")
      .field("gap", "10")
      .field("background", "#000000")
      .attach("files", await makePng({ r: 255, g: 0, b: 0 }), "a.png")
      .attach("files", await makePng({ r: 0, g: 255, b: 0 }), "b.png")
      .attach("files", await makePng({ r: 0, g: 0, b: 255 }), "c.png");
    expect(res.status).toBe(200);
    track(res);
    const meta = await downloadMeta(res.body.data.fileId as string);
    expect(meta.width).toBe(320); // 3*100 + 2*10
    expect(meta.height).toBe(100);
  });

  it("400 when image count doesn't match grid", async () => {
    const res = await request(app)
      .post("/tools/image/montage")
      .field("cols", "2")
      .field("rows", "2")
      .attach("files", await makePng(), "a.png")
      .attach("files", await makePng(), "b.png")
      .attach("files", await makePng(), "c.png");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("requires exactly 4");
  });

  it("400 for bad cols/rows (body schema)", async () => {
    const res = await request(app)
      .post("/tools/image/montage")
      .field("cols", "0")
      .field("rows", "2")
      .attach("files", await makePng(), "a.png")
      .attach("files", await makePng(), "b.png");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("400 for non-image file", async () => {
    const res = await request(app)
      .post("/tools/image/montage")
      .field("cols", "2")
      .field("rows", "1")
      .attach("files", Buffer.from("not an image"), "a.png")
      .attach("files", await makePng(), "b.png");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not a valid image");
  });
});
