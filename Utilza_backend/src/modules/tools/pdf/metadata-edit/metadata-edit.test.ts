import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PDFDocument } from "pdf-lib";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { metadataEditRouter } from "./metadata-edit.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/pdf/metadata-edit", metadataEditRouter);
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

async function makePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle("Old Title");
  doc.addPage([595, 842]);
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

describe("POST /tools/pdf/metadata-edit", () => {
  it("sets title/author and preserves pages", async () => {
    const res = await request(app)
      .post("/tools/pdf/metadata-edit")
      .field("title", "New Title")
      .field("author", "New Author")
      .attach("files", await makePdf(), "doc.pdf");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("application/pdf");
    track(res);
    const doc = await PDFDocument.load(await downloadBytes(res.body.data.fileId as string));
    expect(doc.getTitle()).toBe("New Title");
    expect(doc.getAuthor()).toBe("New Author");
    expect(doc.getPageCount()).toBe(1);
  });

  it("clears a field with empty string, leaves others alone", async () => {
    const res = await request(app)
      .post("/tools/pdf/metadata-edit")
      .field("title", "")
      .attach("files", await makePdf(), "doc.pdf");
    expect(res.status).toBe(200);
    track(res);
    const doc = await PDFDocument.load(await downloadBytes(res.body.data.fileId as string));
    // pdf-lib stores cleared fields as "" — reads back empty either way.
    expect(doc.getTitle()).toBeFalsy();
  });

  it("400 when no fields given", async () => {
    const res = await request(app)
      .post("/tools/pdf/metadata-edit")
      .attach("files", await makePdf(), "doc.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("400 for non-PDF bytes", async () => {
    const res = await request(app)
      .post("/tools/pdf/metadata-edit")
      .field("title", "x")
      .attach("files", Buffer.from("nope"), "doc.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not a valid PDF");
  });
});
