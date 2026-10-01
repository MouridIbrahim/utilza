import { Router } from "express";
import { authLimiter } from "../../middleware/rate-limit.middleware.js";
import { requireAuth, type AuthRequest } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import { asyncHandler, sendSuccess } from "../../utils/handler.js";
import { getMe, login, loginSchema, register, registerSchema } from "./auth.service.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  authLimiter,
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const result = await register(req.body);
    sendSuccess(res, result, 201);
  }),
);

authRouter.post(
  "/login",
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const result = await login(req.body);
    sendSuccess(res, result);
  }),
);

authRouter.post("/logout", (_req, res) => {
  // Stateless JWT: client discards token. Stub for future refresh-token revocation.
  sendSuccess(res, { loggedOut: true });
});

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const me = await getMe(req.user!.id);
    sendSuccess(res, me);
  }),
);
