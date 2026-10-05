import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import ExcelJS from "exceljs";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { parseCsv, stringifyCsv } from "./csv.js";
import {
  csvToExcelRouter,
  csvToJsonRouter,
  excelToCsvRouter,
  excelToJsonRouter,
  jsonToCsvRouter,
} from "./spreadsheet.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/document/excel-to-csv", excelToCsvRouter);
  app.use("/tools/document/excel-to-json", excelToJsonRouter);
  app.use("/tools/document/csv-to-json", csvToJsonRouter);
  app.use("/tools/document/csv-to-excel", csvToExcelRouter);
  app.use("/tools/document/json-to-csv", jsonToCsvRouter);
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

async function makeXlsx(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");
  sheet.addRow(["name", "age"]);
  sheet.addRow(["Ann", 30]);
  sheet.addRow(["Bob", 25]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

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

describe("csv helpers", () => {
  it("round-trips quotes, commas and newlines", () => {
    const rows = [
      ["a", 'b"c', "d,e", "f\ng"],
      ["1", "2", "3", "4"],
    ];
    expect(parseCsv(stringifyCsv(rows))).toEqual(rows);
  });

  it("rejects unterminated quotes", () => {
    expect(() => parseCsv('a,"oops\n1,2')).toThrow();
  });

  it("rejects >100 columns", () => {
    expect(() => parseCsv(new Array<string>(101).fill("x").join(","))).toThrow();
  });

  it("dedupes headers", async () => {
    const { uniqueHeaders } = await import("./csv.js");
    expect(uniqueHeaders(["a", "a", ""])).toEqual(["a", "a_2", "col3"]);
  });
});

describe("POST /tools/document/excel-to-csv", () => {
  it("converts the first sheet to CSV", async () => {
    const res = await request(app)
      .post("/tools/document/excel-to-csv")
      .attach("files", await makeXlsx(), "data.xlsx");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("text/csv");
    track(res);
    const text = await downloadText(res.body.data.fileId as string);
    expect(parseCsv(text)).toEqual([
      ["name", "age"],
      ["Ann", "30"],
      ["Bob", "25"],
    ]);
  });

  it("400 for non-workbook bytes", async () => {
    const res = await request(app)
      .post("/tools/document/excel-to-csv")
      .attach("files", Buffer.from("not excel"), "data.xlsx");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not a valid Excel workbook");
  });
});

describe("POST /tools/document/excel-to-json", () => {
  it("converts rows to objects keyed by headers", async () => {
    const res = await request(app)
      .post("/tools/document/excel-to-json")
      .attach("files", await makeXlsx(), "data.xlsx");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("application/json");
    track(res);
    const docs = JSON.parse(await downloadText(res.body.data.fileId as string)) as Array<
      Record<string, unknown>
    >;
    expect(docs).toEqual([
      { name: "Ann", age: 30 },
      { name: "Bob", age: 25 },
    ]);
  });
});

describe("POST /tools/document/csv-to-json", () => {
  it("converts CSV rows to objects", async () => {
    const res = await request(app)
      .post("/tools/document/csv-to-json")
      .attach("files", Buffer.from("name,age\nAnn,30\n"), "a.csv");
    expect(res.status).toBe(200);
    track(res);
    expect(JSON.parse(await downloadText(res.body.data.fileId as string))).toEqual([
      { name: "Ann", age: "30" },
    ]);
  });
});

describe("POST /tools/document/csv-to-excel", () => {
  it("round-trips through excel-to-csv", async () => {
    const csv = 'name,note\nAnn,"hi, you"\n';
    const toXlsx = await request(app)
      .post("/tools/document/csv-to-excel")
      .attach("files", Buffer.from(csv), "a.csv");
    expect(toXlsx.status).toBe(200);
    expect(toXlsx.body.data.mimeType).toContain("spreadsheetml");
    track(toXlsx);
    const dl = await request(app)
      .get(toXlsx.body.data.downloadUrl as string)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk as Buffer));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });
    const back = await request(app)
      .post("/tools/document/excel-to-csv")
      .attach("files", dl.body as Buffer, "b.xlsx");
    expect(back.status).toBe(200);
    track(back);
    expect(parseCsv(await downloadText(back.body.data.fileId as string))).toEqual(parseCsv(csv));
  });
});

describe("POST /tools/document/json-to-csv", () => {
  it("converts objects with union keys, nesting JSON-encoded", async () => {
    const docs = [
      { name: "Ann", tags: ["a", "b"] },
      { name: "Bob", age: 25 },
    ];
    const res = await request(app)
      .post("/tools/document/json-to-csv")
      .attach("files", Buffer.from(JSON.stringify(docs)), "a.json");
    expect(res.status).toBe(200);
    track(res);
    expect(parseCsv(await downloadText(res.body.data.fileId as string))).toEqual([
      ["name", "tags", "age"],
      ["Ann", '["a","b"]', ""],
      ["Bob", "", "25"],
    ]);
  });

  it("400 for non-array JSON", async () => {
    const res = await request(app)
      .post("/tools/document/json-to-csv")
      .attach("files", Buffer.from('{"a":1}'), "a.json");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("array of objects");
  });

  it("400 for invalid JSON", async () => {
    const res = await request(app)
      .post("/tools/document/json-to-csv")
      .attach("files", Buffer.from("{oops"), "a.json");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not valid JSON");
  });
});
