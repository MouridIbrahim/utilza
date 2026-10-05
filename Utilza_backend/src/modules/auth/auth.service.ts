import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { signToken } from "../../middleware/auth.middleware.js";
import { conflict, unauthorized } from "../../utils/errors.js";
import { isUniqueViolation } from "../../utils/prisma-errors.js";

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

function toPublicUser(u: { id: string; email: string; name: string | null }) {
  return { id: u.id, email: u.email, name: u.name };
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict("An account with this email already exists.", "EMAIL_TAKEN");
  const passwordHash = await bcrypt.hash(input.password, 12);
  let user;
  try {
    user = await prisma.user.create({
      data: { email: input.email, passwordHash, name: input.name ?? null },
    });
  } catch (err) {
    // Concurrent registration race on unique(email) → stable 409.
    if (isUniqueViolation(err))
      throw conflict("An account with this email already exists.", "EMAIL_TAKEN");
    throw err;
  }
  const token = signToken(user.id, user.email);
  return { user: toPublicUser(user), token };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw unauthorized("Invalid credentials.");
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw unauthorized("Invalid credentials.");
  const token = signToken(user.id, user.email);
  return { user: toPublicUser(user), token };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthorized("Unauthorized.");
  return toPublicUser(user);
}
