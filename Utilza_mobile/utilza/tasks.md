# Utilza Flutter App — Build Tasks

Source of truth: `UTILZA_FLUTTER_AI_AGENT_SPEC.md` + `BACKEND-FRONTEND-INTEGRATION-SPEC.md` + `API.md`.
Base: `/api/v1`. Health: `{origin}/health` + `GET /api/v1/health`.
Current project state: fresh template (`lib/main.dart` counter app, Dart `^3.13.4`, only `cupertino_icons`).

> Non-negotiables: do NOT invent endpoints/fields, no refresh-token flow, no cookie auth, JWT in `flutter_secure_storage` only (never `SharedPreferences`), no payments/push/realtime/jobs UI, no local admin role, download URLs expire ~1h, no auto-retry of multipart uploads, backend validation is authoritative. If capability missing → report `BACKEND CONTRACT MISSING`.

---

## Phase 0 — Verify & Clean Template

- [x] 0.1 Run `flutter --version`, `flutter pub get`, `flutter analyze` to confirm baseline passes.
- [x] 0.2 Delete template counter from `lib/main.dart`. Keep `main.dart` as bootstrap entry only.
- [x] 0.3 Confirm platforms: `android/`, `ios/`, `linux/`, `macos/`, `web/`, `windows/` exist; mobile target is Android/iOS.

## Phase 1 — Project Foundation

- [x] 1.1 Add dependencies (versions compatible with SDK `^3.13.4`):
  - `dio`, `flutter_secure_storage`, `file_picker`, `path_provider`, `share_plus`, `open_filex`, `connectivity_plus`, `json_annotation` + `freezed`/`json_serializable` (dev: `build_runner`), state mgmt: `flutter_riverpod` OR `flutter_bloc` (pick one, use everywhere).
  - Router: `go_router` (or document custom `app/router.dart`).
- [x] 1.2 Create folder skeleton per spec:
  ```
  lib/core/{constants,errors,network,storage,routing,utils,widgets}
  lib/features/{auth,catalogue,categories,tools,favorites,history,profile,subscription,analytics,admin}/{data,domain,presentation}
  lib/app/{app.dart,router.dart,theme.dart}
  ```
- [x] 1.3 `lib/app/theme.dart`: Material 3 theme (light+dark), loading/empty/error text styles.
- [x] 1.4 `lib/app/router.dart`: Splash → Home; public routes (Home/Catalogue, Category, Search, ToolDetail, LocalExecutor, BackendExecutor, Login, Register); guarded routes (Profile, Favorites, History, Subscription); optional Admin. Unauthenticated access to guarded route → redirect to Login.
- [x] 1.5 `lib/app/app.dart`: wire theme + router + state provider + connectivity listener.
- [x] 1.6 `lib/core/constants/`: `api_constants.dart` (`{origin}/api/v1` from `--dart-define API_BASE_URL`, never hardcode prod URL), `error_codes.dart`, `analytics_events.dart`.
- [x] 1.7 Env resolution util: resolve relative `downloadUrl` (e.g. `/api/v1/files/abc`) against server **origin**, not by appending to `/api/v1` (avoid `/api/v1/api/v1/...`).

## Phase 2 — Network Layer

