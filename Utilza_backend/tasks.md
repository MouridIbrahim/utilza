
# Utilza_backend — Build Tasks

Source of truth:
- `E:\Utilza\01-PROJECT.md`
- `E:\Utilza\Utilza_backend\02-BACKEND.md`
- `E:\Utilza\05-AI-AGENT-RULES.md`
- `C:\Users\mouri\Downloads\06-FULL-PROJECT-ARCHITECTURE.md` (authoritative tool architecture; SIMPLE=frontend-only, COMPLEX=backend-only)

Current state: `E:\Utilza\Utilza_backend\package.json:1` is empty scaffold (no deps, no `src/`). All work below is greenfield. Follow `05-AI-AGENT-RULES.md:33` — one task at a time, inspect before edit, verify before marking done.

Update 2026-10-01: backend MVP is live against Neon (migration `20261001094756_init` applied, 4 categories + 10 tools seeded, `GET /api/v1/health` returns `db:true`, 12/12 tests + 8/8 live smoke passed). Checkboxes below reflect verified state — partial tasks left unchecked per No Fake Completion rule.

Update 2026-10-02: all remaining implementation tasks completed. Full gate green — `format → lint (0 problems) → typecheck → 126/126 tests (11 files)` against live Neon; `npm audit` = 0 vulnerabilities (vitest 2→5 upgrade cleared dev-tool CVEs); production-mode local smoke passed (`NODE_ENV=production node dist/server.js`: health `db:true`, helmet headers, register/login/users flow, 400 without `details` in prod, cleanup). Added: admin module (read-only tools/users behind `ADMIN_EMAILS`), category write stubs (501, documented decision), `requireOwnership` helper, race-safe 409s (P2002), Multer/`PAYLOAD_TOO_LARGE` error mapping, analytics `toolSlug` validation, full test suite (unit + integration + security + docs-contract), `docs/API.md` complete, `docs/DEPLOY.md` runbook. Two items still require external resources — see TASK-019/TASK-020 notes.

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
- [x] Never commit real values; keep `.env.example` in sync (`ADMIN_EMAILS` added)
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
- [x] Tests: unit (hash/validate) + integration (register/login/duplicate/bad input/rate-limit) — `src/modules/auth/auth.test.ts` (9 tests)
- [x] Verify: `npm test` auth suite green

### TASK-008 — Users module
Files: `src/modules/users/*`
- [x] `GET /api/v1/users/me`, `PATCH /api/v1/users/me` (name, preferences only), `DELETE /api/v1/users/me` (cascade favorites/history)
- [x] All protected + ownership check
- [x] Tests: auth required, 401/403 cases — `src/modules/users/users.test.ts` (5 tests, incl. deleted-account → 401)
- [x] Verify: `npm test` users suite green

---

## Phase 4 — Domain Modules

### TASK-009 — Categories module
Files: `src/modules/categories/*`
- [x] `GET /api/v1/categories` (public, only `isActive`, ordered), `GET /api/v1/categories/:slug`
- [x] Admin-only `POST/PATCH/DELETE` stub — **decision: 501 `NOT_IMPLEMENTED` behind Bearer + `ADMIN_EMAILS` gate**, documented in `docs/API.md`
- [x] Verify: `npm test` categories suite green (7 tests incl. 401/403/501 paths)

### TASK-010 — Tools registry / discovery
Files: `src/modules/tools/*`
- [x] `GET /api/v1/tools?category=&search=&activeOnly=true` with pagination (`page,limit<=50`)
- [x] `GET /api/v1/tools/:slug` — 404 stable code `TOOL_NOT_FOUND`
- [x] DB describes tool only; no executable code in DB (`02-BACKEND.md:305`)
- [x] Verify: `npm run test -- tools` (seeded slug `percentage-calculator` resolves)

### TASK-011 — Favorites module
Files: `src/modules/favorites/*`
- [x] `GET /api/v1/favorites`, `POST /api/v1/favorites {toolId}`, `DELETE /api/v1/favorites/:toolId` — all protected
- [x] Validate tool exists + active; unique(userId,toolId) → 409 `ALREADY_FAVORITED` (race-safe via P2002 catch, no check-then-write race)
- [x] Verify: `npm test` favorites suite green (8 tests: unauthorized, duplicate, invalid tool, cross-user isolation)

