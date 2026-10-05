import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";

const app = createApp();

describe("health", () => {
  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/v1/health returns db status", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
  });
});

describe("tools registry (DB fallback)", () => {
  it("lists MVP tools", async () => {
    const res = await request(app).get("/api/v1/tools");
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(10);
  });

  it("resolves percentage-calculator", async () => {
    const res = await request(app).get("/api/v1/tools/percentage-calculator");
    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe("percentage-calculator");
  });

  it("exposes new-architecture classification on every tool", async () => {
    const first = await request(app).get("/api/v1/tools?limit=50");
    expect(first.status).toBe(200);
    const second = await request(app).get("/api/v1/tools?limit=50&page=2");
    expect(second.status).toBe(200);
    const items = [
      ...(first.body.data.items as Array<Record<string, unknown>>),
      ...(second.body.data.items as Array<Record<string, unknown>>),
    ];
    expect(items.length).toBe(first.body.data.total);
    for (const item of items) {
      expect(["frontend", "backend"]).toContain(item["implementation"]);
      expect(item["platforms"]).toEqual(expect.arrayContaining(["web", "mobile"]));
      expect(typeof item["requiresFile"]).toBe("boolean");
      expect(typeof item["requiresAuth"]).toBe("boolean");
      expect(typeof item["supportsOffline"]).toBe("boolean");
    }
    // MVP frontend tools stay frontend (06 §26 — no backend endpoint).
    const backendSlugs = [
      "pdf-merge",
      "pdf-split",
      "pdf-compress",
      "pdf-to-word",
      "image-compress",
      "image-convert",
      "word-to-pdf",
      "image-to-pdf",
      "pdf-rotate",
      "pdf-page-delete",
      "pdf-text",
      "pdf-metadata",
      "pdf-watermark",
      "pdf-number-pages",
      "pdf-header-footer",
      "pdf-reorder",
      "pdf-duplicate",
      "pdf-flatten",
      "pdf-search",
      "word-to-txt",
      "word-to-html",
      "word-to-markdown",
      "txt-to-pdf",
      "excel-to-csv",
      "excel-to-json",
      "csv-to-json",
      "csv-to-excel",
      "json-to-csv",
      "markdown-to-html",
      "document-metadata",
      "image-resize",
      "image-crop",
      "image-rotate",
      "image-flip",
      "zip-create",
      "zip-extract",
      "file-hash",
      "base64-encode",
      "base64-decode",
      "image-grayscale",
      "image-blur",
      "image-sharpen",
      "image-brightness",
      "image-contrast",
      "file-metadata",
      "file-type",
      "image-pixelate",
      "image-watermark",
      "image-metadata",
      "file-merge",
      "file-split",
      "file-compress",
      "image-exif-remove",
      "image-favicon",
      "image-montage",
      "pdf-redact",
      "image-social",
      "image-passport",
    ];
    const frontend = items.filter((i) => !backendSlugs.includes(i["slug"] as string));
    expect(frontend.every((i) => i["implementation"] === "frontend")).toBe(true);
    // Backend executors (TASK-104+).
    for (const slug of backendSlugs) {
      const tool = items.find((i) => i["slug"] === slug);
      expect(tool?.["implementation"]).toBe("backend");
      expect(tool?.["requiresFile"]).toBe(true);
      expect(tool?.["supportsOffline"]).toBe(false);
    }
  });

  it("404 unknown tool with stable code", async () => {
    const res = await request(app).get("/api/v1/tools/nope-not-real");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("TOOL_NOT_FOUND");
  });

  it("search filters", async () => {
    const res = await request(app).get("/api/v1/tools?search=percentage");
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
  });
});

describe("categories", () => {
  it("lists categories", async () => {
    const res = await request(app).get("/api/v1/categories");
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(3);
  });
});

describe("analytics", () => {
  it("accepts allowed event anonymously", async () => {
    const res = await request(app)
      .post("/api/v1/analytics")
      .send({ event: "tool_completed", toolSlug: "word-counter", platform: "web" });
    expect(res.status).toBe(201);
  });

  it("rejects unknown event with VALIDATION_ERROR", async () => {
    const res = await request(app).post("/api/v1/analytics").send({ event: "hacked" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("auth guards", () => {
  it("401 without token on protected route", async () => {
    const res = await request(app).get("/api/v1/favorites");
    expect(res.status).toBe(401);
  });

  it("400 on bad register body (validation, no DB hit)", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({ email: "bad" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("files", () => {
  it("400 when no file uploaded", async () => {
    const res = await request(app).post("/api/v1/files/process");
    expect(res.status).toBe(400);
  });
});
