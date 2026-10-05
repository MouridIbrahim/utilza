# EverydayTools API v1 — Contract

Base URL: `/api/v1`. Version is stable from day one (`02-BACKEND.md:149`).
This document is the shared contract for the web (`Utilza_webApp`) and Flutter
(`Utilza_mobile`) clients. Any change here requires updating backend types and
both clients (`05-AI-AGENT-RULES.md:338`).

## Conventions

Success:

```json
{ "success": true, "data": { } }
```

Error:

```json
{ "success": false, "error": { "code": "STABLE_CODE", "message": "Human readable." } }
```

- Validation errors in non-production also include `error.details` (zod field
  errors). Production responses carry only `code` + `message`.
- Authentication: `Authorization: Bearer <jwt>`.
- Pagination: `?page=1&limit=20` (limit capped: tools 50, history 50, admin 100).
  Responses: `{ items, page, limit, total }`.
- Rate limits: global 300 req/15 min/IP; auth endpoints 30/15 min; files 30/15
  min; analytics 60/min. Exceeded → `429 RATE_LIMITED`.

## Error codes

| Code | HTTP | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Bad body/query/params/file fields |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired token, bad credentials |
| `FORBIDDEN` | 403 | Authenticated but not allowed (incl. admin gate) |
| `NOT_FOUND` | 404 | Route does not exist |
| `TOOL_NOT_FOUND` | 404 | Unknown tool slug/id |
| `CATEGORY_NOT_FOUND` | 404 | Unknown category slug |
| `PAYLOAD_TOO_LARGE` | 413 | JSON body over 100kb |
| `FILE_TOO_LARGE` | 413 | Upload over 10 MB |
| `UPLOAD_ERROR` | 400 | Other multer upload failure |
| `FILE_NOT_FOUND` | 404 | Unknown/removed download id |
| `FILE_EXPIRED` | 410 | Download expired (TTL passed) |
| `EMAIL_TAKEN` | 409 | Register with existing email |
| `ALREADY_FAVORITED` | 409 | Duplicate favorite |
| `RATE_LIMITED` | 429 | Too many requests |
| `NOT_IMPLEMENTED` | 501 | Deliberate stub (subscriptions webhook, admin writes) |
| `INTERNAL_ERROR` | 500 | Generic server error (no internals exposed) |

## Health (public)

- `GET /health` → `{status:"ok", uptime}`
- `GET /api/v1/health` → `{status, uptime, db, version}` — `db:false` means DB
  unreachable (liveness still 200; use `db` for readiness checks).

## Tools (public)

- `GET /api/v1/tools?category=<slug>&search=<text>&page=&limit=` →
  `{items, page, limit, total}` — active tools only, sorted by `sortOrder`.
  Item: `{id, name, slug, description, icon, isActive, sortOrder, categoryId,
  implementation ("frontend"|"backend"), platforms, requiresFile, requiresAuth,
  supportsOffline, category:{slug,name}, ...}`.
- `GET /api/v1/tools/:slug` → tool item or `404 TOOL_NOT_FOUND`.
- Note: `slug` is public/stable — web routes mirror it (`/tools/:slug`).
- Classification follows `06-FULL-PROJECT-ARCHITECTURE.md §20`: the 10 MVP
  tools are all `implementation:"frontend"` — React/Flutter own the logic and
  the backend exposes no processing endpoint for them (`§26`).

## Categories (public)

- `GET /api/v1/categories` → `{items}` — active only, sorted by `sortOrder`.
- `GET /api/v1/categories/:slug` → category or `404 CATEGORY_NOT_FOUND`.

Admin write stubs (behind Bearer + `ADMIN_EMAILS` gate):

- `POST /api/v1/categories` → `501 NOT_IMPLEMENTED`
- `PATCH /api/v1/categories/:slug` → `501 NOT_IMPLEMENTED`
- `DELETE /api/v1/categories/:slug` → `501 NOT_IMPLEMENTED`

Without token → `401`; with token but not admin → `403 FORBIDDEN`.

## Auth

- `POST /api/v1/auth/register {email, password(≥8), name?}` → `201 {user, token}`,
  `400 VALIDATION_ERROR`, `409 EMAIL_TAKEN`.
- `POST /api/v1/auth/login {email, password}` → `200 {user, token}`,
  `401 UNAUTHORIZED` with generic "Invalid credentials." (same for unknown
  email and wrong password — no account enumeration).
