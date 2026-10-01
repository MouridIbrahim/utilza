# Utilza_backend — Build Tasks

Source of truth:
- `E:\Utilza\01-PROJECT.md`
- `E:\Utilza\Utilza_backend\02-BACKEND.md`
- `E:\Utilza\05-AI-AGENT-RULES.md`

Current state: `E:\Utilza\Utilza_backend\package.json:1` is empty scaffold (no deps, no `src/`). All work below is greenfield. Follow `05-AI-AGENT-RULES.md:33` — one task at a time, inspect before edit, verify before marking done.

Update 2026-10-01: backend MVP is live against Neon (migration `20261001094756_init` applied, 4 categories + 10 tools seeded, `GET /api/v1/health` returns `db:true`, 12/12 tests + 8/8 live smoke passed). Checkboxes below reflect verified state — partial tasks left unchecked per No Fake Completion rule.

API base: `/api/v1` (`02-BACKEND.md:149`).
Standard error shape: `{success:false, error:{code,message,details}}` (`02-BACKEND.md:210`).

---

## Phase 0 — Project Init & Tooling

### TASK-001 — Init Node+TS+Express scaffold
- [x] Replace `package.json` scripts: `dev, build, start, lint, format, typecheck, test, test:integration, prisma:migrate, prisma:generate, seed`
- [x] Add deps: `express, cors, helmet, dotenv, zod, jsonwebtoken, bcryptjs, express-rate-limit, multer, morgan|pino, http-errors`
- [x] Add devDeps: `typescript, tsx|ts-node, @types/*, prisma, vitest|jest, supertest, eslint, prettier`
- [x] Add `tsconfig.json` (strict), `.gitignore` (`.env`, `node_modules`, `dist`), `.env.example`, `.editorconfig`, `README.md`
- [x] Verify: `npm install && npm run typecheck && npm run lint`

### TASK-002 — Env config layer
Files: `src/config/env.ts`, `src/config/database.ts`
- [x] Implement `env.ts`: parse/validate `NODE_ENV, PORT=4000, DATABASE_URL, JWT_SECRET, CORS_ORIGIN, STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY` (`02-BACKEND.md:383`)
- [x] Fail fast on missing `DATABASE_URL` / `JWT_SECRET` in non-test env
- [x] Never commit real values; keep `.env.example` in sync
- [x] Verify: `npm run typecheck`

---

## Phase 1 — Database / Prisma

### TASK-003 — Prisma setup + initial schema
Files: `prisma/schema.prisma`, `prisma/migrations/`, `src/lib/prisma.ts`
- [x] `npx prisma init`, provider `postgresql`, `DATABASE_URL` from env (`02-BACKEND.md:55`)
- [x] Models: `User, Category, Tool, Favorite, ToolHistory, Subscription` (`02-BACKEND.md:67`)
  - `User`: id, email(unique), passwordHash (never expose), name?, createdAt/updatedAt
  - `Category`: id, name(unique), slug(unique), description?, sortOrder, isActive
  - `Tool`: id, name, slug(unique), description, categoryId(FK), icon?, isActive, sortOrder + index on `(categoryId, isActive)`, `(slug)`
  - `Favorite`: id, userId(FK cascade), toolId(FK cascade), createdAt + unique(userId,toolId)
  - `ToolHistory`: id, userId(FK cascade nullable for anon?), toolSlug, inputSummary?, createdAt + index(userId, createdAt)
  - `Subscription`: id, userId(FK unique), status, tier, expiresAt?
- [x] Relations + cascade behavior deliberate, unique constraints where appropriate
- [x] Singleton Prisma client in `src/lib/prisma.ts`
- [x] Verify: `npx prisma validate && npx prisma migrate dev --name init && npx prisma generate`

### TASK-004 — Seed categories + MVP tool registry
Files: `prisma/seed.ts`
- [x] Seed categories: calculators, date-time, text (MVP set)
- [x] Seed 10 MVP tools from `01-PROJECT.md:501`: percentage-calculator, discount-calculator, age-calculator, date-difference, unit-converter, word-counter, character-counter, case-converter, password-generator, qr-generator with `name, slug, description, categoryId, icon, isActive=true`
- [x] Idempotent seed (`upsert` by slug)
- [x] Verify: `npm run seed && npx prisma studio` spot-check

