import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Document, Packer, Paragraph, TextRun } from "docx";
import ExcelJS from "exceljs";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { markdownToHtmlRouter } from "../markdown-to-html/markdown-to-html.routes.js";
import { documentMetadataRouter } from "../metadata/metadata.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/document/markdown-to-html", markdownToHtmlRouter);
  app.use("/tools/document/metadata", documentMetadataRouter);
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

async function downloadText(fileId: string): Promise<string> {
  const dl = await request(app)
    .get(`/api/v1/files/${fileId}`)
    .buffer(true)
    .parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk as Buffer));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
  expect(dl.status).toBe(200);
  return (dl.body as Buffer).toString("utf8");
}

function track(res: { body: { data: { fileId: string } } }): void {
  createdFileIds.push(res.body.data.fileId as string);
}

describe("POST /tools/document/markdown-to-html", () => {
  it("renders headings, emphasis, lists and code", async () => {
    const md = "# Title\n\nHello **bold** and *italic*.\n\n- one\n- two\n\n`code`\n";
    const res = await request(app)
      .post("/tools/document/markdown-to-html")
      .attach("files", Buffer.from(md), "doc.md");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("text/html");
    track(res);
    const html = await downloadText(res.body.data.fileId as string);
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<code>code</code>");
  });

  it("strips scripts and event handlers", async () => {
    const md = '# Hi\n\n<script>alert("x")</script>\n\n<a href="u" onclick="evil()">x</a>\n';
    const res = await request(app)
      .post("/tools/document/markdown-to-html")
      .attach("files", Buffer.from(md), "doc.md");
    expect(res.status).toBe(200);
    track(res);
    const html = await downloadText(res.body.data.fileId as string);
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onclick");
    expect(html).toContain("Hi");
  });

  it("400 for empty markdown", async () => {
    const res = await request(app)
      .post("/tools/document/markdown-to-html")
      .attach("files", Buffer.from("   \n"), "doc.md");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("No text found");
  });
});

describe("POST /tools/document/metadata", () => {
  it("reads docx core properties", async () => {
    const word = new Document({
      creator: "Meta Tester",
      title: "Meta Doc",
      sections: [{ children: [new Paragraph({ children: [new TextRun("hi")] })] }],
    });
    const res = await request(app)
      .post("/tools/document/metadata")
      .attach("files", Buffer.from(await Packer.toBuffer(word)), "doc.docx");
    expect(res.status).toBe(200);
    expect(res.body.data.format).toBe("docx");
    expect(res.body.data.creator).toBe("Meta Tester");
    expect(res.body.data.title).toBe("Meta Doc");
  });

  it("reads xlsx properties and sheet count", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sheet Tester";
    workbook.addWorksheet("S1");
    workbook.addWorksheet("S2");
    const buf = Buffer.from(await workbook.xlsx.writeBuffer());
    const res = await request(app)
      .post("/tools/document/metadata")
      .attach("files", buf, "data.xlsx");
    expect(res.status).toBe(200);
    expect(res.body.data.format).toBe("xlsx");
    expect(res.body.data.creator).toBe("Sheet Tester");
    expect(res.body.data.sheets).toBe(2);
  });

  it("400 for unsupported extension", async () => {
    const res = await request(app)
      .post("/tools/document/metadata")
      .attach("files", Buffer.from("x"), "a.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("expected .docx or .xlsx");
  });
});
