# Utilza Web App — Full Build Tasks

**Source specs:** `WEB_APP_REQUIREMENTS.md` + `API.md` in this folder.
**Stack:** React (JavaScript) + Vite, React Router, Axios, TanStack Query, React Hook Form, Zod, Tailwind CSS, Lucide React, Zustand (session/UI only), date-fns.
**API base:** `/api/v1` via `VITE_API_BASE_URL`. Envelope: success `{success:true,data:{}}`, error `{success:false,error:{code,message,details?}}`. Auth: `Authorization: Bearer <jwt>`.
**Scope rule (non-negotiable):** Do NOT build UI for: payment checkout, password reset, email verification, social login, notifications center, persistent generated-file history/library, category create/edit/delete UI, production job submission/listing UI, analytics dashboards/charts, invoices, MFA/profile-picture/email-change/password-change. Backend returns `501 NOT_IMPLEMENTED` for category writes and subscription webhook — never expose them as working flows.

---

## Phase 0 — Project Foundation (done)

- [x] **0.1 Scaffold Vite React (JS) app** in this folder (keep `WEB_APP_REQUIREMENTS.md`, `API.md`, `tasks.md` at root; app source under `src/` per §43).
- [x] **0.2 Install dependencies:** `react-router-dom axios @tanstack/react-query react-hook-form zod tailwindcss lucide-react zustand date-fns`. Do NOT add charting, payment, WebSocket, upload-resume, rich-text libs.
- [x] **0.3 Configure Tailwind + design tokens** (§13): `primary/primary-hover, accent, canvas, surface, surface-subtle, text/text-muted, border, success, warning, danger, info`. Spacing scale 4/8/12/16/24/32/48/64, radii 6/10/16/pill, Inter or system sans, mono stack for hashes/IDs/DNS/cert values. Verify WCAG 2.2 AA contrast.
- [x] **0.4 Env config:** `VITE_API_BASE_URL` (dev default `/api/v1` only with local proxy). No secrets in `VITE_*`.
- [x] **0.5 Axios client (`src/lib/api-client.js`):**
  - [x] Base URL from env, JSON Content-Type for JSON only, never set multipart Content-Type manually.
  - [x] Attach `Bearer` only when token exists (public tools work anonymous).
  - [x] ~30s timeout, AbortController support; do NOT cancel in-flight transform (no backend cancel).
  - [x] Normalize errors to `{status, code, message, details}`; treat `GET /files/:fileId` as binary, not JSON.
  - [x] Error-code mapping per §25 (400/401/403/404/409/410/413/429/501/5xx + `EMAIL_TAKEN`, `ALREADY_FAVORITED`, `FILE_EXPIRED`, `TOOL_NOT_FOUND`, `CATEGORY_NOT_FOUND`).
- [x] **0.6 Query client (`src/app/query-client.js`):** stale times — catalog/categories several minutes; admin lists short; tool transforms = mutations only (no caching, 1h expiry, no list API). Query keys per §26: `categories`, `tools({category,search,page,limit})`, `tool(slug)`, `me`, `favorites`, `history({page,limit})`, `subscription`, `adminTools(...)`, `adminUsers(...)`.
- [x] **0.7 Session store (Zustand or context, `src/stores/session.js`):** token + session user only (+ theme/drawer/ephemeral result state). Server data stays in TanStack Query; forms in RHF/local state; filter/page in URL. Decide memory-only token vs persisted (document XSS risk; backend = Bearer only, no HttpOnly cookies).
- [x] **0.8 App bootstrap (`src/app/`):** providers (Router, Query, Toast, ErrorBoundary), `ErrorBoundary`, `ToastRegion` (success/error/warning/info, `aria-live`), skip link.
- [x] **0.9 Folder structure** exactly per §43 (`app, assets, components/ui|feedback|layout|tool-ui, features/*, hooks, layouts, lib, pages, routes, services, stores, styles, utils`). Feature owns its hooks/forms/components/tests; shared primitives never import feature services.
- [x] **0.10 Verify:** `npm run dev` boots, API health check `GET /api/v1/health` reachable, 404/500/network error pages render.