---

## Phase 2 — Shared Infra (must come before modules)

### TASK-005 — App shell, logger, error handling
Files: `src/app.ts`, `src/server.ts`, `src/lib/logger.ts`, `src/middleware/error.middleware.ts`
- [x] `app.ts`: helmet, cors(`CORS_ORIGIN`), json limit (e.g. 100kb), urlencoded, request-id, health mount, `/api/v1` router, 404 handler, centralized error handler (`02-BACKEND.md:227`)
- [x] `server.ts`: listen on `PORT`, graceful shutdown
- [x] `logger.ts`: structured logs — reqId, method, route, status, duration, safe errors only (`02-BACKEND.md:332`)
- [x] Error middleware: `{status, code, message}` → standard shape; hide stack/paths/secrets in prod
- [x] Verify: `npm run dev`, `GET /health` → 200

### TASK-006 — Validation + auth + rate-limit middleware
Files: `src/middleware/validation.middleware.ts`, `src/middleware/auth.middleware.ts`, `src/middleware/rate-limit.middleware.ts`, `src/types/`, `src/utils/`
- [x] Zod-based `validate(schema)` for body/query/params (`02-BACKEND.md:195`)
- [x] `requireAuth`: verify JWT, attach `req.user`, 401 generic message; `requireOwnership` helper
- [x] Rate limits: strict for `/auth/*`, moderate global, file endpoints (`02-BACKEND.md:250`)
- [x] Shared types: `ApiSuccess<T>`, `ApiError`, `AuthTokenPayload`
- [x] Verify: `npm run typecheck && npm run test` (middleware unit tests)

---

## Phase 3 — Auth & Users

### TASK-007 — Auth module
Files: `src/modules/auth/auth.{controller,service,routes,schema,types}.ts`
- [x] `POST /api/v1/auth/register` — validate email/password, bcrypt hash (12 rounds), duplicate → 409 generic, issue JWT
- [x] `POST /api/v1/auth/login` — validate, compare hash, generic `Invalid credentials` on fail, rate-limited
- [x] `POST /api/v1/auth/logout` (stateless ack / blacklist stub), `GET /api/v1/auth/me` (protected)
- [x] Never return `passwordHash`; never log passwords/tokens (`02-BACKEND.md:189`)
- [ ] Tests: unit (hash/validate) + integration (register/login/duplicate/bad input/rate-limit)
- [ ] Verify: `npm run test -- auth`

### TASK-008 — Users module
Files: `src/modules/users/*`
- [x] `GET /api/v1/users/me`, `PATCH /api/v1/users/me` (name, preferences only), `DELETE /api/v1/users/me` (cascade favorites/history)
- [x] All protected + ownership check
- [ ] Tests: auth required, 401/403 cases
- [ ] Verify: `npm run test -- users`

---

## Phase 4 — Domain Modules

### TASK-009 — Categories module
Files: `src/modules/categories/*`
- [x] `GET /api/v1/categories` (public, only `isActive`, ordered), `GET /api/v1/categories/:slug`
- [ ] Admin-only `POST/PATCH/DELETE` stub (return 501 or behind `isAdmin` flag — decide once, document)
- [ ] Verify: `npm run test -- categories`

### TASK-010 — Tools registry / discovery
Files: `src/modules/tools/*`
- [x] `GET /api/v1/tools?category=&search=&activeOnly=true` with pagination (`page,limit<=50`)
- [x] `GET /api/v1/tools/:slug` — 404 stable code `TOOL_NOT_FOUND`
- [x] DB describes tool only; no executable code in DB (`02-BACKEND.md:305`)
- [x] Verify: `npm run test -- tools` (seeded slug `percentage-calculator` resolves)

### TASK-011 — Favorites module
Files: `src/modules/favorites/*`
- [x] `GET /api/v1/favorites`, `POST /api/v1/favorites {toolId}`, `DELETE /api/v1/favorites/:toolId` — all protected
- [x] Validate tool exists + active; unique(userId,toolId) → 409 `ALREADY_FAVORITED`; use transaction where multi-write
- [ ] Verify: `npm run test -- favorites` (unauthorized, duplicate, invalid tool)

