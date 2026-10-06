# Backend → Frontend Integration Specification

**Repository analysed:** `utilza_backend` (version `0.1.0`)  
**Evidence standard:** **Confirmed** means read from the executable TypeScript/Prisma source. **Documented** means it is in `docs/API.md` and consistent with route code. **Unknown / not found** means no implementation was found. This is a reverse-engineering report; it does not change the API.

## 1. Executive Summary

Utilza is an Express REST API for an EverydayTools product. It serves a tool catalogue, accounts, favorites, history, subscriptions, analytics, administrative read views, synchronous document/image/file transforms, and an unfinished async-job scaffold. React and Flutter should use the same versioned REST API at `/api/v1`.

The catalogue contains two classes of tools:

- `implementation: "frontend"`: the ten basic calculators/text/generator tools have **no execution endpoint**. Each client owns the calculation locally.
- `implementation: "backend"`: file, image, PDF, document, and URL tools are executed by this API. File transforms are normally synchronous and return either JSON or a short-lived download URL.

There is no refresh-token, cookie session, OAuth, notification, websocket, push, or completed payment system. Authentication is a stateless JWT in `Authorization: Bearer <token>`. Only an email allowlist is used for the ADMIN role.

## 2. Technology Stack

| Area | Confirmed implementation |
| --- | --- |
| Runtime/language | Node.js / TypeScript 5.6; Node type definitions target 22.x |
| Framework/API | Express 4 REST API, CommonJS package type, `tsx` in development |
| Package manager | npm (`package-lock.json`) |
| Database/ORM | PostgreSQL (Neon deployment assumption) with Prisma 5 |
| Validation | Zod 3; Multer validates multipart limits |
| Auth | bcryptjs password hashes (cost 12), `jsonwebtoken` JWT Bearer |
| Security | Helmet, CORS, express-rate-limit, SSRF guard for URL tools |
| Storage | local OS temporary directory plus a `GeneratedFile` database pointer; object-storage env vars are not wired to an adapter |
| Transform libraries | pdf-lib, pdfjs-dist, Sharp, ExcelJS, JSZip, tar, docx, marked, canvas |
| Tests | Vitest + Supertest; typecheck passed during this analysis. DB integration tests could not run because the configured Neon host was unreachable. |

## 3. Backend Architecture

```text
React Web / Flutter
        ↓ HTTPS JSON or multipart/form-data
Express app (/api/v1)
        ↓ Helmet → CORS → global rate limit → body parser → request id
Feature router
        ↓ auth / admin guard / route rate limiter / Zod validation / Multer
Thin route handler or service
        ↓ Prisma PostgreSQL, local temporary output storage, or external URL/DNS/TLS
{ success: true, data: ... } / standardized error envelope
```

There are no controller or repository directories. Route files act as thin controllers; `auth.service.ts`, `tools.service.ts`, category service, and processor services hold domain logic. File tool routes share `createFileToolHandler`, which validates uploads, invokes a processor, writes output to temporary storage, creates a `GeneratedFile`, and responds with a download envelope.

## 4. Project Structure

```text
src/
├── app.ts                    Express middleware and /api/v1 mounts
├── server.ts                 HTTP bootstrap and graceful shutdown
├── config/                   runtime Zod environment validation; DB configuration
├── lib/                      Prisma, temp storage, cleanup, logger, SSRF and AI gateways
├── middleware/               JWT/admin auth, Zod validator, limiter, error handler
├── modules/
│   ├── auth users favorites history subscriptions admin analytics jobs health
│   ├── categories             catalogue category reads and guarded write stubs
│   ├── files                  generic upload validation/downloads
│   └── tools                  catalogue plus PDF/image/document/file/URL executors
├── types/                    common success/error/pagination/JWT types
└── utils/                    response helper and stable HTTP errors
prisma/
├── schema.prisma             authoritative relational data model
├── migrations/               schema evolution
└── seed.ts                   categories and tool catalogue source data
docs/API.md                   maintained API contract (validated by test)
docs/DEPLOY.md                environment and deployment runbook
```

`src/modules/tools/tool-registry.ts` is a static fallback for catalogue reads when the database is unavailable. It is not a fallback for accounts, favorites, history, generated files, or execution results. Tests cover routes, security conditions, transforms, middleware, and the API documentation contract.

## 5. Feature/Module Inventory

| Module | Feature | Routes | Auth/role |
| --- | --- | --- | --- |
| Health | liveness and DB readiness | `/health`, `/api/v1/health` | public |
| Catalogue | categories, tool discovery/search/detail | `/categories`, `/tools` | public |
| Auth/profile | register, login, JWT identity, profile update/delete | `/auth`, `/users/me` | selected routes Bearer |
| Personal data | favorites and tool history | `/favorites`, `/history` | Bearer, caller-scoped |
| Analytics | allowed anonymous events, log-only | `/analytics` | public |
| Subscription | read free/default subscription | `/subscriptions/me` | Bearer |
| Files | generic validation stub and generated-file download | `/files` | public, rate-limited |
| Processing tools | 60+ synchronous tool endpoints | `/tools/{pdf,image,document,file,url}` | public |
| Jobs | queued-job database scaffold | `/jobs` | mixed; no built-in workers |
| Admin | tools/users listing; category mutation stubs | `/admin`, category writes | Bearer + `ADMIN_EMAILS` |
| AI | server-side gateway library only | **no route** | UNKNOWN / NOT FOUND as frontend feature |

## 6. Complete API Inventory

### Universal contract

