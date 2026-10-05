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

Shipped executors:

- `POST /api/v1/tools/pdf/merge` — multipart `files` (2–20 PDFs, ≤10 MB each)
  → merged PDF download. `400` for <2 files, non-PDF bytes, bad extension.
- `POST /api/v1/tools/pdf/split` — multipart `files` (exactly 1 PDF) +
  text field `ranges` (e.g. `"1-3,5"`, 1-based) → single PDF with those pages.
  `400` for missing/bad ranges, out-of-range pages, non-PDF bytes. Burst to
  many PDFs arrives with ZIP support (Wave 2); until then this also covers
  page extraction.
- `POST /api/v1/tools/pdf/compress` — multipart `files` (exactly 1 PDF) →
  optimized PDF (metadata stripped, object streams). Optimizer level only:
  no image downsampling. `400` for non-PDF bytes.
- `POST /api/v1/tools/pdf/to-word` — multipart `files` (exactly 1 PDF, ≤200
  pages) → `.docx` with extracted text (paragraphs per page). Text-extraction
  level: layout fidelity not preserved. `400` for non-PDF bytes and for
  scanned image-only PDFs with no text layer.
- `POST /api/v1/tools/image/compress` — multipart `files` (exactly 1 image:
  png/jpg/webp) + optional text field `quality` (1–100, default 80) →
  re-encoded image, same format, metadata stripped. No resizing. `400` for
  non-image bytes or bad quality.
- `POST /api/v1/tools/image/convert` — multipart `files` (exactly 1 image) +
  required text field `format` (`png|jpg|webp`) → converted image at high
  quality, metadata stripped. `400` for bad format or non-image bytes.
- `POST /api/v1/tools/document/to-pdf` — multipart `files` (exactly 1 `.docx`,
  ≤2000 paragraphs) → PDF with re-rendered text (word-wrapped, Latin scripts
  only). Text-level conversion: tables/images/columns not preserved. `400`
  for non-docx files or documents with no text.
- `POST /api/v1/tools/pdf/from-image` — multipart `files` (1–10 PNG/JPG) →
  multi-page PDF, one page per image fitted to A4 (never upscaled). Serves
  catalog "JPG to PDF" + "PNG to PDF".
- `POST /api/v1/tools/pdf/rotate` — multipart `files` (exactly 1 PDF) +
  `angle` (90|180|270) + optional `ranges` (default all) → rotated PDF.
  Rotation is absolute.
- `POST /api/v1/tools/pdf/delete-pages` — multipart `files` (exactly 1 PDF) +
  required `ranges` → PDF without those pages. `400` if all pages removed.
- `POST /api/v1/tools/pdf/text` — multipart `files` (exactly 1 PDF) →
  `{pageCount, pages, charCount}` JSON (no download).
- `POST /api/v1/tools/pdf/metadata` — multipart `files` (exactly 1 PDF) →
  document metadata JSON (absent fields null, never echoes bytes).
- `POST /api/v1/tools/pdf/watermark` — multipart `files` (exactly 1 PDF) +
  `text` (1–100 chars) + optional `opacity` (0.05–0.5, default 0.15) and `size`
  (12–144, default 48) → diagonal translucent stamp on every page.
- `POST /api/v1/tools/pdf/number-pages` — multipart `files` (exactly 1 PDF) +
  optional `format` (`n-of-total` default, `n`) and `size` → bottom-center
  numbers on every page.
- `POST /api/v1/tools/pdf/header-footer` — multipart `files` (exactly 1 PDF) +
  `header` and/or `footer` (at least one, ≤200 chars) + optional `size` →
  top/bottom-center text on every page.
- `POST /api/v1/tools/pdf/reorder` — multipart `files` (exactly 1 PDF) +
  `order` (e.g. `"3,1,2"`) → pages rearranged; must list every page exactly
  once. `400` otherwise.
- `POST /api/v1/tools/pdf/duplicate` — multipart `files` (exactly 1 PDF) +
  `ranges` + `times` (1–10, default 1) → original pages plus appended copies.
