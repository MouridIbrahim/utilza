import express, { type NextFunction, type Request, type Response } from "express";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { z } from "zod";
import { validate } from "./validation.middleware.js";
import {
  requireAuth,
  requireOwnership,
  optionalAuth,
  signToken,
  verifyToken,
  type AuthRequest,
} from "./auth.middleware.js";
import { makeLimiter } from "./rate-limit.middleware.js";
import { env } from "../config/env.js";
import { badRequest, conflict, forbidden, notFound, unauthorized } from "../utils/errors.js";

interface TestAppError {
  status?: number;
  code?: string;
  message: string;
  details?: unknown;
}

function makeTestApp() {
  const app = express();
  app.use(express.json());

  app.post(
    "/echo-body",
    validate({
      body: z.object({ name: z.string().min(2), age: z.coerce.number().optional() }),
    }),
    (req, res) => res.json({ body: req.body }),
  );

  app.get(
    "/echo-query",
    validate({ query: z.object({ page: z.coerce.number().int().min(1).default(1) }) }),
    (req, res) => res.json({ query: req.query }),
  );

  app.get("/protected", requireAuth, (req: AuthRequest, res) => res.json({ user: req.user }));

  app.get("/maybe-protected", optionalAuth, (req: AuthRequest, res) =>
    res.json({ user: req.user ?? null }),
  );

  app.get("/limited", makeLimiter(60_000, 2, "Slow down."), (_req, res) => res.json({ ok: true }));

  app.use((err: TestAppError, _req: Request, res: Response, _next: NextFunction) => {
    res.status(err.status ?? 500).json({
      success: false,
      error: { code: err.code ?? "INTERNAL_ERROR", message: err.message, details: err.details },
    });
  });

  return app;
}

describe("environment", () => {
  it("runs in test mode (enables relaxed rate limits + silent logs)", () => {
    expect(env.NODE_ENV).toBe("test");
  });
});

describe("validation middleware", () => {
  const app = makeTestApp();

  it("accepts valid body and replaces req.body with parsed value", async () => {
    const res = await request(app).post("/echo-body").send({ name: "Jo", age: "25" });
    expect(res.status).toBe(200);
    expect(res.body.body).toEqual({ name: "Jo", age: 25 });
  });

  it("rejects invalid body with 400 VALIDATION_ERROR + details", async () => {
    const res = await request(app).post("/echo-body").send({ name: "x" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toBeTruthy();
  });

  it("coerces query params", async () => {
    const res = await request(app).get("/echo-query?page=3");
    expect(res.status).toBe(200);
    expect(res.body.query.page).toBe(3);
  });

  it("applies query defaults", async () => {
    const res = await request(app).get("/echo-query");
    expect(res.body.query.page).toBe(1);
  });
});

describe("auth middleware", () => {
  const app = makeTestApp();

  it("401 without Authorization header", async () => {
    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("401 with garbage token", async () => {
    const res = await request(app).get("/protected").set("Authorization", "Bearer garbage");
    expect(res.status).toBe(401);
  });

  it("200 + user identity with valid token", async () => {
    const token = signToken("user-123", "u@example.com");
    const res = await request(app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe("user-123");
    expect(res.body.user.email).toBe("u@example.com");
  });

  it("verifyToken round-trips payload", () => {
    const token = signToken("abc", "a@b.c");
    const payload = verifyToken(token);
    expect(payload.sub).toBe("abc");
    expect(payload.email).toBe("a@b.c");
  });

  it("verifyToken rejects malformed tokens", () => {
    expect(() => verifyToken("not.a.jwt")).toThrow();
  });
});

describe("optionalAuth middleware", () => {
  const app = makeTestApp();

  it("attaches the user when the token is valid", async () => {
    const token = signToken("user-9", "u9@example.com");
    const res = await request(app).get("/maybe-protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe("user-9");
  });

  it("stays anonymous without a token", async () => {
    const res = await request(app).get("/maybe-protected");
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });

  it("stays anonymous with a garbage token (never 401)", async () => {
    const res = await request(app).get("/maybe-protected").set("Authorization", "Bearer garbage");
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });
});

describe("requireOwnership helper", () => {
  const auth = { user: { id: "owner-1", email: "o@example.com" } } as AuthRequest;
  const other = { user: { id: "someone-else", email: "x@example.com" } } as unknown as AuthRequest;

  it("passes when ids match", () => {
    expect(() => requireOwnership("owner-1", auth)).not.toThrow();
  });

  it("throws 403 FORBIDDEN when ids differ", () => {
    try {
      requireOwnership("owner-1", other);
      expect.unreachable("should have thrown");
    } catch (err) {
      const e = err as { status?: number; code?: string };
      expect(e.status).toBe(403);
      expect(e.code).toBe("FORBIDDEN");
    }
  });
});

describe("rate limiter behavior (raw factory)", () => {
  const app = makeTestApp();

  it("returns 429 RATE_LIMITED with stable shape after max requests", async () => {
    const first = await request(app).get("/limited");
    const second = await request(app).get("/limited");
    const third = await request(app).get("/limited");
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body.success).toBe(false);
    expect(third.body.error.code).toBe("RATE_LIMITED");
    expect(third.body.error.message).toBe("Slow down.");
  });
});

describe("error helpers", () => {
  it("use stable codes", () => {
    expect(notFound().code).toBe("NOT_FOUND");
    expect(badRequest().code).toBe("VALIDATION_ERROR");
    expect(unauthorized().code).toBe("UNAUTHORIZED");
    expect(forbidden().code).toBe("FORBIDDEN");
    expect(conflict("x").code).toBe("CONFLICT");
    expect(conflict("x", "EMAIL_TAKEN").code).toBe("EMAIL_TAKEN");
  });
});