## Phase 1 — Design System, Shell, Routing, Guards (done)

- [x] **1.1 UI primitives (`src/components/ui/`):** Button, Input, Textarea, Select, Checkbox/Radio, Badge, Card, Dialog (focus trap, Escape, restore focus), Drawer, Tabs, Tooltip, Pagination.
- [x] **1.2 Feedback (`src/components/feedback/`):** Skeleton, EmptyState, ErrorPanel (retry), InlineError, Progress (indeterminate — no backend progress API), ToastRegion.
- [x] **1.3 Layout (`src/components/layout/`):** `AppShell` (skip link, header, context nav, main landmark, footer), `GlobalHeader` (logo, Tools, Categories menu, Search, Favorites-if-authed, Account menu, Admin-link-only-after-probe), `AccountNav`, `AdminNav`, `PageHeader`, `Breadcrumbs`, `Footer` (only supplied links, no invented links).
- [x] **1.4 Layouts (`src/layouts/`):** PublicLayout, AccountLayout (left sub-nav desktop / tab-drawer mobile), AdminLayout.
- [x] **1.5 Routes (`src/routes/`):** implement §8 table exactly:
  - [x] `/` landing, `/tools`, `/tools/category/:categorySlug`, `/tools/:slug`, `/login`, `/register`, `/app/home|favorites|history|account|subscription`, `/admin/tools|users`, `/401 /403 /404 /500 /offline`, `*` → 404.
  - [x] Public-only guard (login/register redirect authed → `/app/home` or safe `returnTo`); Bearer guard (`/app/*` → login with `returnTo`); Admin gate (probe admin endpoint, render 403 on denial, hide nav after 403).
- [x] **1.6 Guards/components:** `AuthGate` (session-check skeleton → render/redirect), `AdminGate` (API-backed probe), `GlobalSearch` (debounced ~300ms, navigates to `/tools?search=`).
- [x] **1.7 Error pages (§42):** 401 "session ended"→Sign in; 403→tools/home; 404→Browse tools; 500→Retry; offline→Retry; file-expired→Return to tool. No stack traces.
- [x] **1.8 Responsive shell (§34):** ≥1280 full header + 2-col workspace + 3–4 cards; ≥1024 2–3 cards, tables stay tables; 768–1023 stacked workspace, scrollable filter rail; 320–767 drawer nav, 1-col, tables→cards, dialogs→bottom-sheet/fullscreen, full-width result buttons, sticky Run when safe.
- [x] **1.9 Accessibility baseline (§35):** landmarks, heading order, labels, focus indicator, keyboard-operable dropzone (real file input), `aria-live` submit errors, `aria-busy`, icon-only accessible names, semantic tables + labeled card fallback, never color-only state, `prefers-reduced-motion` 150–200ms only.

## Phase 2 — Discovery (Landing, Catalog, Category, Tool Metadata) (done)

- [x] **2.1 Services + hooks:**
  - [x] `services/catalog-service.js`: `GET /categories`, `GET /categories/:slug` (in-page 404 on `CATEGORY_NOT_FOUND`), `GET /tools?category=&search=&page=&limit=` (limit 1–50 default 20), `GET /tools/:slug` (in-page not-found on `TOOL_NOT_FOUND`).
  - [x] Hooks: `useCategoriesQuery`, `useToolsQuery`, `useToolQuery`, URL-synced params (`search, category, page, limit`; reset page=1 on filter change).
