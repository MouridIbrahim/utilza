import { Prisma } from "@prisma/client";

// Prisma unique-constraint violation (P2002). Used to convert check-then-write
// races into stable 409 responses instead of 500s.
export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}