All JSON success responses are `{"success":true,"data":<payload>}`. All normal errors are `{"success":false,"error":{"code":"...","message":"..."}}`; non-production validation responses additionally contain `error.details` (a Zod flattened object). Unless stated otherwise, endpoints return 200. JSON endpoints require `Content-Type: application/json`; multipart routes must not manually set a boundary. Every route is under `/api/v1` except `GET /health`.

### Core endpoints

| Method and complete path | Auth | Request / validation | Success data / status |
| --- | --- | --- | --- |
| GET `/health` | no | none | `{status:"ok",uptime:number}` |
| GET `/api/v1/health` | no | none | `{status:"ok",uptime:number,db:boolean,version:"0.1.0"}`; always 200 if process lives |
| POST `/api/v1/auth/register` | no | JSON `email` valid/max255, `password` 8–128, `name?` 1–100 | **201** `{user:PublicUser,token:string}` |
| POST `/api/v1/auth/login` | no | JSON `email` valid/max255, `password` 1–128 | `{user,token}` |
| POST `/api/v1/auth/logout` | no | none | `{loggedOut:true}`; does not revoke a token |
| GET `/api/v1/auth/me` | Bearer | none | `PublicUser` |
| GET `/api/v1/users/me` | Bearer | none | `PublicUser` |
| PATCH `/api/v1/users/me` | Bearer | JSON `{name?: string(1–100) \| null}` | updated `PublicUser`; **important:** `null` is parsed but results in no update due to `?? undefined` |
| DELETE `/api/v1/users/me` | Bearer | none | `{deleted:true}`; database cascades favorites/history/subscription |
| GET `/api/v1/categories` | no | none | `{items:Category[]}` active only, sortOrder ascending |
| GET `/api/v1/categories/:slug` | no | slug is not Zod-validated | `Category` |
| POST/PATCH/DELETE `/api/v1/categories[/:slug]` | Bearer + ADMIN | no validated body | **501** `NOT_IMPLEMENTED` |
| GET `/api/v1/tools` | no | query `category?` 1–64, `search?` 1–100, `page` int ≥1 default1, `limit` int 1–50 default20 | `{items:Tool[],page,limit,total}` |
| GET `/api/v1/tools/:slug` | no | slug 1–100 | `Tool` if active |
| GET `/api/v1/favorites` | Bearer | none | `{items:FavoriteWithTool[]}` newest first |
| POST `/api/v1/favorites` | Bearer | JSON `{toolId:string(1–64)}` | **201** `Favorite` |
| DELETE `/api/v1/favorites/:toolId` | Bearer | path 1–64 | `{deleted:true}`; idempotent |
| GET `/api/v1/history` | Bearer | `page` ≥1 default1; `limit` 1–50 default20 | `{items:ToolHistory[],page,limit,total}` newest first |
| POST `/api/v1/history` | Bearer | JSON `{toolSlug:string(1–100),inputSummary?:string(max500)}` | **201** `ToolHistory` |
| DELETE `/api/v1/history` | Bearer | none | `{deleted:true}` |
| POST `/api/v1/analytics` | no | JSON event enum below, `toolSlug?` 1–100, `platform` enum/default `unknown` | **201** `{recorded:true}`; log only |
| GET `/api/v1/subscriptions/me` | Bearer | none | `Subscription` or `{status:"free",tier:"free"}` |
| POST `/api/v1/subscriptions/webhook` | no | none | **501** `NOT_IMPLEMENTED` |
| POST `/api/v1/files/process` | no | multipart **`file`**, one nonempty png/jpg/jpeg/webp/pdf, ≤10 MiB | `{jobId:uuid,originalName:"upload",ext,size,note}`; validation stub only |
| GET `/api/v1/files/:fileId` | no | CUID-like path length 20–30 | raw attachment bytes; **not** JSON |
| GET `/api/v1/admin/tools` | Bearer + ADMIN | page ≥1 default1, limit 1–100 default50, `search?` 1–100 | `{items:AdminTool[],page,limit,total}` |
| GET `/api/v1/admin/users` | Bearer + ADMIN | same pagination/search | `{items:AdminUser[],page,limit,total}` |
| POST `/api/v1/jobs` | optional Bearer | JSON `{type:string(1–64),input?:unknown}` | **201** `Job`; currently every type returns `404 NO_WORKER` because the handler map is empty |
| GET `/api/v1/jobs` | Bearer | none | `{items:Job[]}` maximum 50, newest first |
| GET `/api/v1/jobs/:id` | optional Bearer | CUID-like id 20–30 | `Job`; own jobs require owner; anonymous jobs are public by opaque id |

Analytics event enum: `tool_opened`, `tool_completed`, `tool_failed`, `file_uploaded`, `result_downloaded`, `result_copied`, `tool_favorited`, `search_performed`. Platform enum: `web`, `android`, `ios`, `unknown`. When `toolSlug` is supplied it must resolve in the DB or static registry.

### URL tool endpoints (JSON, public, analytics rate limit)

| Endpoint | Exact body | Success data |
| --- | --- | --- |
| POST `/api/v1/tools/url/status` | `{url:string(1–2000)}` | `{url,ok,status,finalUrl,redirects:[{status,location}],contentType,size}` |
| POST `/api/v1/tools/url/metadata` | `{url:string(1–2000)}` | `{url:finalUrl,title:string\|null,description:string\|null,openGraph:{title,description,image}}` |
| POST `/api/v1/tools/url/dns` | `{domain:hostname string(1–253)}` | `{domain,a:string[]\|null,aaaa:string[]\|null,mx:object[]\|null,txt:string[][]\|null,ns:string[]\|null}` |
| POST `/api/v1/tools/url/ssl` | same `domain` | `{domain,subject,issuer,validFrom,validTo,daysLeft,fingerprint256}`; nullable certificate values |