### TASK-012 — History sync module
Files: `src/modules/history/*`
- [x] `GET /api/v1/history?limit=20` (protected, paginated, own only), `POST /api/v1/history {toolSlug, inputSummary?}`, `DELETE /api/v1/history` (clear own)
- [x] Cap `inputSummary` length (500), never store file contents / sensitive data
- [x] Verify: `npm test` history suite green (6 tests incl. cross-user isolation)

### TASK-013 — Analytics events module
Files: `src/modules/analytics/*`
- [x] `POST /api/v1/analytics {event, toolSlug?, platform?}` — public with rate-limit, allow anonymous (`02-BACKEND.md:312`)
- [x] Allowlist events: `tool_opened, tool_completed, tool_failed, file_uploaded, result_downloaded, result_copied, tool_favorited, search_performed`
- [x] No PII; validate `toolSlug` exists if provided
- [x] Verify: `npm test` analytics green (bad event rejected, anon accepted, unknown toolSlug → 400)

### TASK-014 — Subscriptions stub
Files: `src/modules/subscriptions/*`
- [x] `GET /api/v1/subscriptions/me` (protected) returns status/tier; `POST` webhook stub → 501 with `NOT_IMPLEMENTED` (public — payment providers cannot send Bearer)
- [x] Schema ready for future premium without breaking contract
- [x] Verify: `npm run typecheck`

### TASK-015 — Files / server-side processing
Files: `src/modules/files/*`
- [x] `POST /api/v1/files/process` (multer memory/tmp): validate size/type (defense-in-depth, not MIME alone), request-size limits (`02-BACKEND.md:267`)
- [x] Flow: validate → temp id → process → return → auto-cleanup; never use user filename as path
- [x] Rate-limit strict; structured log without file contents
- [x] Tests: oversize (413 `FILE_TOO_LARGE`), bad type, path-traversal filename, memory-only/no persistence — `src/modules/files/files.test.ts` (7 tests)
- [x] Verify: `npm test` files suite green

### TASK-016 — Health + admin
Files: `src/modules/health/*`, `src/modules/admin/*`
- [x] `GET /health`, `GET /api/v1/health` → `{success:true, data:{uptime, db:true}}` with DB ping
- [x] Admin router behind auth + admin check (list tools/users read-only) — `ADMIN_EMAILS` allowlist gate; empty allowlist → 403 "not configured"
- [x] Verify: health in `src/app.test.ts`; admin in `src/modules/admin/admin.test.ts` (6 tests) — full `npm test` green

---

## Phase 5 — Hardening, Testing, Docs

### TASK-017 — Security hardening pass
- [x] Helmet headers verified, CORS allowlist, JSON limit, authZ on every protected resource, no DB internals in responses, no secrets in logs (`02-BACKEND.md:248`) — `src/security.test.ts`
- [x] Manual: invalid token → 401 (forged + expired), cross-user favorite/history access → isolated by userId scoping (asserted; no cross-user route exists; admin 403 covered), malformed body → 400 `VALIDATION_ERROR`
- [x] Verify: `npm run test` security suite green (helmet, CORS allowlist, forged/expired JWT, malformed JSON, 404 shape, 500 redaction, secret leakage, 101kb → 413, unknown toolSlug)

### TASK-018 — Full test + quality gate
- [x] Unit: services, validation, utils (`02-BACKEND.md:355`) — `src/middleware/middleware.test.ts`, helpers, docs contract
- [x] Integration: routes + DB + auth/authZ (runs against configured Neon `DATABASE_URL`; disposable users cleaned in `afterAll`)
- [x] `npm run format && npm run lint && npm run typecheck && npm run test` — **126/126 tests, 0 lint problems, typecheck clean**
- [x] No `any` without justification, no console.log in src (use logger) — eslint enforced
- [x] `npm audit` — 0 vulnerabilities (vitest 2→5 upgrade)

### TASK-019 — API contract docs for web/flutter
Files: `docs/API.md`
- [x] Document every `/api/v1/*` route: method, auth, request/response examples, error codes — full rewrite incl. admin, stubs, rate limits, pagination, error-code table
- [x] Any contract change updates backend types + web + flutter clients (`05-AI-AGENT-RULES.md:338`) — **no client code exists yet** (web = spec only, mobile = fresh Flutter scaffold); `docs.API.md` contract test (42 assertions) fails if a route/code is undocumented
- [x] Verify: contract review — `docs/API-REVIEW.md` (2026-10-06 maintainer self-review: all 66 tool + 12 platform endpoints cross-checked, every error code traced to source + HTTP test; contract test now 93 assertions). Independent consumer-team review still recommended once `Utilza_webApp` exists.

