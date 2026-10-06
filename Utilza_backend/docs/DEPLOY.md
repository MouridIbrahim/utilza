# EverydayTools Backend — Deploy Runbook

## Environment

Production requires (see `.env.example` for the template):

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | yes | `production` |
| `PORT` | yes | default 4000 |
| `DATABASE_URL` | yes | Neon pooled connection string, `sslmode=require` |
| `JWT_SECRET` | yes | ≥32 chars, unique per environment, rotate if exposed |
| `JWT_EXPIRES_IN` | no | default `7d` |
| `CORS_ORIGIN` | yes | comma-separated allowlist, e.g. `https://utilza.app` — never `*` with credentials |
| `STORAGE_*` | when file transforms ship | object storage for temp files |
| `ADMIN_EMAILS` | optional | comma-separated admin allowlist; empty = admin routes return 403 |

Rules: `.env` is gitignored and must never be committed; production secrets
live in the host's secret store, not in the repo. `env.ts` fails fast at boot
if `DATABASE_URL`/`JWT_SECRET` are missing or `JWT_SECRET` < 32 chars.

## First deploy / schema changes

```bash
npm ci
npm run prisma:generate
npm run prisma:deploy        # applies pending migrations (safe on prod)
npm run seed                 # idempotent (upsert by slug); safe to re-run
npm run build
npm start                    # node dist/server.js
```

Never run `prisma migrate dev` against production (it can reset data);
`prisma migrate deploy` only applies committed migrations.

## Docker image (recommended for staging/prod)

Build from `Utilza_backend/` (no Docker daemon on the current dev machine,
so the image build itself is still pending a host with Docker):

```bash
docker build -t utilza-backend ./Utilza_backend
docker run --env-file Utilza_backend/.env -p 4000:4000 utilza-backend
```

The image runs `prisma migrate deploy` on boot, then `node dist/server.js`;
liveness is the Docker `HEALTHCHECK` on `GET /health`. Secrets come only
from `--env-file` / the host secret store — never baked into the image
(`.dockerignore` excludes `.env`).

## Health / readiness

- Liveness: `GET /health` → 200 always once the process is up.
- Readiness: `GET /api/v1/health` → check `data.db === true`.

## Graceful shutdown

`src/server.ts` handles `SIGTERM`/`SIGINT`: stops accepting connections, then
exits; force-exit after 10 s. Orchestrators should send `SIGTERM` and allow
≥ 15 s before `SIGKILL`.

## Log redaction audit

`src/lib/logger.ts` redacts `password, passwordHash, token, accessToken,
refreshToken, authorization, DATABASE_URL, JWT_SECRET, STORAGE_SECRET_KEY,
STORAGE_ACCESS_KEY`. Error responses in production return only
`{code, message}` — no stack traces, paths, or DB internals. Verify after any
logger config change: `npm test` (security suite asserts no leakage in
responses).

## Post-deploy smoke

```bash
curl -fsS $BASE/health
curl -fsS $BASE/api/v1/health          # expect data.db=true
curl -fsS $BASE/api/v1/tools/percentage-calculator
curl -fsS -X POST $BASE/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke@example.com","password":"SmokePass123!"}'
```

Full regression: `npm run format && npm run lint && npm run typecheck && npm test`
(84 tests, runs against the configured `DATABASE_URL`).

## Rollback

1. Redeploy previous build (`npm ci && npm run build`).
2. Prisma migrations are forward-only here; for a bad migration, restore from
   Neon's point-in-time restore, then apply a corrective migration.