- `POST /api/v1/auth/logout` → `{loggedOut:true}` (stateless; client discards
  token).
- `GET /api/v1/auth/me` → `200 {user}` or `401`.

`user = {id, email, name}` — `passwordHash` never leaves the server.

## Users (Bearer)

- `GET /api/v1/users/me` → `{id, email, name}` — `401` if the token's user no
  longer exists.
- `PATCH /api/v1/users/me {name?}` → updated `{id, email, name}`.
- `DELETE /api/v1/users/me` → `{deleted:true}` — cascades favorites, history,
  subscription. Token becomes useless (401 afterwards).

## Favorites (Bearer, scoped to caller)

- `GET /api/v1/favorites` → `{items:[{id, userId, toolId, createdAt, tool:{id,
  name, slug, icon}}]}` — only the caller's rows.
- `POST /api/v1/favorites {toolId}` → `201 favorite`; `404 TOOL_NOT_FOUND` if
  tool unknown/inactive; `409 ALREADY_FAVORITED` (DB-unique, race-safe).
- `DELETE /api/v1/favorites/:toolId` → `{deleted:true}` — idempotent; scoped to
  the caller (cannot delete another user's row).

## History (Bearer, scoped to caller)

- `GET /api/v1/history?page=&limit=` → `{items, page, limit, total}` newest
  first, only caller's entries.
- `POST /api/v1/history {toolSlug, inputSummary?}` → `201 entry`.
  `inputSummary` max 500 chars. No file contents ever stored.
- `DELETE /api/v1/history` → `{deleted:true}` — clears caller's rows only.

## Analytics (public, rate-limited, anonymous allowed)

- `POST /api/v1/analytics {event, toolSlug?, platform?}` → `201
  {recorded:true}`.
- `event` allowlist: `tool_opened | tool_completed | tool_failed |
  file_uploaded | result_downloaded | result_copied | tool_favorited |
  search_performed`.
- `platform`: `web | android | ios | unknown`.
- `toolSlug` must exist → else `400 VALIDATION_ERROR "Unknown toolSlug."`.
- No PII collected; events are currently logged (UsageEvent table planned).

## Subscriptions (Bearer)

- `GET /api/v1/subscriptions/me` → subscription row or free default
  `{status:"free", tier:"free"}`.
- `POST /api/v1/subscriptions/webhook` → `501 NOT_IMPLEMENTED` (public stub —
  payment providers cannot send a Bearer token).

## Files (rate-limited)

- `POST /api/v1/files/process` — `multipart/form-data`, field `file`.
  - ≤ 10 MB; allowed extensions: `png jpg jpeg webp pdf` (extension + size
    checked; MIME alone never trusted).
  - `400` missing/empty/bad extension, `413 FILE_TOO_LARGE` oversize.
  - Success `200 {jobId, originalName:"upload", ext, size, note}` — user
    filename is never used or echoed as a path; memory-only, no persistence
    (MVP validates only; transforms are the next milestone).
- `GET /api/v1/files/:fileId` → bytes download (`attachment`, server-derived
  filename) for files produced by backend tool executors; `404
  FILE_NOT_FOUND`, `410 FILE_EXPIRED`.

## Backend tool execution (shared envelope)

Complex tools upload via multipart field **`files`** (count/size/extension
limits are per tool, ≤10 MB per file) and share one flow: validate → temp id →
process → temp storage → `GeneratedFile` row → result. Every
`POST /api/v1/tools/<category>/<tool>` returns:

```json
{ "success": true, "data": {
  "jobId": "uuid", "fileId": "cuid", "downloadUrl": "/api/v1/files/<fileId>",
  "mimeType": "application/pdf", "size": 12345, "expiresAt": "ISO-8601" } }
```

Fetch the bytes via `downloadUrl` (see Files). Outputs expire (default TTL 1h);
user filenames are never used as paths or echoed.

## Admin (Bearer + `ADMIN_EMAILS`)

Gate: comma-separated allowlist in env. Empty allowlist → every request gets
`403 FORBIDDEN "Admin access is not configured."`.

- `GET /api/v1/admin/tools?page=&limit=&search=` → all tools incl. inactive
  (`{id, name, slug, isActive, categoryId, sortOrder}`).
- `GET /api/v1/admin/users?page=&limit=&search=` → `{id, email, name,
  createdAt}` — `passwordHash` never included.
- Read-only for now; write endpoints arrive with the admin console.
