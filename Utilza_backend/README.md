# Utilza Backend

Node.js + Express + TypeScript + Prisma + Neon PostgreSQL.
Spec: `02-BACKEND.md`. Tasks: `tasks.md`.

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
- `npm test` — vitest
- `npm run seed` — seed MVP categories + 10 tools

## Notes

- Controllers are thin; logic lives in services.
- Standard error shape: `{success:false, error:{code,message}}`.
- Auth is JWT Bearer. Protected: `/users`, `/favorites`, `/history`, `/subscriptions/me`.
- `GET /api/v1/tools` + `/categories` fall back to static registry when DB is unreachable (dev/test convenience).
- Files: `POST /api/v1/files/process` validates type/size, MVP stub only.