URL calls allow only public http(s) targets, refuse URL credentials/private DNS/IP literals, timeout in 10 seconds, follow at most five redirects, and cap fetched bodies at 1 MiB. Non-HTML metadata is a `400`.

### File-processing endpoint matrix

All rows below are **public POST** routes beneath `/api/v1/tools`, use `multipart/form-data`, and use field **`files`**. Per-file maximum is 10 MiB unless a smaller limit is stated. The tool field rules below are the source-confirmed input contract. Most successful transforms return the standard `FileToolResult` shown in section 8; JSON rows are explicitly marked.

| Path | Files and count | Multipart text fields | Result |
| --- | --- | --- | --- |
| `/pdf/merge` | 2–20 `.pdf` | — | download PDF |
| `/pdf/split` | 1 `.pdf` | `ranges` required, 1–200 (`1-3,5`), ≤500 selected pages | download PDF |
| `/pdf/compress` | 1 `.pdf` | — | download PDF (metadata stripped; no downsample) |
| `/pdf/to-word` | 1 `.pdf`, ≤200 pages | — | download `.docx`; text-only layout |
| `/pdf/from-image` | 1–10 png/jpg/jpeg | — | download PDF (A4 fitted) |
| `/pdf/rotate` | 1 `.pdf` | `angle` 90/180/270 required; `ranges?` 1–200 | download PDF |
| `/pdf/delete-pages` | 1 `.pdf` | `ranges` required 1–200; cannot remove all | download PDF |
| `/pdf/watermark` | 1 `.pdf` | `text` 1–100; `opacity` .05–.5 default .15; `size` int12–144 default48 | download PDF |
| `/pdf/number-pages` | 1 `.pdf` | `format` `n-of-total` (default) or `n`; `size` int8–36 default10 | download PDF |
| `/pdf/header-footer` | 1 `.pdf` | at least one of `header`,`footer`, each 1–200; `size` int8–36 default10 | download PDF |
| `/pdf/reorder` | 1 `.pdf` | `order` required 1–500, a complete unique 1-based permutation | download PDF |
| `/pdf/duplicate` | 1 `.pdf` | `ranges` required; `times` int1–10 default1 | download PDF |
| `/pdf/flatten` | 1 `.pdf` | — | download PDF, metadata preserved |
| `/pdf/redact` | 1 `.pdf` | `regions` required JSON string 2–20k chars: 1–100 `{page:int≥1,x/y:0–2000,w/h:1–2000}` | download PDF; visual cover only |
| `/pdf/to-image` | 1 `.pdf` | `format` png(default)/jpg; `pages?` 1–200; `scale` 1–3 default2, max20 pages | download ZIP |
| `/pdf/sign` | exactly 1 PDF and 1 png/jpg/jpeg signature | `page` int≥1 default1; `x`,`y` 0–2000 default50; `width` int10–500 default150 | download PDF; visible, non-cryptographic mark |
| `/image/compress` | 1 png/jpg/jpeg/webp | `quality` int1–100 default80 | download same-format image |
| `/image/convert` | 1 png/jpg/jpeg/webp | `format` required png/jpg/webp | download image |
| `/image/resize` | 1 image | at least one `width`,`height`, int1–8000; no upscaling | download image |
| `/image/crop` | 1 image | `left`,`top` int0–8000; `width`,`height` int1–8000; must fit image | download image |
| `/image/rotate` | 1 image | `angle` required 90/180/270 | download image |
| `/image/flip` | 1 image | `direction` required `horizontal`/`vertical` | download image |
| `/image/grayscale` | 1 image | — | download image |
| `/image/blur` | 1 image | `sigma` .3–50 default5 | download image |
| `/image/sharpen` | 1 image | `sigma` .5–10 default1 | download image |
| `/image/brightness` | 1 image | `level` .1–3 default1.2 | download image |
| `/image/contrast` | 1 image | `level` .1–3 default1.2 | download image |
| `/image/pixelate` | 1 image | `blocks` int4–100 default20 | download image |
| `/image/watermark` | 1 image | `text` 1–100; `position` top-left/top-right/bottom-left/bottom-right/center default bottom-right; `opacity` .05–.8 default.5; `size` int8–144 default24 | download image |
| `/image/exif-remove` | 1 image | no fields | download image |
| `/image/favicon` | 1 image | no fields | download ZIP (16/32/48/180/192 PNG + manifest) |
| `/image/social` | 1 image | `preset` required `og`/`square`/`story`/`banner` | download image (1200×630/1080²/1080×1920/1500×500) |
| `/image/passport` | 1 image | no fields | download 413×531 image; no face detection |
| `/image/montage` | 2–9 images | `cols`,`rows` int1–3 default2, product must equal count; `gap` 0–50 default4; `background` hex default `#ffffff` | download image |
| `/document/to-pdf` | 1 `.docx`, ≤2000 paragraphs | — | download PDF; re-rendered Latin text only |
| `/document/word-to-txt` | 1 `.docx` | — | download text |
| `/document/word-to-html` | 1 `.docx` | — | download escaped HTML |
| `/document/word-to-markdown` | 1 `.docx` | — | download Markdown |
| `/document/txt-to-pdf` | 1 UTF-8 `.txt`, ≤2000 lines | — | download PDF |
| `/document/excel-to-csv` | 1 `.xlsx` | — | download CSV, first worksheet |
| `/document/excel-to-json` | 1 `.xlsx` | — | download JSON, first row keys |
| `/document/csv-to-json` | 1 `.csv` | — | download JSON |
| `/document/csv-to-excel` | 1 `.csv` | — | download `.xlsx` |
| `/document/json-to-csv` | 1 `.json` | — | download CSV; array objects only, ≤50k rows/100 columns |
| `/document/markdown-to-html` | 1 `.md`/`.markdown`, ≤500k chars | — | download sanitized standalone HTML |
| `/document/compress` | 1 `.docx`/`.xlsx` | — | download same type (ZIP repack) |
| `/file/zip-create` | 2–20 allowed non-executable files, ≤50 MiB combined | — | download ZIP |
| `/file/rename` | 2–20 allowed non-executable files | `pattern` 1–100 and must contain `{i}`; safe charset enforced by service | download ZIP |
| `/file/folder-to-zip` | 2–20 allowed files | `paths` JSON string, parallel relative paths, no `..` | download ZIP |
| `/file/tar-create` | 2–20 allowed files, ≤50 MiB combined | — | download `.tgz` |
| `/file/tar-extract` | 1 `.tar`/`.tgz`/`.gz` | — | download ZIP; ≤50 entries/50 MiB uncompressed |
| `/file/zip-to-tar` | 1 `.zip` | — | download `.tgz` |
| `/file/tar-to-zip` | 1 `.tar`/`.tgz` | — | download ZIP |
| `/file/merge` | 2–20 matching `.txt`/`.md`/`.csv`/`.json` | — | newline-concatenated download |
| `/file/split` | 1 text file | — | download ZIP of ≤20 line chunks |
| `/file/compress` | 1 file ≤5 MiB | — | gzip download |
| `/file/base64-encode` | 1 file ≤5 MiB | — | `.b64` text download |
| `/file/base64-decode` | 1 `.txt`/`.b64`/`.md`/`.csv`/`.json` | — | raw `application/octet-stream` download |

