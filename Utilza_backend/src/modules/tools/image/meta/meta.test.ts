import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import sharp from "sharp";
import JSZip from "jszip";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { exifRouter, faviconRouter } from "./meta.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/image/exif-remove", exifRouter);
  app.use("/tools/image/favicon", faviconRouter);
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

describe("POST /tools/image/exif-remove", () => {
  it("strips EXIF orientation while keeping a valid image", async () => {
    const tagged = await sharp({
      create: { width: 100, height: 60, channels: 3, background: { r: 90, g: 140, b: 70 } },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    expect((await sharp(tagged).metadata()).orientation).toBe(6);
    const res = await request(app)
      .post("/tools/image/exif-remove")
      .attach("files", tagged, "a.jpg");
    expect(res.status).toBe(200);
    track(res);
    const out = await sharp(await downloadBytes(res.body.data.fileId as string)).metadata();
    expect(out.orientation).toBeUndefined();
    expect(out.width).toBe(100);
    expect(out.height).toBe(60);
  });
});

describe("POST /tools/image/favicon", () => {
  it("packs 5 icons + manifest", async () => {
    const png = await sharp({
      create: { width: 300, height: 200, channels: 3, background: { r: 30, g: 90, b: 160 } },
    })
      .png()
      .toBuffer();
    const res = await request(app).post("/tools/image/favicon").attach("files", png, "logo.png");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("application/zip");
    track(res);
    const zip = await JSZip.loadAsync(await downloadBytes(res.body.data.fileId as string));
    const names = Object.keys(zip.files)
      .filter((n) => !zip.files[n]?.dir)
      .sort();
    expect(names).toContain("favicon-16x16.png");
    expect(names).toContain("favicon-32x32.png");
    expect(names).toContain("favicon-48x48.png");
    expect(names).toContain("icon-180x180.png");
    expect(names).toContain("icon-192x192.png");
    expect(names).toContain("site.webmanifest");
    const icon16 = await zip.file("favicon-16x16.png")?.async("nodebuffer");
    expect((await sharp(icon16).metadata()).width).toBe(16);
    const manifest = JSON.parse((await zip.file("site.webmanifest")?.async("string")) ?? "{}") as {
      icons: unknown[];
    };
    expect(manifest.icons).toHaveLength(3);
  });
});
