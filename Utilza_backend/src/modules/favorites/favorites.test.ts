import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { bearer, registerUser, removeUser } from "../../test-utils.js";

const app = createApp();

let alice: Awaited<ReturnType<typeof registerUser>>;
let bob: Awaited<ReturnType<typeof registerUser>>;
let toolId: string;

afterAll(async () => {
  if (alice) await removeUser(alice.email);
  if (bob) await removeUser(bob.email);
  await prisma.$disconnect();
});

describe("favorites module", () => {
  it("401 without token", async () => {
    const get = await request(app).get("/api/v1/favorites");
    const post = await request(app).post("/api/v1/favorites").send({ toolId: "x" });
    expect(get.status).toBe(401);
    expect(post.status).toBe(401);
  });

  it("starts empty for a new user", async () => {
    alice = await registerUser(app, "fav_a");
    bob = await registerUser(app, "fav_b");
    const res = await request(app).get("/api/v1/favorites").set(bearer(alice.token));
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
  });

  it("adds a favorite for an existing active tool", async () => {
    const tool = await request(app).get("/api/v1/tools/percentage-calculator");
    toolId = tool.body.data.id as string;

    const res = await request(app)
      .post("/api/v1/favorites")
      .set(bearer(alice.token))
      .send({ toolId });
    expect(res.status).toBe(201);
    expect(res.body.data.toolId).toBe(toolId);
    expect(res.body.data.userId).toBe(alice.id);
  });

  it("409 ALREADY_FAVORITED on duplicate", async () => {
    const res = await request(app)
      .post("/api/v1/favorites")
      .set(bearer(alice.token))
      .send({ toolId });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ALREADY_FAVORITED");
  });

  it("404 TOOL_NOT_FOUND for unknown toolId", async () => {
    const res = await request(app)
      .post("/api/v1/favorites")
      .set(bearer(alice.token))
      .send({ toolId: "does-not-exist" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("TOOL_NOT_FOUND");
  });

  it("isolates favorites per user (Bob sees none of Alice's)", async () => {
    const res = await request(app).get("/api/v1/favorites").set(bearer(bob.token));
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
  });

  it("Bob's delete cannot remove Alice's favorite", async () => {
    const del = await request(app).delete(`/api/v1/favorites/${toolId}`).set(bearer(bob.token));
    expect(del.status).toBe(200); // idempotent, scoped to Bob → 0 rows

    const aliceList = await request(app).get("/api/v1/favorites").set(bearer(alice.token));
    expect(aliceList.body.data.items).toHaveLength(1);
  });

  it("Alice deletes her own favorite", async () => {
    const del = await request(app).delete(`/api/v1/favorites/${toolId}`).set(bearer(alice.token));
    expect(del.status).toBe(200);

    const list = await request(app).get("/api/v1/favorites").set(bearer(alice.token));
    expect(list.body.data.items).toHaveLength(0);
  });
});
