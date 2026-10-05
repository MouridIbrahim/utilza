import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { bearer, registerUser, removeUser, uniqueEmail } from "../../test-utils.js";

const app = createApp();

const adminEmail = uniqueEmail("cat_admin");
const memberEmail = uniqueEmail("cat_member");
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

describe("categories public routes", () => {
  it("lists active categories sorted by sortOrder", async () => {
    const res = await request(app).get("/api/v1/categories");
    expect(res.status).toBe(200);
    const items = res.body.data.items as Array<{ slug: string; sortOrder: number }>;
    expect(items.length).toBeGreaterThanOrEqual(4);
    const orders = items.map((c) => c.sortOrder);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });

  it("fetches a category by slug", async () => {
    const res = await request(app).get("/api/v1/categories/calculators");
    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe("calculators");
  });

  it("404 with stable code for unknown slug", async () => {
    const res = await request(app).get("/api/v1/categories/nope-not-real");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("CATEGORY_NOT_FOUND");
  });
});

describe("categories admin write stubs (501, documented decision)", () => {
  it("401 without token on POST/PATCH/DELETE", async () => {
    const post = await request(app).post("/api/v1/categories").send({ name: "X", slug: "x" });
    const patch = await request(app).patch("/api/v1/categories/calculators").send({ name: "Y" });
    const del = await request(app).delete("/api/v1/categories/calculators");
    expect([post.status, patch.status, del.status]).toEqual([401, 401, 401]);
  });

  it("403 FORBIDDEN for authenticated non-admin", async () => {
    const member = await registerUser(app, "cat_member", memberEmail);
    const res = await request(app)
      .post("/api/v1/categories")
      .set(bearer(member.token))
      .send({ name: "X", slug: "x" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("501 NOT_IMPLEMENTED for the configured admin", async () => {
    const admin = await registerUser(app, "cat_admin", adminEmail);
    const post = await request(app)
      .post("/api/v1/categories")
      .set(bearer(admin.token))
      .send({ name: "X", slug: "x" });
    const patch = await request(app)
      .patch("/api/v1/categories/calculators")
      .set(bearer(admin.token))
      .send({ name: "Y" });
    const del = await request(app)
      .delete("/api/v1/categories/calculators")
      .set(bearer(admin.token));
    expect(post.status).toBe(501);
    expect(post.body.error.code).toBe("NOT_IMPLEMENTED");
    expect(patch.status).toBe(501);
    expect(del.status).toBe(501);
  });
});