### File-processing JSON endpoints

| Path | Upload / request | Exact success `data` |
| --- | --- | --- |
| POST `/tools/pdf/text` | multipart one PDF in `files` | `{pageCount:number,pages:string[][],charCount:number}` |
| POST `/tools/pdf/metadata` | multipart one PDF | `{title,author,subject,keywords,producer,creator,creationDate,modificationDate: string\|null,pageCount:number}` |
| POST `/tools/pdf/search` | multipart one PDF + `query` 1–200 | `{pageCount,query,matches:[{page:number,line:string≤300}]}` (≤50) |
| POST `/tools/image/metadata` | multipart one image | `{format,width,height,space,channels,depth,density: value\|null,hasAlpha,hasProfile,isProgressive:boolean,size}` |
| POST `/tools/document/metadata` | multipart one `.docx`/`.xlsx` | DOCX `{format,title,creator,subject,keywords,created,modified,application,pages,words}` or XLSX `{format,title,creator,subject,keywords,created,modified,sheets}`; metadata nullable |
| POST `/tools/file/hash` | multipart one any-extension file | `{sha256:string,sha512:string,size:number}` |
| POST `/tools/file/type` | multipart one any file | `{type:string,mime:string}`; content sniffing, not extension |
| POST `/tools/file/metadata` | multipart one file | `{name,size,declaredMime,detectedType,detectedMime,sha256,textLines}` |
| POST `/tools/file/zip-extract` | multipart one `.zip` | `{count:number,files:[{fileId,downloadUrl,name,size,mimeType}]}` |

All transform routes return `400 VALIDATION_ERROR`/route-specific bad request for bad fields, invalid bytes, unsupported extension, semantic page selection, or malformed archive; Multer gives `413 FILE_TOO_LARGE` for size gate failures. The shared handler can expose a `500` if persistence/storage/processor fails.

## 7. Request Contracts

The core request and query contracts are fully tabulated above. Important serialization rules:

- Encode query `page`, `limit`, `category`, `search`; omit optional values rather than send blank strings, because blank fails `.min(1)`.
- For multipart fields, Zod coercion converts numeric strings; send values as decimal strings. Arrays/objects are **not** native multipart arrays: `regions` and `paths` are JSON-encoded strings.
- Submit each input binary under exactly `files`, except the generic validator endpoint which requires singular `file`.
- Do not supply extra properties to `z.object({}).strict()` routes (grayscale, exif removal, favicon, passport); ordinary Zod object schemas currently strip unknown JSON/multipart text fields rather than reject them.
- All CUID identifiers should be treated as opaque strings. Do not construct IDs or infer them from display names.

## 8. Response Contracts

### Reusable data models

```ts
type ApiSuccess<T> = { success: true; data: T };
type ApiError = { success: false; error: { code: string; message: string; details?: unknown } };
type PublicUser = { id: string; email: string; name: string | null };
type FileToolResult = {
  jobId: string; fileId: string; downloadUrl: string; mimeType: string;
  size: number; expiresAt: string; // ISO-8601
};
type Page<T> = { items: T[]; page: number; limit: number; total: number };
```

`Tool` from the database is `{id,name,slug,description,icon:string|null,isActive,sortOrder,implementation,platforms:string[],requiresFile,requiresAuth,supportsOffline,categoryId,createdAt,updatedAt,category:{slug,name}}`. The static fallback tool uses the same important fields but additionally has `categorySlug` and may omit timestamps/category object: clients must not rely on a uniform fallback-only shape.

`Favorite` creation returns `{id,userId,toolId,createdAt}`. Favorite listing additionally has `tool:{id,name,slug,icon}`. `ToolHistory` returns `{id,userId,toolSlug,inputSummary,executionType|null,status,metadata|null,createdAt}`. Dates serialize to ISO 8601 strings in JSON.