- [x] **2.2 Components:** `CategoryRail`, `CategoryChip`, `ToolCard` (name/slug/desc/icon/category/implementation/requiresFile/requiresAuth/supportsOffline — never price/popularity), `ToolGrid`, `ToolBadgeSet` (local/server, file/no-file, auth, offline), `CatalogFilters` (search max100 + category chips + clear + active-count), `CatalogPagination` (numbered desktop / prev-next+indicator mobile, uses `total/page/limit`, no infinite scroll), `FavoriteButton` (authed-only, else login prompt).
- [x] **2.3 Landing `/`:** hero + catalog search → `/tools?search=...`; category-chip rail (`GET /categories`); featured grid (`GET /tools?limit=20`, frontend subset — do NOT claim popularity); trust/limitations panel; skeleton cards; retry block; catalog-unavailable diagnostic state.
- [x] **2.4 Catalog `/tools`:** heading, search (300ms debounce), category filter, clear, responsive grid, pagination footer; skeleton grid; "No tools match" empty + clear/browse actions; retryable error; no full-shell spinner post-initial.
- [x] **2.5 Category `/tools/category/:categorySlug`:** header from `GET /categories/:slug` (name/description), tool list `GET /tools?category=:slug`; invalid slug → in-page 404.
- [x] **2.6 SEO (§38):** titles/meta per table (Landing/Catalog/Category/Tool), `noindex` account/admin/auth-thin, semantic HTML, OG tags public routes; sitemap deferred until domain known.

## Phase 3 — Authentication & Session UX (done)

- [x] **3.1 Service `auth-service.js`:** `POST /auth/register {email(≤255), password 8–128, name? 1–100}`, `POST /auth/login {email, password 1–128}`, `GET /auth/me`, `POST /auth/logout` (best-effort; always clear local).
- [x] **3.2 Login `/login`:** RHF+Zod, show/hide password, generic 401 "Email or password is incorrect.", 429 preserve-input + retry copy; success → persist token, seed user, fetch `/auth/me`, redirect safe `returnTo` or `/app/home`. No forgot-password control.
- [x] **3.3 Register `/register`:** name optional, password guidance, map `EMAIL_TAKEN` → inline email error; success = same as login.
- [x] **3.4 Logout:** call `/auth/logout` best-effort, then clear token + query cache + ephemeral results regardless.
- [x] **3.5 Session expiry:** on protected-API 401 → clear session once, preserve safe path, toast "session expired", redirect `/login?returnTo=...`. No refresh-token retry.
- [x] **3.6 Verify:** register → login → reload-persist → logout → expired-token redirect → public tool still works anonymous.

## Phase 4 — Tool Workspace Core (Shared Shell) (done)

