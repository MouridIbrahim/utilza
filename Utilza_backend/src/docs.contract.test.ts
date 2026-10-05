import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Contract inventory: every route the app exposes must be documented in
// docs/API.md (05-AI-AGENT-RULES.md:338 — shared API contract). Adding a
// route? Add it here and to docs/API.md, or this test fails.
const ENDPOINTS = [
  "GET /health",
  "GET /api/v1/health",
  "POST /api/v1/auth/register",
  "POST /api/v1/auth/login",
  "POST /api/v1/auth/logout",
  "GET /api/v1/auth/me",
  "GET /api/v1/users/me",
  "PATCH /api/v1/users/me",
  "DELETE /api/v1/users/me",
  "GET /api/v1/categories",
  "GET /api/v1/categories/:slug",
  "POST /api/v1/categories",
  "PATCH /api/v1/categories/:slug",
  "DELETE /api/v1/categories/:slug",
  "GET /api/v1/tools",
  "GET /api/v1/tools/:slug",
  "GET /api/v1/favorites",
  "POST /api/v1/favorites",
  "DELETE /api/v1/favorites/:toolId",
  "GET /api/v1/history",
  "POST /api/v1/history",
  "DELETE /api/v1/history",
  "POST /api/v1/analytics",
  "GET /api/v1/subscriptions/me",
  "POST /api/v1/subscriptions/webhook",
  "POST /api/v1/files/process",
  "GET /api/v1/files/:fileId",
  "GET /api/v1/admin/tools",
  "GET /api/v1/admin/users",
];

const ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "TOOL_NOT_FOUND",
  "CATEGORY_NOT_FOUND",
  "PAYLOAD_TOO_LARGE",
  "FILE_TOO_LARGE",
  "UPLOAD_ERROR",
  "FILE_NOT_FOUND",
  "FILE_EXPIRED",
  "EMAIL_TAKEN",
  "ALREADY_FAVORITED",
  "RATE_LIMITED",
  "NOT_IMPLEMENTED",
  "INTERNAL_ERROR",
];

describe("docs/API.md contract coverage", () => {
  const doc = readFileSync("docs/API.md", "utf8");

  it.each(ENDPOINTS)("documents %s", (endpoint) => {
    expect(doc, `${endpoint} missing from docs/API.md`).toContain(endpoint);
  });

  it.each(ERROR_CODES)("documents error code %s", (code) => {
    expect(doc, `error code ${code} missing from docs/API.md`).toContain(code);
  });
});