Raw generated-file downloads are not envelope JSON. On a successful `GET /files/:fileId`, respect `Content-Type` and `Content-Disposition: attachment; filename="<tool>-result.<ext>"`; in browser download as Blob, in Flutter store/open bytes. Download URLs are API-relative and expire after roughly one hour.

## 9. Database Models

| Model | Fields and relationships | Frontend exposure |
| --- | --- | --- |
| User | CUID `id`; unique/indexed `email`; internal `passwordHash`; nullable `name`; created/updated; 1:N favorites/history; 1:1 subscription | only `{id,email,name}` or admin's `createdAt`; never display/store `passwordHash` |
| Category | CUID; unique `name`,`slug`; nullable description; `sortOrder=0`; `isActive=true`; 1:N tools | catalogue may return all fields |
| Tool | CUID; unique/indexed slug; name/description/icon; active/order; implementation default frontend; platforms default web/mobile; flags; required Category | return/display metadata, never assume endpoint path is derived from slug |
| Favorite | CUID; userId/toolId; created; unique compound userId+toolId; cascade both sides | available only to owner |
| ToolHistory | CUID; userId; `toolSlug`; nullable summary/executionType/metadata; status default completed; created; index user+created | owner-only; `metadata` is arbitrary JSON |
| GeneratedFile | CUID; nullable user/tool/slug; unique storageKey; original metadata; status `ready/expired/deleted`; expiration | only IDs/download metadata are returned; storageKey must never be exposed |
| Job | CUID; type/status `queued/running/done/failed`; nullable user/input/output/error/expiry; timestamps | job body may be arbitrary JSON; show error only as non-sensitive status text |
| AiUsage | CUID; userId/month; calls/tokens; unique composite | no frontend endpoint |
| Subscription | CUID; unique userId; status/tier defaults free; nullable expiry; timestamps | `status`,`tier`, and potentially `expiresAt` if a row exists |

No soft-delete field exists for User, Favorite, History, Subscription, or Job. Generated-file expiry is logical state plus temporary-storage deletion. `User.passwordHash`, `GeneratedFile.storageKey`, JWT contents, environment secrets, and potential internal Job input must not be presented as user-facing data.

## 10. Authentication

Registration/login return one JWT `token`; it contains `sub` (user ID), `email`, `iat`, and `exp`, and uses configured `JWT_EXPIRES_IN` (default `7d`). The server does not return the expiry separately. Protected calls require the exact header `Authorization: Bearer <token>`.

```text
Register or login → receive PublicUser + token
 → persist token securely → add Bearer header on protected calls
 → bootstrap with GET /auth/me or /users/me
 → 401 → clear local token/auth state and route to login
```

There is no refresh endpoint, refresh token, server-side session, password reset, verification, OTP, social login, or token revocation. `POST /auth/logout` is public/stateless; it only tells the client to discard the token. Do not implement automatic refresh/retry as though it exists.

## 11. Authorization & Roles

| Principal | API access | Frontend visibility |
| --- | --- | --- |
| Anonymous | catalogue, health, analytics, file tools/files process, generated-file download, URL tools, anonymous job read | public catalogue/tools, login/register; public transform screens |
| Authenticated user | own profile, favorites, history, subscription, own jobs | account/favorites/history/subscription UI |
| ADMIN | authenticated user whose email exactly appears in comma-separated server `ADMIN_EMAILS` | administrative tools/users screens |

There is no persisted role or permission model. The JWT is not role-bearing; the server evaluates email at each protected admin request. Hide admin navigation unless the frontend has an out-of-band reliable admin indication, but always tolerate `403`: `/auth/me` does not expose role. There is no API permission discovery endpoint.

## 12. Validation

Frontend validation should mirror the explicit constraints in sections 6–7 for usability, but backend validation remains authoritative. In particular: email validity is Zod's email rule; password only has length (no complexity rule); name cannot be blank if supplied; page/limit are positive integers; all text field limits must be respected; file sizes are binary MiB limits; allowed extensions are checked server-side but most processors also parse content.

File type security is heterogeneous: shared tools allowlist extensions and validate processors; `file/type` intentionally relies on byte sniffing; metadata/hash tools accept broad input. The frontend should prefilter MIME/extensions only as a convenience and display server errors rather than claiming an upload is valid.

## 13. Error Handling

| HTTP/code | Client action |
| --- | --- |
| 400 `VALIDATION_ERROR` | inline form/upload error; use `error.details` only in development and defensively |
| 401 `UNAUTHORIZED` | clear auth and sign in; no refresh flow exists |
| 403 `FORBIDDEN` | keep public UI usable; show access-denied and remove protected controls |
| 404 `NOT_FOUND`, `TOOL_NOT_FOUND`, `CATEGORY_NOT_FOUND`, `FILE_NOT_FOUND`, `JOB_NOT_FOUND`, `NO_WORKER` | show unavailable/not-found state; do not retry blindly |
| 409 `EMAIL_TAKEN`, `ALREADY_FAVORITED` | field/optimistic-state reconciliation |
| 410 `FILE_EXPIRED` | explain that result expired; require reprocessing |
| 413 `PAYLOAD_TOO_LARGE`, `FILE_TOO_LARGE` | block/reselect a smaller file |
| 429 `RATE_LIMITED`, `AI_QUOTA_EXCEEDED` | back off; honor standard rate-limit headers when present |
| 501 `NOT_IMPLEMENTED` | do not expose as a working feature |
| 502 `AI_PROVIDER_ERROR`, 503 `AI_NOT_CONFIGURED`, 500 `INTERNAL_ERROR` | generic recoverable error; do not surface raw internals |