- [x] **4.1 Tool-definition registry (`src/features/tool-workspace/tool-definitions.js`):** map every slug in §17/§46 + `API.md` to `{endpoint, fileConfig(count/ext/size), fields+validation, resultType(download|json|zip-manifest), warnings, helper copy}`. Mirror backend exactly; no invented tools/params. `implementation:frontend` slugs → placeholder copy "catalogued for local execution; exact web implementation is not in this backend repository" until reviewed local implementation exists.
- [x] **4.2 Workspace shell:** `ToolWorkspacePage` → `AppShell + Breadcrumbs (Tools/Category/Tool) + ToolHero (name/desc/badges/favorite) + ToolWorkspace (input/params/run/result/privacy note) + ToolLimitations + RelatedTools`. Layout 7/5 or 8/4 desktop, stacked mobile.
- [x] **4.3 Data:** `GET /tools/:slug` (header skeleton → form skeleton); capability badges; favorite control (authed); related tools (same category, frontend subset). Fire `POST /analytics {event: tool_opened|completed|failed, toolSlug, platform:web}` non-blocking best-effort; invalid slug → 400 ignored silently.
- [x] **4.4 Upload blocks (`components/tool-ui/`):** `FileDropzone` (drag/drop + keyboard file picker, allowed ext/count/per-file-size shown BEFORE select), `FileQueue` (name/ext/size/remove/row error), `UrlInputForm`, `FrontendToolPlaceholder`. Rules: explicit Run button (no auto-upload), remove/replace before submit, no cancel-after-start, no persistent library. Multipart field `files` for all tool endpoints (`file` singular only for validation-only `/files/process` — do not surface as a tool).
- [x] **4.5 Parameter primitives:** `ToolParameterForm` with number/select/text/ranges/JSON/pattern/paths controls; client validation mirrors backend limits (assistance only, server authoritative); preserve file selection on 400; ranges syntax example `1-3,5`.
- [x] **4.6 Execution mutation (`useToolExecution` + `tool-service.js`):** build `FormData` (files + text fields) or JSON for URL tools; POST exact `/tools/<family>/<tool>`; Jimmy states: disabled button + "Uploading/Processing" indeterminate + file list visible; result → `ToolResultPanel` with expiry note + `DownloadResult` (primary) or `JsonResultViewer` (copy + download JSON). Handle `FILE_EXPIRED` ("Result expired; run again"), 413 (show actual file details), 429 (disable resubmit + retry copy), 400 (inline/preserve), 404 (tool unavailable).
- [x] **4.7 Download handling:** fetch `downloadUrl` (`/files/:fileId`) as blob → `attachment` filename; render `expiresAt` + short-lived warning; never put fileId/URL in URL bar, analytics, screenshots, or persistent storage. `markdown-to-html` output defaults to download, never unsandboxed embed.
- [x] **4.8 Mandatory warnings (§10, §17):** PDF redact = persistent "visual-only, not secure redaction"; PDF sign = "visible stamp, non-cryptographic"; Word/PDF text transforms = "text/layout limitation"; all downloads = "short-lived result".
- [x] **4.9 Verify core with 2 pilot tools** (e.g. `pdf/merge` download + `url/status` JSON) incl. success, 400, expired-download, rate-limit paths before building all families.

## Phase 5 — Tool Family Forms (incremental, verified batches) (done)

> All 72 backend slugs configured in `tool-definitions.js` and verified live. Per-file ≤10 MB unless noted; combined 50 MB cap where noted. Constraints shown before submit.

- [x] **5.1 PDF family (21 endpoints):**
  - [x] `pdf/merge` 2–20 pdf → pdf download
  - [x] `pdf/split` 1 pdf + `ranges` req 1–200 chars → pdf
  - [x] `pdf/compress` 1 pdf → pdf (+ "not image downsampling" note)
  - [x] `pdf/to-word` 1 pdf ≤200pp → docx (+ text-only/scanned-fail note)
  - [x] `pdf/from-image` 1–10 png/jpg/jpeg → pdf
  - [x] `pdf/rotate` 1 pdf + `angle` 90/180/270 req + `ranges?` ≤200 → pdf
  - [x] `pdf/delete-pages` 1 pdf + `ranges` req → pdf (cannot remove all)
  - [x] `pdf/text` 1 pdf → JSON `{pageCount,pages,charCount}`
  - [x] `pdf/metadata` 1 pdf → JSON metadata
  - [x] `pdf/watermark` 1 pdf + `text` 1–100 + `opacity` .05–.5 d.15 + `size` 12–144 d48 → pdf
  - [x] `pdf/number-pages` 1 pdf + `format` n-of-total|n d.n-of-total + `size` 8–36 d10 → pdf
  - [x] `pdf/header-footer` 1 pdf + `header?`/`footer?` (≥1, each 1–200) + `size` 8–36 d10 → pdf
  - [x] `pdf/reorder` 1 pdf + `order` req ≤500 (complete 1-based permutation) → pdf
  - [x] `pdf/duplicate` 1 pdf + `ranges` req + `times` 1–10 d1 → pdf
  - [x] `pdf/flatten` 1 pdf → pdf (metadata preserved note)
  - [x] `pdf/search` 1 pdf + `query` req 1–200 → JSON matches cap 50
  - [x] `pdf/redact` 1 pdf + `regions` req JSON `[{page,x,y,w,h}]` ≤100 → pdf + visual-only warning
  - [x] `pdf/metadata-edit` 1 pdf + ≥1 of title/author/subject/keywords/producer/creator ≤500 (empty clears) → pdf
  - [x] `pdf/to-image` 1 pdf + `format` png|jpg d.png + `pages?` + `scale` 1–3 d2, ≤20pp → ZIP
  - [x] `pdf/sign` 1 pdf + 1 png/jpg/jpeg + `page` ≥1 d1 + `x/y` 0–2000 d50 + `width` 10–500 d150 → pdf + non-crypto warning
