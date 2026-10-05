import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { imageToPdfRouter } from "./from-image.routes.js";
import { rotatePdfRouter } from "../rotate-pages/rotate-pages.routes.js";
import { deletePagesRouter } from "../delete-pages/delete-pages.routes.js";
import { extractTextRouter } from "../extract-text/extract-text.routes.js";
import { pdfMetadataRouter } from "../metadata/metadata.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/pdf/from-image", imageToPdfRouter);
  app.use("/tools/pdf/rotate", rotatePdfRouter);
  app.use("/tools/pdf/delete-pages", deletePagesRouter);
  app.use("/tools/pdf/text", extractTextRouter);
  app.use("/tools/pdf/metadata", pdfMetadataRouter);
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

async function makePdf(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) doc.addPage([595, 842]);
  return Buffer.from(await doc.save());
}

async function makePng(width = 200, height = 100): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 10, g: 120, b: 200 } },
  })
    .png()
    .toBuffer();
}

function track(res: { body: { data: { fileId: string } } }): void {
  createdFileIds.push(res.body.data.fileId as string);
}

describe("POST /tools/pdf/from-image", () => {
  it("combines png+jpg into a 2-page PDF", async () => {
    const jpg = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 200, g: 10, b: 10 } },
    })
      .jpeg()
      .toBuffer();
    const res = await request(app)
      .post("/tools/pdf/from-image")
      .attach("files", await makePng(), "a.png")
      .attach("files", jpg, "b.jpg");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("application/pdf");
    track(res);
    const dl = await request(app).get(res.body.data.downloadUrl as string);
    const doc = await PDFDocument.load(Buffer.from(dl.body as unknown as ArrayBuffer));
    expect(doc.getPageCount()).toBe(2);
  });

  it("400 for non-image bytes with an image name", async () => {
    const res = await request(app)
      .post("/tools/pdf/from-image")
      .attach("files", Buffer.from("nope"), "a.png");
    expect(res.status).toBe(400);
  });

  it("400 when no files uploaded", async () => {
    const res = await request(app).post("/tools/pdf/from-image");
    expect(res.status).toBe(400);
  });
});

describe("POST /tools/pdf/rotate", () => {
  it("rotates all pages 90° by default", async () => {
    const res = await request(app)
      .post("/tools/pdf/rotate")
      .field("angle", "90")
      .attach("files", await makePdf(2), "doc.pdf");
    expect(res.status).toBe(200);
    track(res);
    const dl = await request(app).get(res.body.data.downloadUrl as string);
    const doc = await PDFDocument.load(Buffer.from(dl.body as unknown as ArrayBuffer));
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getPage(0).getRotation().angle).toBe(90);
    expect(doc.getPage(1).getRotation().angle).toBe(90);
  });

  it("rotates only ranged pages", async () => {
    const res = await request(app)
      .post("/tools/pdf/rotate")
      .field("angle", "180")
      .field("ranges", "2")
      .attach("files", await makePdf(2), "doc.pdf");
    expect(res.status).toBe(200);
    track(res);
    const dl = await request(app).get(res.body.data.downloadUrl as string);
    const doc = await PDFDocument.load(Buffer.from(dl.body as unknown as ArrayBuffer));
    expect(doc.getPage(0).getRotation().angle).toBe(0);
    expect(doc.getPage(1).getRotation().angle).toBe(180);
  });

  it("400 for bad angle (body schema)", async () => {
    const res = await request(app)
      .post("/tools/pdf/rotate")
      .field("angle", "45")
      .attach("files", await makePdf(1), "doc.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /tools/pdf/delete-pages", () => {
  it("removes ranged pages", async () => {
    const res = await request(app)
      .post("/tools/pdf/delete-pages")
      .field("ranges", "1,3")
      .attach("files", await makePdf(3), "doc.pdf");
    expect(res.status).toBe(200);
    track(res);
    const dl = await request(app).get(res.body.data.downloadUrl as string);
    const doc = await PDFDocument.load(Buffer.from(dl.body as unknown as ArrayBuffer));
    expect(doc.getPageCount()).toBe(1);
  });

  it("400 when deleting all pages", async () => {
    const res = await request(app)
      .post("/tools/pdf/delete-pages")
      .field("ranges", "1-2")
      .attach("files", await makePdf(2), "doc.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("Cannot delete all pages");
  });

  it("400 when ranges missing", async () => {
    const res = await request(app)
      .post("/tools/pdf/delete-pages")
      .attach("files", await makePdf(2), "doc.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /tools/pdf/text", () => {
  it("returns pageCount + pages JSON", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([595, 842]);
    page.drawText("extract me", { x: 50, y: 750, size: 14, font });
    const pdf = Buffer.from(await doc.save());
    const res = await request(app).post("/tools/pdf/text").attach("files", pdf, "doc.pdf");
    expect(res.status).toBe(200);
    expect(res.body.data.pageCount).toBe(1);
    expect(JSON.stringify(res.body.data.pages)).toContain("extract me");
    expect(res.body.data.charCount).toBeGreaterThan(0);
  });

  it("400 for non-PDF upload", async () => {
    const res = await request(app)
      .post("/tools/pdf/text")
      .attach("files", Buffer.from("x"), "a.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not a valid PDF");
  });
});

describe("POST /tools/pdf/metadata", () => {
  it("returns metadata with pageCount", async () => {
    const doc = await PDFDocument.create();
    doc.setTitle("Meta Title");
    doc.setAuthor("Meta Author");
    doc.addPage([595, 842]);
    const pdf = Buffer.from(await doc.save());
    const res = await request(app).post("/tools/pdf/metadata").attach("files", pdf, "doc.pdf");
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Meta Title");
    expect(res.body.data.author).toBe("Meta Author");
    expect(res.body.data.pageCount).toBe(1);
    expect(JSON.stringify(res.body)).not.toContain("%PDF");
  });

  it("nulls absent fields", async () => {
    const res = await request(app)
      .post("/tools/pdf/metadata")
      .attach("files", await makePdf(1), "doc.pdf");
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBeNull();
  });
});
