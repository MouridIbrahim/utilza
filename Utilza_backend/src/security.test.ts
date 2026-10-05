import { afterAll, describe, expect, it } from "vitest";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { prisma } from "./lib/prisma.js";
import { TEST_PASSWORD, removeUser, uniqueEmail } from "./test-utils.js";

const app = createApp();
const email = uniqueEmail("sec");

afterAll(async () => {
  await removeUser(email);
  await prisma.$disconnect();
});

describe("security: headers", () => {
  it("helmet sets hardening headers", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["content-security-policy"]).toBeTruthy();
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("security: CORS allowlist", () => {
  it("echoes only the configured origin", async () => {
    const ok = await request(app).get("/health").set("Origin", "http://localhost:5173");
    expect(ok.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("does not allow unknown origins", async () => {
    const evil = await request(app).get("/health").set("Origin", "http://evil.example");
    expect(evil.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("security: authentication", () => {
  it("rejects tokens signed with the wrong secret", async () => {
    const forged = jwt.sign(
      { sub: "x", email: "x@example.com" },
      "wrong-secret-32-chars-minimum!!!!",
    );
    const res = await request(app).get("/api/v1/users/me").set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects expired tokens", async () => {
    const expired = jwt.sign(
      { sub: "x", email: "x@example.com", exp: Math.floor(Date.now() / 1000) - 60 },
      env.JWT_SECRET,
    );
    const res = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });
});

describe("security: input handling", () => {
  it("rejects malformed JSON with 400 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .set("Content-Type", "application/json")
      .send("{ this is not json");
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("404 unknown routes with stable shape (no internals leaked)", async () => {
    const res = await request(app).get("/api/v1/definitely-not-a-route");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: expect.any(String) },
    });
    expect(JSON.stringify(res.body)).not.toContain("node_modules");
    expect(JSON.stringify(res.body)).not.toContain("E:\\");
  });

  it("500s return a generic message with no stack or paths", async () => {
    const boomApp = express();
    boomApp.get("/boom", () => {
      throw new Error("internal detail at E:\\Utilza\\Utilza_backend\\src\\boom.ts");
    });
    boomApp.use(errorMiddleware);
    const res = await request(boomApp).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
    expect(res.body.error.message).toBe("Something went wrong. Please try again.");
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain("boom.ts");
    expect(raw).not.toContain("stack");
    expect(res.body.error).not.toHaveProperty("details");
  });
});

describe("security: secret leakage", () => {
  it("register/login responses never contain password material", async () => {
    const reg = await request(app)
      .post("/api/v1/auth/register")
      .send({ email, password: TEST_PASSWORD });
    expect(reg.status).toBe(201);
    const raw = JSON.stringify(reg.body);
    expect(raw).not.toContain("passwordHash");
    expect(raw).not.toContain("password");
    expect(raw).not.toContain(env.JWT_SECRET);
    expect(raw).not.toContain(env.DATABASE_URL);
  });
});

describe("security: analytics input", () => {
  it("rejects events for unknown toolSlug", async () => {
    const res = await request(app)
      .post("/api/v1/analytics")
      .send({ event: "tool_completed", toolSlug: "nope-not-real", platform: "web" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.message).toBe("Unknown toolSlug.");
  });

  it("rejects oversized payloads (101KB JSON > 100kb limit)", async () => {
    const big = { event: "tool_opened", pad: "x".repeat(101 * 1024) };
    const res = await request(app)
      .post("/api/v1/analytics")
      .set("Content-Type", "application/json")
      .send(JSON.stringify(big));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});
