import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { TEST_PASSWORD, bearer, removeUser, uniqueEmail } from "../../test-utils.js";

const app = createApp();
const email = uniqueEmail("auth");

afterAll(async () => {
  await removeUser(email);
  await prisma.$disconnect();
});

describe("auth module", () => {
  it("rejects malformed register body with 400 VALIDATION_ERROR", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({ email: "bad" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("registers a user and returns token without passwordHash", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email, password: TEST_PASSWORD, name: "Auth Tester" });
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.id).toBeTruthy();
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain("passwordHash");
    expect(raw).not.toContain(TEST_PASSWORD);
  });

  it("rejects duplicate email with 409 EMAIL_TAKEN", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email, password: TEST_PASSWORD });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("rejects wrong password with generic 401", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "WrongPassword999!" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(res.body.error.message).toBe("Invalid credentials.");
  });

  it("rejects unknown email with the same generic 401", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: uniqueEmail("ghost"), password: TEST_PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid credentials.");
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe(email);
  });

  it("GET /auth/me resolves the token identity", async () => {
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: TEST_PASSWORD });
    const res = await request(app).get("/api/v1/auth/me").set(bearer(login.body.data.token));
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(email);
  });

  it("GET /auth/me rejects missing token", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("logout returns stateless ack", async () => {
    const res = await request(app).post("/api/v1/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.data.loggedOut).toBe(true);
  });
});