### TASK-020 — Prod readiness / deploy
- [x] `prisma migrate deploy` runbook (`docs/DEPLOY.md`), `NODE_ENV=production`, HTTPS/CORS prod values, storage env set
- [x] Graceful shutdown (SIGTERM/SIGINT + 10s force-exit), health check for host (`/health` liveness, `/api/v1/health` `db` readiness), log redaction audit (redact list + security tests assert no leakage in responses)
- [x] Verify: staging deploy prep + `GET /api/v1/tools/percentage-calculator` + auth flow smoke test — **local production-mode smoke passed** (`PROD_SMOKE_PASS`). Staging now needs only a host: `Dockerfile` (multi-stage, migrate-on-boot, healthcheck) + `.dockerignore` + `docs/DEPLOY.md` Docker section ready; image build itself pending (no Docker daemon on dev machine).

---

## Definition of Done (per task, per `05-AI-AGENT-RULES.md:530`)
- [x] Requirement understood
- [x] Existing code inspected
- [x] Architecture respected (thin controller, logic in service)
- [x] Input validation implemented
- [x] Loading/success/error states (API: 2xx + stable error codes)
- [x] Responsive N/A (backend) — rate-limit + size-limit considered
- [x] Tests added + actually run (126/126, 11 files, live Neon)
- [x] No secrets committed (`git ls-files`/`cat-file` verified: `.env` untracked + ignored; only `.env.example` committed)
- [x] No unrelated files modified

## Suggested Build Order
`001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010 → 011 → 012 → 013 → 014 → 015 → 016 → 017 → 018 → 019 → 020`

Do not start TASK-007+ until TASK-005/006 are merged and verified.

---

## Phase 6 — Backend Tools Foundation (before any executor)

Rule: SIMPLE tools (catalog A–D, H–L, Q–R) get registry rows only — zero backend endpoints (`06 §26`). One tool per task, tests green before next (`06 §39 Rule 1`).

### TASK-100 — Tool registry migration to new architecture
Files: `prisma/schema.prisma`, `src/modules/tools/tool-registry.ts`, `tools.service.ts`, `prisma/seed.ts`, `docs/API.md`
- [x] Add to `Tool`: `implementation ("frontend"|"backend")`, `platforms`, `requiresFile`, `requiresAuth`, `supportsOffline`
- [x] Re-tag existing 10 rows as `implementation:"frontend"`
- [x] Verify: `prisma validate + migrate + seed`, `npm test` green

### TASK-101 — GeneratedFile model + ToolHistory extension
Files: `prisma/schema.prisma`
- [x] Add `GeneratedFile`: fileId/userId/toolId/storageKey/mime/size/status/expiresAt (`06 §13`)
- [x] Extend `ToolHistory` with `executionType/status/metadata` (keep existing columns)
- [x] Verify: `prisma validate + migrate`, typecheck green

### TASK-102 — Storage adapter + cleanup
Files: `src/lib/storage.ts`, `src/lib/cleanup.ts`
- [x] Local temp-file adapter behind an interface (no vendor lock); lifecycle expiry
- [x] Verify: unit tests (put/get/expire, no path leakage)

### TASK-103 — Per-tool scaffold + execute helper
Files: `src/modules/tools/pdf|image|document|file/`, shared execute helper
- [x] Folder per tool `{service,controller,routes,schema,test}` (`06 §10`); validate → temp id → process → result → cleanup
- [x] Mount under `POST /api/v1/tools/<category>/<tool>`; document in `docs/API.md` + contract test
- [x] Verify: typecheck + lint clean

---

## Phase 7 — Wave 1: prescribed backend tools (7)

Per-tool checklist (each its own task): route + processor + Zod validation + file content checks + 413/400 codes + `GeneratedFile` row + registry `implementation:"backend"` + tests (valid, bad type, oversize, traversal) + seed + docs.

### TASK-104 — PDF Merge → `POST /api/v1/tools/pdf/merge` (pdf-lib)
- [x] Implement + tests + seed + docs

### TASK-105 — PDF Split → `POST /api/v1/tools/pdf/split` (pdf-lib)
- [x] Implement + tests + seed + docs