- [x] 2.1 `lib/core/network/api_client.dart`: centralized Dio client — baseUrl, `Accept/Content-Type: application/json` for JSON, no manual multipart boundary, JWT injection (`Authorization: Bearer <token>` only if present), timeouts (sensible UX value, no backend contract), envelope parsing, error normalization, download-bytes support, no auto-retry for login/register/uploads/transform POSTs.
- [x] 2.2 Envelope models: `ApiSuccess<T> {success,data}`, `ApiError {success, error:{code,message,details?}}`. Dev-only `details` support; prod expects `code+message`.
- [x] 2.3 `lib/core/errors/`: `ApiException`, `ErrorMapper` table:
  `400 VALIDATION_ERROR→field error`, `401 UNAUTHORIZED→clear token→login`, `403 FORBIDDEN→hide/denied`, `404 NOT_FOUND/TOOL_NOT_FOUND/CATEGORY_NOT_FOUND/FILE_NOT_FOUND/JOB_NOT_FOUND/NO_WORKER`, `409 EMAIL_TAKEN/ALREADY_FAVORITED`, `410 FILE_EXPIRED→"run again"`, `413 PAYLOAD_TOO_LARGE/FILE_TOO_LARGE`, `429 RATE_LIMITED/AI_QUOTA_EXCEEDED`, `500 INTERNAL_ERROR`, `501 NOT_IMPLEMENTED→unavailable`, `502 AI_PROVIDER_ERROR`, `503 AI_NOT_CONFIGURED`. Never show stack traces.
- [x] 2.4 `lib/core/storage/secure_token_storage.dart`: JWT via `flutter_secure_storage`. Never log/URL/analytics/crash-report/display JWT.
- [x] 2.5 401 interceptor: on 401 → delete token + clear auth cache → unauthenticated state.
- [x] 2.6 Multipart helper: default field name `files`; exception `file` only for `POST /api/v1/files/process`. Client pre-validates extension/count/size/params; backend authoritative.
- [x] 2.7 Download helper: GET `/api/v1/files/:fileId` returns raw bytes (not JSON); respect `Content-Type/Content-Disposition`; save temp file; handle `410 FILE_EXPIRED`, `404`.

## Phase 3 — Typed Models

- [x] 3.1 Create: `PublicUser{id,email,name}`, `Category{...,slug,sortOrder}`, `Tool{id,name,slug,description,icon,isActive,sortOrder,implementation,platforms,requiresFile,requiresAuth,supportsOffline,categoryId,createdAt,updatedAt,category{slug,name}}`, `Favorite{id,userId,toolId,createdAt,tool{id,name,slug,icon}}`, `ToolHistory{...}`, `Subscription{status,tier,...}`, `FileToolResult{jobId,fileId,downloadUrl,mimeType,size,expiresAt}`, `Job`, `Pagination<T>{items,page,limit,total}`, plus JSON-result models (pdf-text, pdf-metadata, pdf-search, image-metadata, doc-metadata, file-hash/type/metadata, zip-extract list, url-status/metadata/dns/ssl).
- [x] 3.2 ISO-8601 → `DateTime`; IDs opaque strings (no CUID parsing); nullable fields defensive (fallback catalogue may differ).

## Phase 4 — Authentication (`/auth/*`, `/users/me`)

