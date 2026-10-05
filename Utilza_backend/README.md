# Utilza Backend

Node.js + Express + TypeScript + Prisma + Neon PostgreSQL.
Spec: `02-BACKEND.md`. Tasks: `tasks.md`.

Docs: [API contract](docs/API.md) · [Deploy runbook](docs/DEPLOY.md)

## Quick start

```bash
cp .env.example .env   # fill DATABASE_URL + JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Health: `GET /health`, `GET /api/v1/health`
Tools: `GET /api/v1/tools`, `GET /api/v1/tools/:slug`

## Scripts

- `npm run dev` — watch mode (tsx)
- `npm run build` / `npm start` — compile + run
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` / `npm run format`
- `npm test` — full suite (unit + integration + security, hits `DATABASE_URL`)
- `npm run test:integration` — DB-backed module suites only
- `npm run seed` — idempotent seed: MVP categories + 10 tools
- `npm run prisma:migrate` / `npm run prisma:deploy`

## Tests

84+ tests across `src/**/*.test.ts`: route integration against the configured
DB (test users are disposable and cleaned up in `afterAll`), middleware units,
security suite (headers, CORS allowlist, forged/expired tokens, malformed
JSON, 500 redaction, secret leakage, payload limits) and a docs contract test
that fails if an endpoint or error code is missing from `docs/API.md`.
`NODE_ENV=test` is forced by `vitest.config.mts` (relaxed rate limits, silent
logs).

## Notes

- Controllers are thin; logic lives in services.
- Standard error shape: `{success:false, error:{code,message}}`.
- Auth is JWT Bearer. Protected: `/users`, `/favorites`, `/history`,
  `/subscriptions/me`.
- Admin: `/api/v1/admin/*` + category write stubs are gated by `ADMIN_EMAILS`
  (empty = 403 "not configured"); writes return `501 NOT_IMPLEMENTED` until the
  admin console ships.
- `GET /api/v1/tools` + `/categories` fall back to a static registry when the
  DB is unreachable (dev/test convenience).
- Files: `POST /api/v1/files/process` validates type/size (≤10 MB, extension +
  size checks, memory-only, filename never used as path); transforms are the
  next milestone.