- [x] **5.2 Image family (19 endpoints):**
  - [x] `image/compress` 1 png/jpg/jpeg/webp + `quality` 1–100 d80 → same-format
  - [x] `image/convert` 1 image + `format` req png/jpg/webp → converted
  - [x] `image/resize` 1 image + `width?`/`height?` (≥1, 1–8000, never upscale) → resized
  - [x] `image/crop` 1 + `left/top` 0–8000 + `width/height` 1–8000 (backend bounds) → cropped
  - [x] `image/rotate` 1 + `angle` 90/180/270 → rotated
  - [x] `image/flip` 1 + `direction` horizontal|vertical → flipped
  - [x] `image/grayscale` 1, no params → grayscale
  - [x] `image/blur` 1 + `sigma` .3–50 d5 → blurred
  - [x] `image/sharpen` 1 + `sigma` .5–10 d1 → sharpened
  - [x] `image/brightness` 1 + `level` .1–3 d1.2 → adjusted
  - [x] `image/contrast` 1 + `level` .1–3 d1.2 → adjusted
  - [x] `image/pixelate` 1 + `blocks` 4–100 d20 → pixelated
  - [x] `image/watermark` 1 + `text` 1–100 + `position` enum + `opacity` .05–.8 d.5 + `size` 8–144 d24 → watermarked
  - [x] `image/metadata` 1 → JSON metadata
  - [x] `image/exif-remove` 1 → re-encoded stripped image
  - [x] `image/favicon` 1 → ZIP (16/32/48/180/192px + manifest)
  - [x] `image/social` 1 + `preset` req og/square/story/banner → cover-fit
  - [x] `image/passport` 1 → 413×531 crop (+ no-face-detection note)
  - [x] `image/montage` 2–9 + `cols/rows` 1–3 d2 (exact count) + `gap` 0–50 d4 + `background` hex d#ffffff → grid
- [x] **5.3 Document family (13 endpoints):**
  - [x] `document/to-pdf` 1 docx → pdf (+ re-rendered-text limitation)
  - [x] `document/word-to-txt` 1 docx → txt
  - [x] `document/word-to-html` 1 docx → html (download default)
  - [x] `document/word-to-markdown` 1 docx → md
  - [x] `document/txt-to-pdf` 1 txt UTF-8 ≤2000 lines → pdf
  - [x] `document/excel-to-csv` 1 xlsx → csv (first sheet; no legacy xls)
  - [x] `document/excel-to-json` 1 xlsx → json
  - [x] `document/csv-to-json` 1 csv → json
  - [x] `document/csv-to-excel` 1 csv → xlsx
  - [x] `document/json-to-csv` 1 json array ≤50k rows/100 cols → csv
  - [x] `document/markdown-to-html` 1 md/markdown ≤500k chars → html (download, sandbox note)
  - [x] `document/metadata` 1 docx/xlsx → JSON
  - [x] `document/compress` 1 docx/xlsx → same-type repack