- [x] 4.1 `AuthRepository` + datasource: `POST /api/v1/auth/register {email≤255,password 8-128,name? 1-100} → 201 {user,token}`; errors `400/409 EMAIL_TAKEN/429`.
- [x] 4.2 Login: `POST /api/v1/auth/login {email,password} → 200 {user,token}`; `401` generic message (don't reveal email existence).
- [x] 4.3 Logout: `POST /api/v1/auth/logout → {loggedOut:true}` (no revocation). Always delete local token + clear auth cache even on failure.
- [x] 4.4 Bootstrap (Splash): read token → if none → unauthenticated; if present → `GET /api/v1/auth/me → {id,email,name}` (also `GET /api/v1/users/me`) → success=authenticated, 401=delete→unauthenticated. States: `initializing/unauthenticated/authenticated/authError`.
- [x] 4.5 UI: Splash, Login, Register (client UX validation + server errors), button loading states, no password-reset/social/OTP/verify UI.

## Phase 5 — Catalogue

- [x] 5.1 `GET /api/v1/categories` (active only, `sortOrder`); `GET /api/v1/categories/:slug` (`404 CATEGORY_NOT_FOUND`); cache for offline.
- [x] 5.2 `GET /api/v1/tools?category&search&page&limit` (omit empty optionals; `page≥1`, `limit 1-50`; `category`=exact slug, `search`=substring name/desc/slug). Response `{items,page,limit,total}`; `totalPages=ceil(total/limit)`; dedupe page reqs, preserve items, pull-to-refresh, reset to page 1 on filter change, no cursor pagination.
- [x] 5.3 UI: Home/Catalogue (skeleton loading), Category screen, Search screen (`search_performed` analytics), ToolDetail routing by `implementation`: `frontend`→LocalExecutor (never call backend), `backend`→BackendExecutor. Never derive endpoint from slug.

## Phase 6 — Favorites / History / Profile / Subscription

- [ ] 6.1 Favorites (auth): `GET /api/v1/favorites → {items[]}`; `POST /api/v1/favorites {toolId: tool.id — NOT slug} → 201` (`404 TOOL_NOT_FOUND`, `409 ALREADY_FAVORITED→reconcile`); `DELETE /api/v1/favorites/:toolId → {deleted:true}` (idempotent). Empty: "No favorite tools yet."
- [ ] 6.2 History (auth): `GET /api/v1/history?page&limit → {items newest-first,page,limit,total}`; `POST /api/v1/history {toolSlug,inputSummary≤500, no raw files/secrets}` (Flutter must call explicitly; backend doesn't auto-create); `DELETE /api/v1/history → {deleted:true}`. Empty: "No recent tools."
- [ ] 6.3 Profile: `GET /api/v1/users/me`; `PATCH /api/v1/users/me {name 1-100}` — do NOT offer "clear name" (null accepted but not cleared). `DELETE /api/v1/users/me → {deleted:true}` with confirm dialog → clear JWT+cache → public state.
- [ ] 6.4 Subscription (read-only): `GET /api/v1/subscriptions/me` or `{status:free,tier:free}`. Empty: "You are currently on the free plan." No checkout/cancel/refund UI. `POST /api/v1/subscriptions/webhook → 501` — never expose.

## Phase 7 — Local (Frontend) Tools

- [ ] 7.1 `LocalToolRunner`: if `implementation==frontend` execute on-device only, no fake API calls; analytics optional; history only via real `POST /history`. Tool list driven by catalogue, not hardcoded.

## Phase 8 — Backend Executor Framework (reuse for all §21-25)

- [ ] 8.1 `ToolExecutorConfig{endpoint,method,fileField,minFiles,maxFiles,allowedExtensions,fields,resultType}` with **exact** route map (never slug-derived).
- [ ] 8.2 Generic `BackendToolScreen`: title/desc, file_picker, file list + count/ext/size validation, tool fields, submit (disabled while processing), indeterminate progress, result section, download/open/share, expiry note, error + rerun. No progress API.
- [ ] 8.3 Result router: JSON-result tools → structured UI; file-result tools → `FileToolResult` → download flow. Never assume `FileToolResult`.
- [ ] 8.4 Post-exec: if authed → `POST /history`; fire `tool_opened/tool_completed/tool_failed/file_uploaded/result_downloaded/result_copied` as appropriate.

## Phase 9 — Backend Tools (exact contracts; multipart `files` unless noted)

### 9.1 PDF — `POST /api/v1/tools/pdf/*`
- [ ] merge (2-20 PDFs → PDF) | split (1 PDF + `ranges` e.g. `1-3,5`, 1-200 expr, ≤500 pages) | compress (1 PDF, metadata stripped) | to-word (1 PDF ≤200p → .docx text-only) | from-image (1-10 PNG/JPG/JPEG → A4 PDF) | rotate (1 PDF, `angle 90|180|270`, opt `ranges`, absolute) | delete-pages (1 PDF + `ranges`, can't delete all) | watermark (`text 1-100`, `opacity 0.05-0.5 d0.15`, `size 12-144 d48`) | number-pages (`format n-of-total|n`, `size 8-36 d10`) | header-footer (≥1 of `header/footer 1-200`, opt `size 8-36`) | reorder (`order` e.g. `3,1,2`, all pages exactly once) | duplicate (`ranges`, `times 1-10 d1`) | flatten (metadata preserved) | redact (`regions` JSON `[{page,x,y,w,h}]` ≤100 — label "visual cover only, text still extractable") | to-image (`format png|jpg`, opt `pages`, `scale 1-3 d2`, ≤20p → ZIP) | sign (1 PDF+1 sig PNG/JPG, `page d1,x d50,y d50,width d150` — "image stamp, not cryptographic") | text (JSON `{pageCount,pages,charCount}`, no download) | metadata (nullable fields) | search (`query 1-200` → ≤50 matches) | metadata-edit (≥1 of `title/author/subject/keywords/producer/creator` ≤500; `""`=clear, omitted=unchanged)

### 9.2 Image — `POST /api/v1/tools/image/*`
- [ ] compress (`quality 1-100 d80`, same format) | convert (`format png|jpg|webp`) | resize (≥1 `width/height 1-8000`, keep ratio, no upscale) | crop (`left/top/width/height` in-bounds) | rotate (`90|180|270`) | flip (`horizontal|vertical`) | grayscale (no fields) | blur (`sigma 0.3-50 d5`) | sharpen (`sigma 0.5-10 d1`) | brightness (`level 0.1-3 d1.2`) | contrast (`level 0.1-3 d1.2`) | pixelate (`blocks 4-100 d20`) | watermark (`text 1-100`, `position top-left/top-right/bottom-left/bottom-right/center`, `opacity 0.05-0.8 d0.5`, `size 8-144 d24`) | exif-remove | favicon (→ZIP 16/32/48/180/192+manifest) | social (`preset og1200x630/square1080/banner1500x500/story1080x1920`) | passport (→413x531 center crop, no face detect) | montage (2-9 files, `cols 1-3 d2,rows 1-3 d2,gap 0-50 d4,background hex d#ffffff`, files==cols×rows) | metadata (`format,width,height,space,channels,depth,density,hasAlpha,hasProfile,isProgressive,size`)

### 9.3 Document — `POST /api/v1/tools/document/*`
- [ ] to-pdf (1 .docx ≤2000 paras, Latin-only, no tables/images) | word-to-txt | word-to-html (escaped) | word-to-markdown | txt-to-pdf (UTF-8 .txt ≤2000 lines) | excel-to-csv (.xlsx first sheet, no .xls) | excel-to-json (row1=keys) | csv-to-json | csv-to-excel (→.xlsx) | json-to-csv (array-of-objects, ≤50k rows/100 cols) | markdown-to-html (.md/.markdown ≤500k chars, strip scripts, sandbox webview) | metadata (.docx/.xlsx) | compress (.docx/.xlsx → same type)

### 9.4 File — `POST /api/v1/tools/file/*`
- [ ] zip-create (2-20, 50MB, block exe) | zip-extract (1 .zip → JSON `{count,files[{fileId,downloadUrl,name,size,mimeType}]}`, ≤50 entries/50MB) | hash (→`{sha256,sha512,size}`, not stored) | type (sniffed `{type,mime}`: png/jpeg/webp/gif/pdf/zip/docx/xlsx/pptx/mp3/mp4/text/unknown) | metadata (`name,size,declaredMime,detectedType,detectedMime,sha256,textLines`) | merge (2-20 same txt/md/csv/json) | split (1 text → ZIP ≤20 chunks) | compress (≤5MB → gzip) | base64-encode (≤5MB → .b64) | base64-decode (.txt/.b64/.md/.csv/.json → bytes) | rename (2-20 + `pattern` must contain `{i}` e.g. `document-{i}` → ZIP) | folder-to-zip (2-20 + `paths` JSON rel-path array, no `..`) | tar-create (2-20, 50MB → .tgz) | tar-extract (.tar/.tgz/.gz ≤50/50MB → ZIP) | zip-to-tar (→.tgz) | tar-to-zip (→ZIP)

### 9.5 URL — JSON (not multipart) `POST /api/v1/tools/url/*`
- [ ] status `{url≤2000}` → `{url,ok,status,finalUrl,redirects,contentType,size}` (public http/https only, no creds/private-IP/IP-literal, 10s timeout, ≤5 redirects, 1MiB) | metadata `{url}` → `{url,title,description,openGraph}` (HTML only) | dns `{domain bare, no IP}` → `{domain,a,aaaa,mx,txt,ns}` | ssl `{domain}` → `{domain,subject,issuer,validFrom,validTo,daysLeft,fingerprint256}` (port 443)

### 9.6 Stubs — do NOT productize
- [ ] `POST /api/v1/files/process` (field `file` singular, png/jpg/jpeg/webp/pdf ≤10MB → `{jobId,originalName,ext,size,note}`) = validation stub only. Jobs `POST/GET /api/v1/jobs`, `GET /api/v1/jobs/:id` → `404 NO_WORKER` — no UI.

## Phase 10 — Download / Share / Open

- [ ] 10.1 Download bytes → temp file (`path_provider`), open (`open_filex`), share (`share_plus`), `result_downloaded` analytics. Don't persist URL as artifact; re-download promptly.
- [ ] 10.2 Expired flow: `410 FILE_EXPIRED` → "This result has expired. Please run the tool again." + Run Again (no tight retry). No delete-file endpoint.

## Phase 11 — Analytics & Health

- [ ] 11.1 `POST /api/v1/analytics` (public, no PII): events `tool_opened|tool_completed|tool_failed|file_uploaded|result_downloaded|result_copied|tool_favorited|search_performed`; platform `android|ios` (never `web` from app). Fire-and-forget, never block UX.
- [ ] 11.2 Optional diagnostics: `GET /health`, `GET /api/v1/health` (`db:false` = alive but DB down).

## Phase 12 — Admin (optional, read-only)

- [ ] 12.1 `GET /api/v1/admin/tools?page&limit&search`, `GET /api/v1/admin/users?page&limit&search` (limit ≤100). Gate by attempting call; on `403 FORBIDDEN` hide. Never local-role/email check. No CRUD (category writes → `501`).

## Phase 13 — Testing & Polish

- [ ] 13.1 API tests: envelope parse, error parse, 401 clears token, Bearer header, `files` vs `file` field names, query serialization (omit empties), download bytes + expiry.
- [ ] 13.2 Auth tests: register/login/logout/token persist/bootstrap/expired/401-logout.
- [ ] 13.3 Catalogue/fav/history tests: categories, pagination, search, filter, empty; fav load/add/delete/dup; history load/paginate/create/clear.
- [ ] 13.4 Tool tests (≥1 each): PDF, Image, Document, File, URL + JSON-vs-file result routing.
- [ ] 13.5 Widget tests: loading/skeleton, success, empty, validation, server error, retry, unauth redirect.
- [ ] 13.6 Polish: offline banner (`connectivity_plus`; backend tools + authed state need connectivity; cached catalogue + `supportsOffline`/local tools can work offline), a11y, perf, `flutter analyze` clean, no secrets in repo.

---

## Definition of Done (from §53)

- [ ] Base URL configurable; origin-relative download resolution correct
- [ ] Central envelope + error parsing; 401 clears auth; no refresh logic
- [ ] JWT in secure storage, Bearer attached; register/login/logout/profile/delete work
- [ ] Categories/catalogue/search/pagination work; frontend tools local-only
- [ ] All §9 executors work; `files` used (except validator `file`); client+server validation shown
- [ ] JSON vs file results handled; downloads + open/share work; expiry handled
- [ ] Favorites/history work; subscription read-only; analytics allowlisted only
- [ ] No payments/notifications/jobs UI; admin server-gated; no secrets; tests green
