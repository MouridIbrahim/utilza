import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { bearer, registerUser, removeUser, uniqueEmail } from "../../test-utils.js";

const app = createApp();

const adminEmail = uniqueEmail("adm_admin");
const memberEmail = uniqueEmail("adm_member");
const originalAdminEmails = process.env["ADMIN_EMAILS"] ?? "";

beforeAll(() => {
  process.env["ADMIN_EMAILS"] = adminEmail;
});

afterAll(async () => {
  process.env["ADMIN_EMAILS"] = originalAdminEmails;
  await removeUser(adminEmail);
  await removeUser(memberEmail);
  await prisma.$disconnect();
});

describe("admin module", () => {
  let admin: Awaited<ReturnType<typeof registerUser>>;

  it("401 without token", async () => {
    const tools = await request(app).get("/api/v1/admin/tools");
    const users = await request(app).get("/api/v1/admin/users");
    expect(tools.status).toBe(401);
    expect(users.status).toBe(401);
  });

  it("403 FORBIDDEN for authenticated non-admin", async () => {
    const member = await registerUser(app, "adm_member", memberEmail);
    const res = await request(app).get("/api/v1/admin/tools").set(bearer(member.token));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("lists all tools (incl. inactive) for the admin, with pagination", async () => {
    admin = await registerUser(app, "adm_admin", adminEmail);
    const res = await request(app).get("/api/v1/admin/tools?limit=5").set(bearer(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(10);
    expect(res.body.data.items.length).toBeLessThanOrEqual(5);
    expect(res.body.data.items[0]).toHaveProperty("isActive");
    expect(res.body.data.items[0]).toHaveProperty("slug");
  });

  it("lists users without ever exposing passwordHash", async () => {
    const res = await request(app).get("/api/v1/admin/users?limit=50").set(bearer(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    const target = (res.body.data.items as Array<{ email: string }>).find(
      (u) => u.email === memberEmail,
    );
    expect(target).toBeTruthy();
    expect(target).not.toHaveProperty("passwordHash");
  });

  it("400 for invalid pagination query", async () => {
    const res = await request(app).get("/api/v1/admin/tools?limit=1000").set(bearer(admin.token));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("denies admin routes entirely when ADMIN_EMAILS is empty", async () => {
    process.env["ADMIN_EMAILS"] = "";
    try {
      const res = await request(app).get("/api/v1/admin/tools").set(bearer(admin.token));
      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain("not configured");
    } finally {
      process.env["ADMIN_EMAILS"] = adminEmail;
    }
  });
});
