import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import JSZip from "jszip";
import sharp from "sharp";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { rasterRouter } from "./to-image.routes.js";
import { signRouter } from "../sign/sign.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/pdf/to-image", rasterRouter);
  app.use("/tools/pdf/sign", signRouter);
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

async function makeTextPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  page.drawText("raster me", { x: 50, y: 750, size: 24, font });
  return Buffer.from(await doc.save());
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

describe("POST /tools/pdf/to-image", () => {
  it("rasterizes pages into a ZIP of PNGs", async () => {
    const res = await request(app)
      .post("/tools/pdf/to-image")
      .attach("files", await makeTextPdf(), "doc.pdf");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("application/zip");
    track(res);
    const zip = await JSZip.loadAsync(await downloadBytes(res.body.data.fileId as string));
    const names = Object.keys(zip.files).filter((n) => !zip.files[n]?.dir);
    expect(names).toEqual(["page-01.png"]);
    const img = await zip.file(names[0] as string)?.async("nodebuffer");
    const meta = await sharp(img).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBeGreaterThan(1000); // scale 2 of 595pt
  });

  it("supports jpg output with page ranges", async () => {
    const res = await request(app)
      .post("/tools/pdf/to-image")
      .field("format", "jpg")
      .field("pages", "1")
      .attach("files", await makeTextPdf(), "doc.pdf");
    expect(res.status).toBe(200);
    track(res);
    const zip = await JSZip.loadAsync(await downloadBytes(res.body.data.fileId as string));
    expect(Object.keys(zip.files)).toEqual(["page-01.jpg"]);
  });

  it("400 for out-of-range pages", async () => {
    const res = await request(app)
      .post("/tools/pdf/to-image")
      .field("pages", "9")
      .attach("files", await makeTextPdf(), "doc.pdf");
    expect(res.status).toBe(400);
  });
});

describe("POST /tools/pdf/sign", () => {
  it("stamps the signature image onto the page", async () => {
    const sig = await sharp({
      create: {
        width: 200,
        height: 60,
        channels: 4,
        background: { r: 20, g: 40, b: 200, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    const res = await request(app)
      .post("/tools/pdf/sign")
      .field("page", "1")
      .field("x", "50")
      .field("y", "50")
      .field("width", "150")
      .attach("files", await makeTextPdf(), "doc.pdf")
      .attach("files", sig, "sig.png");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("application/pdf");
    track(res);
    const doc = await PDFDocument.load(await downloadBytes(res.body.data.fileId as string));
    expect(doc.getPageCount()).toBe(1);
  });

  it("400 without the signature image", async () => {
    const res = await request(app)
      .post("/tools/pdf/sign")
      .attach("files", await makeTextPdf(), "doc.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("one PDF and one signature image");
  });
});
