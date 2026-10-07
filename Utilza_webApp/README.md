# Utilza Web App

React + Vite frontend for the Utilza / EverydayTools `/api/v1` backend.
Product, UX, and architecture spec: `WEB_APP_REQUIREMENTS.md`.
Backend contract: `API.md`. Build plan and status: `tasks.md`.

## Setup

Requirements: Node 20+, npm 9+, and the backend running (default `http://localhost:4000`).

```bash
npm install
npm run dev     # http://localhost:5173, /api proxied to :4000
npm run build   # production bundle in dist/
npm run preview # serve the production bundle
```

## Environment

| Variable | Dev default | Notes |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api/v1` | Local proxy (`vite.config.js` → `http://localhost:4000`). Production example: `https://api.utilza.example.com/api/v1`. |

Copy `.env.example` to `.env` and adjust. Never put secrets in `VITE_*` variables —
only the public base URL belongs here. The backend only supports Bearer tokens
(no HttpOnly cookie sessions); the token persists in `localStorage` by default
(see `src/stores/session.js` for the documented trade-off and the memory-only switch).

Backend CORS must include the web origin (backend default `CORS_ORIGIN=http://localhost:5173`).

## How it connects

- Axios client (`src/lib/api-client.js`): base URL from env, `Bearer` attached only
  when a token exists (public catalog + tool execution stay anonymous), ~30 s timeout,
  backend envelope errors normalized to `{status, code, message, details}`.
- Server state in TanStack Query; filter/page state in the URL; only token/user and
  ephemeral UI state in Zustand.
- File tools POST multipart `files`; URL tools POST JSON; results are short-lived
  (`downloadUrl` `/files/:id`, ~1 h) fetched as blobs — never stored, never in URLs
  or analytics.

## Project structure

Follows `WEB_APP_REQUIREMENTS.md` §43:

```
src/
  app/          providers, query client (keys, cache policy)
  components/   ui/ primitives, feedback/ states, layout/ shell, seo/
  features/     auth/ catalog/ tool-workspace/ favorites/ history/
                account/ subscription/ admin/ (+ per-feature components/hooks)
  hooks/        shared queries (catalog, account, admin, favorites)
  layouts/      public, account, admin shells
  lib/          api client, formatting
  pages/        route-level composition (lazy: workspace + admin lists)
  routes/       declarations, AuthGate (Bearer), AdminGate (API probe)
  services/     one module per backend area
  stores/       session only
  styles/       design tokens + Tailwind entry
  utils/        pure helpers
```

## Scope (non-negotiable)

The frontend never presents unsupported backend features as working. Out of scope —
no UI exists for these: payment checkout, password reset, email verification, social
login, notification center, persistent file history, category create/edit/delete
(backend `501`), production job submission, analytics dashboards, invoices, MFA,
profile pictures, email change, password change.

Tool behavior mirrors the backend contract exactly (see
`src/features/tool-workspace/tool-definitions.js`). `implementation: "frontend"`
catalog tools render a placeholder — their logic is not invented client-side.
