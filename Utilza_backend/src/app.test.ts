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
    const res = await request(app).get("/api/v1/tools?limit=50");
    expect(res.status).toBe(200);
    const items = res.body.data.items as Array<Record<string, unknown>>;
    expect(items.length).toBeGreaterThanOrEqual(10);
    for (const item of items) {
      expect(["frontend", "backend"]).toContain(item["implementation"]);
      expect(item["platforms"]).toEqual(expect.arrayContaining(["web", "mobile"]));
      expect(typeof item["requiresFile"]).toBe("boolean");
      expect(typeof item["requiresAuth"]).toBe("boolean");
      expect(typeof item["supportsOffline"]).toBe("boolean");
    }
    // All 10 MVP tools are frontend tools (06 §26 — no backend endpoint).
    expect(items.every((i) => i["implementation"] === "frontend")).toBe(true);
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
