import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";

const app = createApp();

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("files module", () => {
  it("400 when no file uploaded", async () => {
    const res = await request(app).post("/api/v1/files/process");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.message).toBe("A file upload is required.");
  });

  it("rejects disallowed extension (.exe)", async () => {
    const res = await request(app)
      .post("/api/v1/files/process")
      .attach("file", Buffer.from("MZ fake binary"), "evil.exe");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain(".exe");
  });

  it("rejects path-traversal filename with bad extension", async () => {
    const res = await request(app)
      .post("/api/v1/files/process")
      .attach("file", Buffer.from("MZ"), "../../../evil.exe");
    expect(res.status).toBe(400);
  });

  it("never echoes a traversal filename as a path (extension ok, name dropped)", async () => {
    const res = await request(app)
      .post("/api/v1/files/process")
      .attach("file", PNG_HEADER, "../../evil.png");
    expect(res.status).toBe(200);
    expect(res.body.data.originalName).toBe("upload"); // never the user filename
    expect(res.body.data.ext).toBe("png");
    expect(JSON.stringify(res.body)).not.toContain("..");
  });

  it("rejects zero-byte file", async () => {
    const res = await request(app)
      .post("/api/v1/files/process")
      .attach("file", Buffer.alloc(0), "empty.png");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("File size out of range.");
  });

  it("rejects oversize file (>10MB) with 413 FILE_TOO_LARGE", async () => {
    const big = Buffer.alloc(10 * 1024 * 1024 + 1, 1);
    const res = await request(app).post("/api/v1/files/process").attach("file", big, "big.png");
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("FILE_TOO_LARGE");
    expect(res.body.error.message).toBe("File too large.");
  }, 30000);

  it("accepts a small valid png and returns metadata only (no persistence)", async () => {
    const res = await request(app)
      .post("/api/v1/files/process")
      .attach("file", PNG_HEADER, "sample.png");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.jobId).toBeTruthy();
    expect(res.body.data.ext).toBe("png");
    expect(res.body.data.size).toBe(PNG_HEADER.length);
    expect(res.body.data.originalName).toBe("upload");
    expect(res.body.data.note).toContain("not yet implemented");
  });
});
