import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { bearer, registerUser, removeUser } from "../../test-utils.js";

const app = createApp();

let user: Awaited<ReturnType<typeof registerUser>>;

afterAll(async () => {
  if (user) await removeUser(user.email);
  await prisma.$disconnect();
});

describe("users module", () => {
  it("401 on /users/me without token", async () => {
    const res = await request(app).get("/api/v1/users/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns the current user", async () => {
    user = await registerUser(app, "user");
    const res = await request(app).get("/api/v1/users/me").set(bearer(user.token));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(user.id);
    expect(res.body.data.email).toBe(user.email);
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("updates name via PATCH", async () => {
    const res = await request(app)
      .patch("/api/v1/users/me")
      .set(bearer(user.token))
      .send({ name: "Updated Name" });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Name");
  });

  it("rejects empty name with 400", async () => {
    const res = await request(app)
      .patch("/api/v1/users/me")
      .set(bearer(user.token))
      .send({ name: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("deletes the account and invalidates subsequent access", async () => {
    const del = await request(app).delete("/api/v1/users/me").set(bearer(user.token));
    expect(del.status).toBe(200);
    expect(del.body.data.deleted).toBe(true);

    // Token is still cryptographically valid, but the user row is gone.
    const res = await request(app).get("/api/v1/users/me").set(bearer(user.token));
    expect(res.status).toBe(401);
  });
});
