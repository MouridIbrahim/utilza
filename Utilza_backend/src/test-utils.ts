import type { Express } from "express";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { prisma } from "./lib/prisma.js";

export const TEST_PASSWORD = "TestPass123!";

export function uniqueEmail(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 12)}@example.com`;
}

export interface TestUser {
  id: string;
  email: string;
  token: string;
}

// Registers a disposable user against the live DB; caller must removeUser()
// in afterAll (cascade removes favorites/history/subscription rows).
export async function registerUser(
  app: Express,
  prefix: string,
  email: string = uniqueEmail(prefix),
): Promise<TestUser> {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({ email, password: TEST_PASSWORD });
  if (res.status !== 201) {
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { id: res.body.data.user.id as string, email, token: res.body.data.token as string };
}

export async function removeUser(email: string): Promise<void> {
  await prisma.user.deleteMany({ where: { email } });
}

export function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