- [x] **5.4 File/archive family (16 endpoints):**
  - [x] `file/zip-create` 2–20 common (no executables, 50MB combined) → ZIP
  - [x] `file/zip-extract` 1 zip → JSON manifest `{count, files:[{fileId,downloadUrl,name,size,mimeType}]}`
  - [x] `file/hash` 1 any-ext → JSON `{sha256,sha512,size}`
  - [x] `file/base64-encode` 1 ≤5MB → b64 text
  - [x] `file/base64-decode` 1 txt/b64/md/csv/json → binary
  - [x] `file/metadata` 1 ≤10MB → JSON `{name,size,declaredMime,detectedType,detectedMime,sha256,textLines}`
  - [x] `file/type` 1 → JSON `{type,mime}` sniffed
  - [x] `file/merge` 2–20 txt/md/csv/json same-ext → text (400 mixed)
  - [x] `file/split` 1 text → ZIP ≤20 chunks
  - [x] `file/compress` 1 txt/md/csv/json/html/bin ≤5MB → gzip
  - [x] `file/rename` 2–20 common + `pattern` must-contain-`{i}` → ZIP
  - [x] `file/folder-to-zip` 2–20 + `paths` JSON array parallel/no-`..` → ZIP
  - [x] `file/tar-create` 2–20 (50MB cap) → tgz
  - [x] `file/tar-extract` 1 tar/tgz/gz → ZIP (≤50 entries/50MB)
  - [x] `file/zip-to-tar` 1 zip → tgz
  - [x] `file/tar-to-zip` 1 tar/tgz → zip
- [x] **5.5 URL family (4 endpoints, JSON forms, no dropzone):**
  - [x] `url/status` `{url}` 1–2000 → JSON status/redirect/content
  - [x] `url/metadata` `{url}` 1–2000 → JSON title/desc/OG
  - [x] `url/dns` `{domain}` hostname ≤253 (no IPs) → JSON a/aaaa/mx/txt/ns
  - [x] `url/ssl` `{domain}` hostname ≤253 → JSON subject/issuer/validity/daysLeft/fingerprint256
  - [x] Result: `JsonResultViewer` + copy/download; hostname validation client-side.
- [x] **5.6 Per-endpoint verification:** success + validation-failure + oversize + (where JSON) copy/download, against running backend. Code-split PDF/image/document families (lazy routes).

## Phase 6 — Account Area (Authenticated) (done)

- [x] **6.1 Personal home `/app/home`:** greeting; quick tool search → catalog; favorite cards (`GET /favorites`); recent history (`GET /history?limit=5`); subscription card (`GET /subscriptions/me`); account shortcut. Allowed counts only: favorites count, history `total`, catalog `total` if fetched. No charts/KPIs/downloads/revenue widgets.
- [x] **6.2 Favorites `/app/favorites`:** `GET /favorites` cards (tool summary), `DELETE /favorites/:toolId` idempotent optimistic-remove + rollback toast + browse-tools CTA; empty "Save tools you use most."; `POST /favorites {toolId}` from cards (409 `ALREADY_FAVORITED` → reconcile). Invalidate `favorites` key.
- [x] **6.3 History `/app/history`:** `GET /history?page=&limit=` (1–50 d20, URL-preserved, prev/next+indicator), timeline cards (slug→tool link only if resolvable, summary truncated→expand, date-fns), `DELETE /history` behind `ClearHistoryDialog` confirmation → empty state. No manual-create form, no edit UI (POST history only if product defines rules — default OFF).
- [x] **6.4 Account `/app/account`:** `GET /users/me` identity card (email immutable); `PATCH /users/me {name 1–100}` (no blank-clear UI); `POST /auth/logout` explanation (stateless); `DELETE /users/me` via typed-confirm `DeleteAccountDialog` → purge token/cache/ephemeral results → `/` with success toast. No password/email/picture/MFA controls.
- [x] **6.5 Subscription `/app/subscription`:** `GET /subscriptions/me` → tier/status/expiry-if-returned; free-fallback = valid state; copy "management/checkout unavailable". No upgrade/cancel/invoice/payment UI.
- [x] **6.6 Verify:** favorites/history isolation per user, clear-history confirm, delete-account purge, unauth redirect with `returnTo`.

## Phase 7 — Admin (Read-Only) (done)

