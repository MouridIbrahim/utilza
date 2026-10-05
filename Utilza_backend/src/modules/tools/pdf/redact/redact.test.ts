import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PDFDocument } from "pdf-lib";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { redactRouter } from "./redact.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/pdf/redact", redactRouter);
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
  doc.addPage([595, 842]);
  return Buffer.from(await doc.save());
}

function track(res: { body: { data: { fileId: string } } }): void {
  createdFileIds.push(res.body.data.fileId as string);
}

describe("POST /tools/pdf/redact", () => {
  const regions = JSON.stringify([{ page: 1, x: 10, y: 10, w: 100, h: 20 }]);

  it("covers regions and stays a valid 1-page PDF", async () => {
    const res = await request(app)
      .post("/tools/pdf/redact")
      .field("regions", regions)
      .attach("files", await makePdf(), "doc.pdf");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("application/pdf");
    track(res);
    const dl = await request(app).get(res.body.data.downloadUrl as string);
    const doc = await PDFDocument.load(Buffer.from(dl.body as unknown as ArrayBuffer));
    expect(doc.getPageCount()).toBe(1);
  });

  it("400 for out-of-range pages", async () => {
    const res = await request(app)
      .post("/tools/pdf/redact")
      .field("regions", JSON.stringify([{ page: 9, x: 10, y: 10, w: 100, h: 20 }]))
      .attach("files", await makePdf(), "doc.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("out of range");
  });

  it("400 when regions missing", async () => {
    const res = await request(app)
      .post("/tools/pdf/redact")
      .attach("files", await makePdf(), "doc.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
