import { env } from "./env.js";

export const dbConfig = {
  url: env.DATABASE_URL,
} as const;