- [x] **7.1 `AdminGate`:** probe via `GET /admin/tools` (or users) after auth; success → show Admin nav; 403 → hide + `AdminAccessDenied`/403 page; 401 → login flow. Never infer role from token payload.
- [x] **7.2 Admin tools `/admin/tools`:** `GET /admin/tools?search=&page=&limit=` (1–100 d50, debounce ~300ms, URL-preserved) → table (name/slug/active/categoryId/sortOrder, detail link) desktop + stacked cards mobile + row skeletons + "No matching records" + footer count. No edit/activate/delete.
- [x] **7.3 Admin users `/admin/users`:** `GET /admin/users?...` → table/cards (id/email/name/createdAt, copy-ID), same search/pagination/skeleton/empty behavior. No password/subscription/favorites/history/delete columns.
- [x] **7.4 Verify:** non-admin gets 403 page (not login loop); empty-allowlist backend ("Admin access is not configured") surfaces cleanly; no category-mutation controls anywhere.

## Phase 8 — Cross-Cutting Quality (done)

- [x] **8.1 Loading/empty/error matrix (§29–31):** skeletons per area; pre-run tool guidance (never blank); result-panel errors preserve files+params; page-level retry only when primary data fails; 409 preserves intent; 429 copy (no countdown); 500 preserves form + retry.
- [x] **8.2 Toasts only (no notification center):** favorite saved/removed, profile updated, history cleared, result ready, download failure, validation summary, expiry/redact/sign warnings, sign-out, rate-limit.
- [x] **8.3 Security (§36):** no secrets in client; text-only rendering of API data (no raw HTML); HTML outputs download-only; token cleared on 401/logout/delete; download links ephemeral; no JWT/fileIds in URL/analytics/storage.
- [x] **8.4 Performance (§37):** lazy admin + workspace families; catalog caching; debounced + cancelled list requests; lightweight upload previews (no large decode); download-first outputs (preview small images/metadata only if safe); no client sort of paginated data; memoize big lists only after profiling.
- [x] **8.5 Accessibility audit:** full keyboard pass, focus/dialog/drawer test, screen-reader pass on forms/tables/results, contrast check, 320px → desktop check, `aria-live`/`aria-busy` verification.
- [x] **8.6 Analytics (P3, best-effort):** `POST /analytics {event allowlist: tool_opened|tool_completed|tool_failed|file_uploaded|result_downloaded|result_copied|tool_favorited|search_performed, toolSlug?, platform:web}` — fire-and-forget, never blocks UI, unknown slug never sent.

## Phase 9 — Acceptance (done)

- [x] **9.1 Backend-parity test:** every screen in §9/§46 exercised against running backend: success, 400 validation, 401, 403, 404 (`TOOL_NOT_FOUND`/`CATEGORY_NOT_FOUND`), 409, 410 expired download, 413 oversize, 429, 501-hidden, 500/network.
- [x] **9.2 Journey tests:** anonymous tool run → download before expiry; URL inspect → copy; register → favorite → history → clear → profile update → delete; admin probe → search/paginate; expired-token redirect; forbidden-admin page.
- [x] **9.3 Spec compliance:** no `[BACKEND SUPPORT REQUIRED]` item shipped as working; no invented endpoints/fields/tool logic; frontend-only tools show placeholder; update this spec only after backend changes confirmed.
- [x] **9.4 Final polish:** responsive + a11y + performance profiling fixes; SEO titles/meta; README with setup (`npm install/dev/build`, env `VITE_API_BASE_URL`, proxy note) and scope/exclusion list.

---

## Build Order (summary)

1. Foundation (§Phase 0) → 2. Shell/routes/guards + design system (Phase 1) → 3. Discovery (Phase 2) → 4. Auth (Phase 3) → 5. Workspace core + 2 pilots (Phase 4) → 6. All tool families in batches (Phase 5) → 7. Account (Phase 6) → 8. Admin (Phase 7) → 9. Quality (Phase 8) → 10. Acceptance (Phase 9).