Other explicit stable codes are `UPLOAD_ERROR` and `FILE_EXPIRED`. Success/error shape is consistent except raw download endpoints and the two deliberate `501` route handlers, which still use the normal error shape. Treat unexpected non-JSON/download responses as transport failures.

## 14. Pagination

Offset pagination only: `page` is one-based, `limit` has no total-page property, and response is `{items,page,limit,total}`. Calculate `totalPages = ceil(total/limit)` only in the client. Tools cap limit 50; history 50; admin 100. Favorites/categories/jobs/subscription are not paginated. Web can render numbered pages; Flutter can increment `page` while `items.length < total`, prevent duplicate fetches, and reset to page 1 on search/filter/pull-to-refresh.

## 15. Search / Filtering / Sorting

| Endpoint | Query behavior |
| --- | --- |
| `GET /tools` | `category` exact category slug; `search` case-insensitive substring over name/description/slug; DB results sort by `sortOrder` asc |
| `GET /admin/tools` | `search` case-insensitive DB substring on name/slug; sortOrder asc |
| `GET /admin/users` | `search` case-insensitive email substring; createdAt desc |

No general sorting direction, date range, status, price, or cursor filters exist. Preserve server ordering; never invent query parameter names.

## 16. File Uploads

Use `multipart/form-data`; React should append `File` objects to `FormData`, and Flutter should use multipart parts named `files` (or `file` only for `/files/process`). Do not set a manual `Content-Type` boundary. Most tools are synchronous: show an upload/processing state until response, then retain the `FileToolResult` URL. The implementation stores only generated result bytes, not input uploads; generic `/files/process` is explicitly a non-transforming MVP validator.

There is no DELETE generated-file endpoint. Results use a one-hour default TTL and are unauthenticated downloads. Files in `GeneratedFile` reference local temporary storage, not S3/GCS despite storage environment variables.

## 17. Media

There are no avatar/product/media database URLs. Image/PDF/document inputs are request-local and generated media is retrieved only through `downloadUrl`. URLs are relative, unauthenticated, and time-limited. HTML produced by markdown conversion has scripts and event handlers stripped, but if embedding it in the browser it must still be sandboxed; downloading/opening as a file is safer.

## 18. Real-Time Features

**Not found.** No WebSocket, Socket.IO, SSE, FCM/APNs, or push route/dependency exists. Jobs use client polling in principle, but no worker type ships and creation currently fails with `NO_WORKER`.

## 19. Notifications

**Not found.** No notification model, endpoint, push provider, email sender, read state, or realtime event exists. Use in-app transient toast/snackbar state only; it is client UI, not backend notification persistence.

## 20. Payments

**Incomplete / not implemented.** Subscription rows can be read, but no checkout, provider SDK, confirmation, refund, cancellation, or validated webhook exists. The public webhook route always returns 501. Do not display a purchasable plan flow based on this backend.

## 21. Dashboard & Analytics

No dashboard/statistics endpoint exists. `POST /analytics` validates and logs a limited event but persists no usage model. Admin endpoints are paged lists rather than metrics. A dashboard requiring counts/charts is **BACKEND CONTRACT MISSING**.

## 22. React Frontend Requirements

Public routes: catalogue/home, category/search list, tool detail/executor, login, register, and optional URL/file tool screens. Protected routes: profile, favorites, history, subscription. Optional admin routes must be guarded by successful server access, not a JWT role claim. Use an API layer with typed envelopes and separate Blob download handling.

Each backend tool should have a form generated from the endpoint matrix: file picker/count/type/size validation, parameter fields, submit/progress/validation error state, result download button, and expiry messaging. The ten `frontend` tools should be local-only pages; do not call an imagined processor. Use accessible inline errors, disabled duplicate submits, empty states for favorites/history/search, and confirmation before account/history deletion.

## 23. Flutter Frontend Requirements

Screens: splash/auth bootstrap; login/register; catalogue/category/search; client-local basic tool screens; backend transform screens; URL tools; favorites/history/profile/subscription; optional admin lists. Use a repository/API service layer, typed serializable models, and a state mechanism that separates persisted auth from server caches. Use secure storage for the token, a multipart-capable client, temporary/local downloaded file handling, and platform share/open flows for result bytes.

For long transformations, show indeterminate progress because no progress API exists. Pagination should avoid parallel page requests, preserve reached items, and support pull-to-refresh. Offline use is valid only for catalogue cache and tools with `supportsOffline:true`; backend transforms and authenticated state require connectivity. A download `410` must reopen/re-run the tool, not repeatedly retry.

## 24. Frontend State Requirements

| State | Scope/lifetime |
| --- | --- |
| auth token and PublicUser | global; persisted securely; validate on bootstrap |
| catalogue/categories/tool detail | server cache; category/search/page keys; can cache read-only fallback data |
| favorites/history/subscription/profile | authenticated server cache; invalidate after mutation/login/logout/delete |
| transform form/files/progress/result | route-local; never persist raw files/tokens; preserve result URL only until expiry |
| pagination/search/filter | local route state, encoded in web URL where useful |
| client-local calculator state/theme/navigation | client-local; theme may be persisted |
| admin list state | global/route server cache only when server grants access |

## 25. API Client Requirements

Configure an environment-provided origin, e.g. `API_BASE_URL=https://api.example.com/api/v1`; no production host is committed, so the real base URL is **UNKNOWN / deployment-provided**. Prefix API-relative `downloadUrl` with the API origin (not the `/api/v1` base twice). JSON requests use `Accept: application/json` and `Content-Type: application/json`; multipart sends no manually-set content type. Add Bearer only when a token exists; avoid it on public routes if not needed.

