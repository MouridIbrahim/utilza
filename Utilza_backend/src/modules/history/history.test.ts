import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { bearer, registerUser, removeUser } from "../../test-utils.js";

const app = createApp();

let alice: Awaited<ReturnType<typeof registerUser>>;
let bob: Awaited<ReturnType<typeof registerUser>>;

afterAll(async () => {
  if (alice) await removeUser(alice.email);
  if (bob) await removeUser(bob.email);
  await prisma.$disconnect();
});

describe("history module", () => {
  it("401 without token on GET/POST/DELETE", async () => {
    const get = await request(app).get("/api/v1/history");
    const post = await request(app).post("/api/v1/history").send({ toolSlug: "word-counter" });
    const del = await request(app).delete("/api/v1/history");
    expect([get.status, post.status, del.status]).toEqual([401, 401, 401]);
  });

  it("records an entry for the signed-in user", async () => {
    alice = await registerUser(app, "hist_a");
    bob = await registerUser(app, "hist_b");

    const res = await request(app)
      .post("/api/v1/history")
      .set(bearer(alice.token))
      .send({ toolSlug: "word-counter", inputSummary: "150 chars" });
    expect(res.status).toBe(201);
    expect(res.body.data.toolSlug).toBe("word-counter");
    expect(res.body.data.userId).toBe(alice.id);
  });

  it("caps inputSummary at 500 chars", async () => {
    const res = await request(app)
      .post("/api/v1/history")
      .set(bearer(alice.token))
      .send({ toolSlug: "word-counter", inputSummary: "x".repeat(501) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("lists only the caller's entries, newest first", async () => {
    const res = await request(app).get("/api/v1/history").set(bearer(alice.token));
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    expect(res.body.data.items[0].toolSlug).toBe("word-counter");
    expect(
      (res.body.data.items as Array<{ userId: string }>).every((i) => i.userId === alice.id),
    ).toBe(true);
  });

  it("isolates history per user (Bob has none of Alice's)", async () => {
    const res = await request(app).get("/api/v1/history").set(bearer(bob.token));
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
  });

  it("clears the caller's history only", async () => {
    const del = await request(app).delete("/api/v1/history").set(bearer(bob.token));
    expect(del.status).toBe(200);

    const aliceList = await request(app).get("/api/v1/history").set(bearer(alice.token));
    expect(aliceList.body.data.total).toBeGreaterThanOrEqual(1);

    const clearAlice = await request(app).delete("/api/v1/history").set(bearer(alice.token));
    expect(clearAlice.status).toBe(200);

    const after = await request(app).get("/api/v1/history").set(bearer(alice.token));
    expect(after.body.data.total).toBe(0);
  });
});
