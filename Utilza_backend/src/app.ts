import cors from "cors";
import express from "express";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import { env } from "./config/env.js";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware.js";
import { globalLimiter } from "./middleware/rate-limit.middleware.js";
import { requestLogMiddleware } from "./middleware/request-log.middleware.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { jobsRouter } from "./modules/jobs/jobs.routes.js";
import { analyticsRouter } from "./modules/analytics/analytics.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { categoriesRouter } from "./modules/categories/categories.routes.js";
import { favoritesRouter } from "./modules/favorites/favorites.routes.js";
import { filesRouter } from "./modules/files/files.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { historyRouter } from "./modules/history/history.routes.js";
import { subscriptionsRouter } from "./modules/subscriptions/subscriptions.routes.js";
import { toolsRouter } from "./modules/tools/tools.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(",").map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(globalLimiter);
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));

  app.use((req, _res, next) => {
    (req as typeof req & { id?: string }).id = randomUUID();
    next();
  });
  app.use(requestLogMiddleware);

  app.get("/health", (_req, res) => {
    res.json({ success: true, data: { status: "ok", uptime: process.uptime() } });
  });

  const v1 = express.Router();
  v1.use("/health", healthRouter);
  v1.use("/auth", authRouter);
  v1.use("/users", usersRouter);
  v1.use("/categories", categoriesRouter);
  v1.use("/tools", toolsRouter);
  v1.use("/favorites", favoritesRouter);
  v1.use("/history", historyRouter);
  v1.use("/analytics", analyticsRouter);
  v1.use("/subscriptions", subscriptionsRouter);
  v1.use("/files", filesRouter);
  v1.use("/admin", adminRouter);
  v1.use("/jobs", jobsRouter);

  app.use("/api/v1", v1);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