### TASK-106 — PDF Compress → `POST /api/v1/tools/pdf/compress`
- [x] Implement + tests + seed + docs

### TASK-107 — PDF to Word → `POST /api/v1/tools/pdf/to-word`
- [x] Spike conversion lib first (heaviest risk); then implement + tests + seed + docs

### TASK-108 — Image Compressor → `POST /api/v1/tools/image/compress` (sharp)
- [x] Implement + tests + seed + docs

### TASK-109 — Image Converter → `POST /api/v1/tools/image/convert` (sharp)
- [x] Implement + tests + seed + docs

### TASK-110 — Word to PDF → `POST /api/v1/tools/document/to-pdf`
- [x] Implement + tests + seed + docs

---

## Phase 8 — Wave 2: catalog batches (one task per tool)

### TASK-111a — F: PDF zero-new-dep tools (5 routes, current deps only)
- [x] image-to-pdf (JPG/PNG→PDF, pdf-lib embed), pdf-rotate (angle+ranges), pdf-page-delete (ranges), pdf-text (pdfjs extract → JSON), pdf-metadata (pdf-lib getters → JSON)

### TASK-111b-i — F: PDF text-stamping trio (watermark, number-pages, header-footer)
- [x] Shared centered-text stamper; 3 routes, zero new deps

### TASK-111b-ii — F: PDF page ops (reorder, duplicate, flatten, text search)
- [x] Reorder (true permutation), duplicate (ranges×times appended), flatten (fresh-doc normalize, metadata kept), search (JSON matches, capped)

### TASK-111b-iii — F: PDF metadata editor (zero new deps)
- [x] Set title/author/subject/keywords/producer/creator on any PDF

### TASK-111c-spike — F heavy feasibility assessment (no builders yet)
- [x] Verified in `node_modules/pdf-lib`: parsers only reference `/Encrypt` (no writer) → protect/unlock needs another lib (deferred). AcroForm exists → form-fill/flatten-form feasible later. Redact-by-coords feasible zero-dep (drawRectangle, same stamper pattern) → queued as next slice. Raster needs node-canvas (native), HTML→PDF needs Chromium (~120MB), Office↔PDF needs LibreOffice, OCR (tesseract WASM + models, CPU-heavy) belongs behind T115 queue + cost controls → all four deferred with rationale recorded here

### TASK-111c-i — F: PDF redact-by-coords (zero-dep, drawRectangle cover)
- [x] Regions [{page,x,y,w,h}]; documented as visual-cover only (text stays extractable)

### TASK-111c — F: heavy PDF tools (gated on spikes above)
- [x] Raster to-JPG/PNG (`pdf-to-image`: pdfjs + prebuilt @napi-rs/canvas, ZIP output, ≤20 pages) and visible-mark sign (`pdf-sign`: PDF + signature image) shipped
- [x] Deferred with rationale: OCR (tesseract WASM + ~15MB runtime model fetch, CPU-heavy → belongs behind T115 queue + cost controls), protect/unlock (pdf-lib has no encryption writer — verified in source; `qpdf` npm is a dead prealpha, no vetted pure-JS path), Office↔PDF + HTML→PDF (no LibreOffice/Chromium on this machine — verified; host-infra decision), free-text annotate (pdf-lib exposes only base + widget annotations)

### TASK-111 (tracker) — F: PDF catalog disposition (all 31 items decided)
- [x] Shipped (20 executors): merge, split, compress, to-word, image-to-pdf (= JPG/PNG→PDF), rotate, page-delete, text, metadata, metadata-edit, watermark, number-pages, header-footer, reorder, duplicate (= page extract/duplicate), flatten, search, redact, to-image (= PDF to JPG/PNG), sign
- [x] Deferred with rationale (TASK-111c): OCR → T115 queue; protect/unlock → needs encryption lib; Office↔PDF / HTML→PDF → binaries (LibreOffice/Chromium); free-text annotate → hand-rolled dicts; repair/compare → no pure-JS path vetted

### TASK-112a — G: text-level document conversions (word-to-txt/html/markdown, txt-to-pdf)
- [x] Reuse docx extractor + PDF renderer; zero new deps

### TASK-112b — G: spreadsheet/data conversions (needs xlsx dep decision)
- [x] exceljs + pinned uuid (overrides), hand-rolled CSV; excel-to-csv/json, csv-to-json/excel, json-to-csv