- `POST /api/v1/tools/pdf/flatten` — multipart `files` (exactly 1 PDF) →
  normalized fresh file (drops incremental history; metadata preserved,
  unlike compress).
- `POST /api/v1/tools/pdf/search` — multipart `files` (exactly 1 PDF) +
  `query` (1–200 chars) → `{pageCount, query, matches:[{page,line}]}` JSON
  (case-insensitive, capped at 50).
- `POST /api/v1/tools/document/word-to-txt` — multipart `files` (exactly 1
  `.docx`) → plain-text download (paragraphs separated by blank lines).
- `POST /api/v1/tools/document/word-to-html` — multipart `files` (exactly 1
  `.docx`) → escaped single-page HTML download.
- `POST /api/v1/tools/document/word-to-markdown` — multipart `files`
  (exactly 1 `.docx`) → Markdown download (plain paragraphs).
- `POST /api/v1/tools/document/txt-to-pdf` — multipart `files` (exactly 1
  `.txt`, UTF-8, ≤2000 lines) → paginated PDF via the shared renderer.
  `400` for binary or empty input.
- `POST /api/v1/tools/document/excel-to-csv` — multipart `files` (exactly 1
  `.xlsx`) → first worksheet as CSV download (header row included). `.xls`
  (legacy BIFF) unsupported.
- `POST /api/v1/tools/document/excel-to-json` — multipart `files` (exactly 1
  `.xlsx`) → JSON array download (first row = keys).
- `POST /api/v1/tools/document/csv-to-json` — multipart `files` (exactly 1
  `.csv`) → JSON array download.
- `POST /api/v1/tools/document/csv-to-excel` — multipart `files` (exactly 1
  `.csv`) → `.xlsx` download.
- `POST /api/v1/tools/document/json-to-csv` — multipart `files` (exactly 1
  `.json`, array of objects ≤50k rows/100 cols) → CSV download (union keys in
  first-seen order, nested values JSON-encoded).
- `POST /api/v1/tools/document/markdown-to-html` — multipart `files`
  (exactly 1 `.md`/`.markdown`, ≤500k chars) → standalone HTML download
  (scripts + event handlers stripped; consumers embedding it must sandbox).
- `POST /api/v1/tools/document/metadata` — multipart `files` (exactly 1
  `.docx`/`.xlsx`) → metadata JSON (absent fields null, never echoes bytes).
- `POST /api/v1/tools/image/resize` — multipart `files` (exactly 1 image) +
  `width` and/or `height` (at least one, 1–8000px) → aspect-preserved resize,
  never upscaled. `400` when neither given.
- `POST /api/v1/tools/image/crop` — multipart `files` (exactly 1 image) +
  `left/top/width/height` → exact region crop. `400` when the region exceeds
  the real dimensions.
- `POST /api/v1/tools/image/rotate` — multipart `files` (exactly 1 image) +
  `angle` (90|180|270) → physically rotated pixels (dimensions swap on 90°).
- `POST /api/v1/tools/image/flip` — multipart `files` (exactly 1 image) +
  `direction` (`horizontal|vertical`) → mirrored image, same format.
- `POST /api/v1/tools/file/zip-create` — multipart `files` (2–20 files,
  common types, executables blocked, 50 MB combined) → ZIP download with
  sanitized entry names.
- `POST /api/v1/tools/file/zip-extract` — multipart `files` (exactly 1
  `.zip`) → `{count, files:[{fileId, downloadUrl, name, size, mimeType}]}`
  JSON (≤50 entries, ≤50 MB uncompressed; traversal names sanitized).
- `POST /api/v1/tools/file/hash` — multipart `files` (exactly 1 file, any
  type — bytes hashed, never stored) → `{sha256, sha512, size}` JSON.
- `POST /api/v1/tools/file/base64-encode` — multipart `files` (exactly 1
  file ≤5 MB) → `.b64` text download.
- `POST /api/v1/tools/file/base64-decode` — multipart `files` (exactly 1
  `.txt`/`.b64`/`.md`/`.csv`/`.json`) → raw bytes download (`bin`,
  octet-stream). Strict: invalid characters fail.