Normalize all JSON envelopes, preserve `status` and error `code`, use a user-facing network timeout (the server exposes none), and do not retry non-idempotent uploads automatically. On 401 clear session. Do not build refresh-token interceptors. Browser clients must configure CORS-compatible credentials only if needed; the API does not use cookies.

## 26. API Dependency Map

```text
App bootstrap → GET /health + GET /tools + GET /categories
                     ↓
              catalogue/category/search screens

Login/Register → POST /auth/login or /auth/register → token + PublicUser
                     ↓
          GET /auth/me or /users/me → authenticated application state
                     ├→ favorites/history/subscription/profile
                     └→ optional analytics events

Backend tool form → POST /tools/<family>/<tool> multipart
                     ↓
             FileToolResult.downloadUrl → GET /files/:fileId → bytes/download

Favorite toggle → POST /favorites / DELETE /favorites/:toolId → invalidate GET /favorites
History action → POST /history → invalidate GET /history
```

## 27. User Flows

**Registration/login:** validate locally → submit → persist token only after success → set public user → fetch `/auth/me`/`/users/me` → enter catalogue. On any later 401, clear local auth and prompt to sign in.

**File transform:** select allowed file(s) → validate count/size/parameters locally → submit multipart → wait synchronously → if JSON, display/copy metadata; if `FileToolResult`, immediately offer download/share and label its one-hour expiry → optionally record history only when signed in. The backend does not automatically create history.

**Catalogue/favorites:** load public catalogue → signed-in user opens favorites → create/delete using opaque tool ID (not slug) → reconcile duplicate `409 ALREADY_FAVORITED` as already selected.

**Profile deletion:** warn about cascade of favorites, history, subscription → DELETE `/users/me` → clear token/cache and return to public screen. There is no undo.

## 28. Loading / Empty / Error States

| Feature | Loading | Empty | Success/error |
| --- | --- | --- | --- |
| catalogue/search | skeleton/list spinner | no matching tools | retry transport/500; 400 for malformed query is a client bug |
| auth | button pending | n/a | 409 email inline; 401 generic credentials; 429 cooldown |
| favorites/history | page spinner | explain no saved/recent tools | mutate optimistically only if rollback is implemented; 401 logout |
| processor | file upload/processing indicator | n/a | show download/copy result; 400/413 parameter/file message; 500 retry manually |
| download | downloading indicator | expired is not empty | 410 asks user to rerun tool; 404 unavailable |
| subscription/admin/jobs | spinner | default free/no jobs/no records | 403 hide/admin explanation; jobs creation currently 404 NO_WORKER |

## 29. Environment Configuration

| Variable | Purpose | Frontend needs it? |
| --- | --- | --- |
| `NODE_ENV` | server behavior/error detail | no |
| `PORT` | server listener, default 4000 | no (except local base URL) |
| `DATABASE_URL` | PostgreSQL | no |
| `JWT_SECRET` | signing secret, ≥32 chars | never |
| `JWT_EXPIRES_IN` | JWT validity, default 7d | not required; UI may state session expired only on 401 |
| `CORS_ORIGIN` | allowed web origins | deployment team must configure it; web client needs matching origin |
| `STORAGE_ENDPOINT/BUCKET/ACCESS_KEY/SECRET_KEY` | planned object storage | no; currently unused by storage adapter |
| `AI_API_URL/KEY/MODEL/MONTHLY_TOKEN_LIMIT` | future server AI gateway | no |
| `ADMIN_EMAILS` | admin allowlist | no; never send to client |
| frontend `API_BASE_URL` | deployment API origin/version base | yes |

## 30. Security Requirements

Use HTTPS in production. Never send/store DB/storage/JWT/AI secrets in either client. React should prefer an in-memory token with a deliberate persistence strategy; browser localStorage increases XSS exposure, while this backend has no httpOnly-cookie option. Flutter must use OS-backed secure storage, never SharedPreferences for the token. Do not put tokens in URLs, logs, analytics event fields, download names, or crash reports.

Treat server error text as displayable but never executable; sanitize any generated/remote HTML. Respect file limits before upload, but rely on server validation. CORS is configured server-side and credentials are enabled even though auth is header-based; deployment must use a concrete CORS allowlist rather than `*` when credentials are involved. There is no CSRF mechanism because no cookie-authenticated state exists. Rate-limit backoff must not retry credential or upload requests aggressively.

## 31. API Contract Problems

| Problem | Location | Expected/documented | Actual source-confirmed behavior | Frontend impact / recommendation |
| --- | --- | --- | --- | --- |
| Result storage is process-local | `lib/storage.ts`, `execute.ts` | Generated result download URL appears durable until TTL | temp storage index is in memory; restart/another instance loses bytes while DB row remains | display result/download promptly; deployment needs shared storage before multi-instance use |
| Cleanup scheduler is not started | `lib/cleanup.ts`, `server.ts` | expired files should be purged | scheduler exists but server never calls it | do not assume physical immediate deletion; result remains logically expired |
| Tool shape differs in DB fallback | `tools.service.ts`, registry | Tool list type should be uniform | fallback has `categorySlug`, may omit `category`/timestamps; DB supplies relation/timestamps | type UI by stable common fields; defensive category label fallback |
| Catalogue fallback is incomplete | registry versus executor mounts | tool executor routes exist | registry is static and may not contain every executor/tool until seed data matches current source | route availability is not a guarantee catalogue returns item; do not derive capabilities only from one source |
| `PATCH /users/me {name:null}` cannot clear name | `users.routes.ts` | schema explicitly accepts null | handler converts null to `undefined`, leaving current name unchanged | do not present “clear name” as working; backend fix required |
| No role signal | auth responses | admin UI could conditionally render | PublicUser has no role/admin flag; admin is server env email gate | hide admin by default and respond to 403; add `/me` role if needed |
| Jobs are publicly scaffolded but unusable | `jobs.routes.ts` | job API implies async work | no registered handler ships, so all create attempts 404 `NO_WORKER` | do not expose job submission/polling as feature |
| Files and generated results have inconsistent field names | `/files/process` vs file tools | one upload abstraction | generic route uses `file` and returns stub metadata; tools use `files` and real result envelope | model them as separate client operations |
| No admin writes | category/admin routes | admin navigation might imply CRUD | category writes return 501; `/admin` only lists | read-only admin screens only |
| Open generated downloads | `GET /files/:fileId` | personal output might be private | no auth or ownership check | treat URL as capability-like; avoid exposing/share logging IDs; backend should add ownership if privacy is required |