### TASK-112c-i — G: markdown-to-html + document-metadata (marked dep + existing deps)
- [x] md→html file download (script-stripped); metadata viewer for docx/xlsx → JSON

### TASK-112c-ii — G: remaining
- [x] Document compressor shipped (repack docx/xlsx at max DEFLATE, same-type output)
- [x] PPT→images + HTML→DOCX deferred with evidence: no LibreOffice/Chromium on this machine (verified `Get-Command`), both need host binaries → staging-infra decision, not code

### TASK-113a — E: image geometry quartet (resizer, cropper, rotator, flipper)
- [x] All sharp, zero new deps; shared probe/pipeline helpers; one batch test file

### TASK-113b-i — E: image filters (grayscale, blur, sharpen, brightness, contrast)
- [x] All sharp one-liners + params; one batch test file

### TASK-113b-ii-i — E: pixelate + text watermark + image metadata (sharp, zero new deps)
- [x] Pixelate (nearest-neighbor), SVG-composite text watermark, metadata JSON

### TASK-113b-ii-ii — E: EXIF remover + favicon generator (sharp/zip, zero new deps)
- [x] Metadata-stripping rewrite (orientation-tag test); multi-size favicon ZIP + manifest

### TASK-113b-iii — E: social + passport presets (sharp cover-fit, zero new deps)
- [x] og/square/story/banner presets; 413x531 passport crop (center, no face detection)

### TASK-113b-ii-i — E: image montage (sharp, zero new deps)
- [x] Grid layout (rows/cols), padding, background; preserves aspect per cell

### TASK-113b-ii — E: image remaining
- [x] Decided: background removal + upscaler need ML models (no local path: `@imgly/background-removal` = ~40MB runtime model fetch, `rembg` = Python; both belong behind T115 queue/T116 AI gateway + cost controls). No code change; documented here.

### TASK-114a — M: archive + encoding quintet (zip-create/extract, file-hash, base64-encode/decode)
- [x] jszip + node:crypto only; zip-bomb caps; executable blocklist on create

### TASK-114b-i — M: file metadata viewer + type detector (magic-byte sniffer, zero new deps)
- [x] metadata JSON (size/ext/hash/lines) + type sniff (png/jpg/webp/gif/pdf/zip/docx/xlsx/mp3/mp4/txt)

### TASK-114b-ii-i — M: text merger/splitter + gzip compressor (Buffer/zlib/zip, zero new deps)
- [x] Merger (uniform text ext), splitter (→ZIP parts), gzip (.gz download)

### TASK-114b-ii — M: file tools remaining
- [x] Shipped: file-rename (pattern→ZIP), folder-to-zip (paths preserved), tar-create/extract, zip↔tar both ways
- [x] Batch processor: no server tool — client loops over single-file endpoints (server batch needs T115 queue); documented here instead of a fake endpoint

---

## Phase 9 — Wave 3: infra-gated (build gate first, then tools)

### TASK-115a — Job ledger + worker dispatch (gate, zero new deps)
- [x] Job model + POST/GET jobs API + in-memory dispatch table + expiry sweep (no processors until FFmpeg lands)

### TASK-115 — Job queue + worker + object storage (gate for N)
- [ ] Async jobs per `06 §32`; then N Media (20): video/audio converters, trimmers, extractors, metadata, subtitles (needs FFmpeg binary — verified absent)

### TASK-116a — AI gateway + metering (gate, zero new deps)
- [x] Env keys, monthly quota, input caps, system/user separation, mocked-provider tests (no live tool without a key)

### TASK-116 — AI gateway + cost/abuse controls (gate for O)
- [ ] Server-only keys, rate/usage limits, prompt-injection defenses; then O AI (20): summarizer → grammar → rewriter → translator → rest (needs provider key)

### TASK-117a — SSRF guard + URL tools (Node built-ins only)
- [x] safe-fetch (scheme/DNS/redirect/size/timeout guards) + url-status/metadata, dns-lookup, ssl-checker

### TASK-117 — SSRF guard + fetch sandbox (gate for P)
- [ ] Then P URL remaining (14): shortener/expander (needs persistence + abuse review), screenshot (needs browser), rest deferred

Total backend executors: 7 + 31 + 19 + 28 + 15 + 20 + 20 + 14 = **154**.