### TASK-012 — History sync module
Files: `src/modules/history/*`
- [x] `GET /api/v1/history?limit=20` (protected, paginated, own only), `POST /api/v1/history {toolSlug, inputSummary?}`, `DELETE /api/v1/history` (clear own)
- [x] Cap `inputSummary` length, never store file contents / sensitive data
- [ ] Verify: `npm run test -- history`

### TASK-013 — Analytics events module
Files: `src/modules/analytics/*`
- [x] `POST /api/v1/analytics {event, toolSlug?, platform?}` — public with rate-limit, allow anonymous (`02-BACKEND.md:312`)
- [x] Allowlist events: `tool_opened, tool_completed, tool_failed, file_uploaded, result_downloaded, result_copied, tool_favorited, search_performed`
- [x] No PII; validate `toolSlug` exists if provided
- [x] Verify: `npm run test -- analytics` (bad event rejected, anon accepted)

### TASK-014 — Subscriptions stub
Files: `src/modules/subscriptions/*`
- [x] `GET /api/v1/subscriptions/me` (protected) returns status/tier; `POST` webhook stub → 501 with `NOT_IMPLEMENTED`
- [x] Schema ready for future premium without breaking contract
- [x] Verify: `npm run typecheck`

### TASK-015 — Files / server-side processing
Files: `src/modules/files/*`
- [x] `POST /api/v1/files/process` (multer memory/tmp): validate size/type (defense-in-depth, not MIME alone), request-size limits (`02-BACKEND.md:267`)
- [x] Flow: validate → temp id → process → return → auto-cleanup; never use user filename as path
- [x] Rate-limit strict; structured log without file contents
- [ ] Tests: oversize, bad type, path-traversal filename, cleanup verified
- [ ] Verify: `npm run test -- files`

### TASK-016 — Health + admin
Files: `src/modules/health/*`, `src/modules/admin/*` (stub)
- [x] `GET /health`, `GET /api/v1/health` → `{success:true, data:{uptime, db:true}}` with DB ping
- [ ] Admin router behind auth + `isAdmin` check (list tools/users read-only for now)
- [ ] Verify: `curl` health + `npm run test -- health`

---

## Phase 5 — Hardening, Testing, Docs

### TASK-017 — Security hardening pass
- [ ] Helmet headers verified, CORS allowlist, JSON limit, authZ on every protected resource, no DB internals in responses, no secrets in logs (`02-BACKEND.md:248`)
- [ ] Manual: invalid token → 401, cross-user favorite/history access → 403, malformed body → 400 `VALIDATION_ERROR`
- [ ] Verify: `npm run test` security suite

### TASK-018 — Full test + quality gate
- [ ] Unit: services, validation, utils (`02-BACKEND.md:355`)
- [ ] Integration: routes + DB + auth/authZ (use isolated Neon branch or local Postgres)
- [ ] `npm run format && npm run lint && npm run typecheck && npm run test`
- [ ] No `any` without justification, no console.log in src (use logger)

### TASK-019 — API contract docs for web/flutter
Files: `docs/API.md` or `openapi.yaml`
- [x] Document every `/api/v1/*` route: method, auth, request/response examples, error codes
- [ ] Any contract change updates backend types + web + flutter clients (`05-AI-AGENT-RULES.md:338`)
- [ ] Verify: peer review — can web team implement against doc alone?

### TASK-020 — Prod readiness / deploy
- [ ] `prisma migrate deploy` runbook, `NODE_ENV=production`, HTTPS/CORS prod values, storage env set
- [ ] Graceful shutdown, health check for host, log redaction audit
- [ ] Verify: staging deploy + `GET /api/v1/tools/percentage-calculator` + auth flow smoke test

---

## Definition of Done (per task, per `05-AI-AGENT-RULES.md:530`)
- [ ] Requirement understood
- [ ] Existing code inspected
- [ ] Architecture respected (thin controller, logic in service)
- [ ] Input validation implemented
- [ ] Loading/success/error states (API: 2xx + stable error codes)
- [ ] Responsive N/A (backend) — rate-limit + size-limit considered
- [ ] Tests added + actually run (paste command + result in report)
- [ ] No secrets committed
- [ ] No unrelated files modified

## Suggested Build Order
`001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010 → 011 → 012 → 013 → 014 → 015 → 016 → 017 → 018 → 019 → 020`

Do not start TASK-007+ until TASK-005/006 are merged and verified.