## 32. Missing Backend Features

| Status | Needed capability | Evidence |
| --- | --- | --- |
| MISSING | token refresh/revocation/password reset/verification/social login | auth routes contain none; logout is stateless |
| MISSING | current-user role/permissions | no User role field or permission endpoint |
| MISSING | generated file deletion/renewal and durable shared object storage | only GET download; storage implementation is local temp/in-memory index |
| MISSING | admin mutations | deliberate 501 category stubs and read-only admin router |
| MISSING | dashboard metrics and persisted analytics | analytics logs only; no usage event model |
| MISSING | notifications/realtime/push | no model/dependency/routes |
| MISSING | payments/checkout/provider webhook validation | subscription webhook is 501 |
| MISSING | working job processor/progress/cancel | handler registry is empty |
| RECOMMENDED | pagination for favorites/jobs/categories if data grows | current lists are unbounded (except jobs 50) |
| OPTIONAL | profile avatar/change-password | no current model/UI contract requires either |

## 33. Complete Frontend Contract

- **Base URL:** deployment-supplied `{origin}/api/v1`; public liveness is `{origin}/health`.
- **Envelope:** success `{success:true,data}`; errors `{success:false,error:{code,message,details?}}`.
- **Auth:** JWT Bearer; no cookies/refresh. `PublicUser = id,email,name|null`.
- **Roles:** anonymous, authenticated owner scope, environment-email ADMIN only.
- **Models:** PublicUser, Category, Tool, Favorite, ToolHistory, Subscription, Generated-file result, Job as specified above.
- **Pages:** public catalogue/tool/executor/auth; signed-in profile/favorites/history/subscription; conditional read-only admin.
- **Pagination/search:** one-based `page` + capped `limit`; only tools/admin/history support it; tools has category/search.
- **Uploads:** multipart `files`, 10 MiB each normally; result responses have relative one-hour `downloadUrl`; generic validator is `file` and is a stub.
- **Real-time/notifications/payments:** no usable contract.
- **Do not invent:** request fields, a refresh endpoint, a dashboard, notification settings, payments, roles, a delete-file endpoint, or a processor for frontend tools. Report **BACKEND CONTRACT MISSING** when one is required.

## 34. React Implementation Checklist

- [ ] Configurable API origin and envelope/error normalization
- [ ] Bearer auth storage/bootstrap/logout-on-401 (no refresh flow)
- [ ] Register/login/profile/delete-account screens and validations
- [ ] Catalogue/category/search/detail with correct pagination
- [ ] Local implementations for `implementation:"frontend"` tools
- [ ] Generic multipart executor forms from the tool matrix
- [ ] Blob/raw-download handler and expiry UX
- [ ] Favorites/history/subscription server state + empty/error states
- [ ] Analytics event caller using only allowlisted event names
- [ ] Optional read-only admin lists with 403 handling
- [ ] Accessible loading/error/429/file-size states

## 35. Flutter Implementation Checklist

- [ ] Environment-configured API origin, typed envelopes/models
- [ ] Secure token storage and 401 logout flow
- [ ] Splash identity bootstrap, login/register/profile screens
- [ ] Catalogue/category/search and page/infinite-scroll state
- [ ] Local frontend-tool calculators/generators
- [ ] Multipart upload forms with client prechecks and server error rendering
- [ ] Temporary-file download, open/share, and expiry handling
- [ ] Favorites/history/subscription repositories/caches
- [ ] Pull-to-refresh and connectivity-aware offline boundaries
- [ ] Conditional read-only admin feature; no payment/notification/jobs UI

## 36. Frontend AI Agent Handoff

Build against the `utilza_backend` REST API described in this file. Set a deployment-provided base URL ending in `/api/v1`, unwrap `success.data`, and normalize `success:false.error`. Authenticate only with the JWT returned by `/auth/register` or `/auth/login`, placed in a Bearer header. There is no refresh, cookie, password reset, role endpoint, websocket, notification, payment, or working job worker.

Use catalogue metadata to decide whether a tool is local (`implementation:"frontend"`) or a backend executor. For backend executors use the exact POST path, `files` multipart field, file counts, and text parameters in the matrix; download outputs with the returned relative `downloadUrl` before its one-hour TTL. Use opaque IDs exactly as returned, preserve server validation/error codes, and do not infer endpoints from slugs. Only offer owner-scoped favorites/history/profile features after login; expose admin read pages only after server authorization succeeds. If a desired workflow lacks an endpoint or field, report **BACKEND CONTRACT MISSING** instead of creating a client-side API contract.