- `POST /api/v1/tools/image/grayscale` — multipart `files` (exactly 1
  image, no params) → grayscale image, same format.
- `POST /api/v1/tools/image/blur` — multipart `files` (exactly 1 image) +
  `sigma` (0.3–50, default 5) → blurred image.
- `POST /api/v1/tools/image/sharpen` — multipart `files` (exactly 1 image) +
  `sigma` (0.5–10, default 1) → sharpened image.
- `POST /api/v1/tools/image/brightness` — multipart `files` (exactly 1
  image) + `level` (0.1–3, default 1.2) → brightness-adjusted image.
- `POST /api/v1/tools/image/contrast` — multipart `files` (exactly 1 image) +
  `level` (0.1–3, default 1.2, linear around midpoint) → adjusted image.
- `POST /api/v1/tools/file/metadata` — multipart `files` (any single file
  ≤10 MB, inspected never stored) → `{name, size, declaredMime,
  detectedType, detectedMime, sha256, textLines}` JSON.
- `POST /api/v1/tools/file/type` — multipart `files` (any single file) →
  `{type, mime}` from content sniffing (png/jpeg/webp/gif/pdf/zip/docx/xlsx/
  pptx/mp3/mp4/text/unknown); extension ignored.
- `POST /api/v1/tools/image/pixelate` — multipart `files` (exactly 1 image)
  + `blocks` (4–100, default 20) → nearest-neighbor pixelation, same dims.
- `POST /api/v1/tools/image/watermark` — multipart `files` (exactly 1 image)
  + `text` (1–100) + `position` (5 corners/center) + `opacity`/`size` →
  SVG-composite text overlay.
- `POST /api/v1/tools/image/metadata` — multipart `files` (exactly 1 image)
  → sharp metadata JSON (never echoes bytes).
- `POST /api/v1/tools/file/merge` — multipart `files` (2–20, same text ext:
  txt/md/csv/json) → newline-concatenated download. `400` on mixed types.
- `POST /api/v1/tools/file/split` — multipart `files` (exactly 1 text file)
  → ZIP of ≤20 even line chunks. `400` for binary input.
- `POST /api/v1/tools/file/compress` — multipart `files` (exactly 1 file
  ≤5 MB) → gzip (`.gz`) download.
- `POST /api/v1/tools/pdf/redact` — multipart `files` (exactly 1 PDF) +
  `regions` JSON string (`[{"page":1,"x":10,"y":10,"w":100,"h":20}]`, ≤100)
  → black-box covered PDF. **Visual cover only** — underlying text stays
  extractable; not for truly sensitive data.
- `POST /api/v1/tools/image/social` — multipart `files` (exactly 1 image) +
  `preset` (`og` 1200x630, `square` 1080x1080, `story` 1080x1920, `banner`
  1500x500) → cover-fit canvas.
- `POST /api/v1/tools/image/passport` — multipart `files` (exactly 1 image,
  no params) → center 413x531 crop (35x45mm @300dpi, no face detection).
- `POST /api/v1/tools/image/montage` — multipart `files` (2–9 images, exact
  grid `cols`×`rows` count) + optional `gap`, `background` → grid montage.
  `400` on count mismatch or invalid params.
- `POST /api/v1/tools/image/exif-remove` — multipart `files` (exactly 1
  image, no params) → near-lossless re-encode with all metadata dropped.
- `POST /api/v1/tools/image/favicon` — multipart `files` (exactly 1 image,
  no params) → ZIP of 16/32/48/180/192px PNGs + `site.webmanifest`.

## Admin (Bearer + `ADMIN_EMAILS`)

Gate: comma-separated allowlist in env. Empty allowlist → every request gets
`403 FORBIDDEN "Admin access is not configured."`.

- `GET /api/v1/admin/tools?page=&limit=&search=` → all tools incl. inactive
  (`{id, name, slug, isActive, categoryId, sortOrder}`).
- `GET /api/v1/admin/users?page=&limit=&search=` → `{id, email, name,
  createdAt}` — `passwordHash` never included.
- Read-only for now; write endpoints arrive with the admin console.
