# WEB APP REQUIREMENTS

**Product:** Utilza / EverydayTools Web

**Purpose of this document:** This is the product, UX, UI, and frontend architecture specification for the React web app. It is based on the executable backend in this repository and `docs/BACKEND-FRONTEND-INTEGRATION-SPEC.md`. A file named `BACKEND_ANALYSIS.md` was not present when this document was authored.

**Evidence labels used throughout**

- **[BACKEND SUPPORTED]** — implemented by the current API.
- **[FRONTEND ONLY]** — safe client-side UX/state/presentation; no backend feature is implied.
- **[OPTIONAL]** — not required for the first release, but compatible with the current product.
- **[BACKEND SUPPORT REQUIRED]** — do not ship as a complete feature until the named backend capability exists.
- **[UNKNOWN]** — cannot be derived from the current source.

**Non-negotiable scope rule:** The frontend must not present a backend capability as working when the API does not implement it. In particular, do not build payment checkout, password reset, notifications, persistent generated-file history, category editing, or production job submission UI.

## 1. Product Overview

Utilza is a modern everyday-tools product: users can discover simple utilities, run browser-owned tools, and submit files to server-side PDF, image, document, archive, file, and URL utilities. Registered users can save favorites, maintain personal history, manage a basic profile, and view their subscription state. Administrators can read user and tool catalog lists.

### Product type

Utility SaaS / productivity toolbox. It is not a CRUD administration product as its primary user experience; the core experience is fast tool discovery and a focused, trustworthy tool workspace.

### Main user goals

1. Find the right tool quickly by category or search.
2. Run a simple local utility without an account when its behavior is implemented by the frontend.
3. Upload a file, configure a supported server-side transform, and download the result.
4. Inspect a URL, DNS records, or TLS certificate safely.
5. Save frequently used tools and view manually recorded activity when signed in.
6. For administrators, search catalog tools and users.

### Product constraints from the backend

- Ten catalogued basic tools are marked `implementation: "frontend"`; the backend exposes metadata only, not their calculations. Their precise UX/calculation rules are **[UNKNOWN]** and must not be invented.
- Backend tool execution is public; it does not require a user account.
- Generated results are returned only from the immediate execution response as a short-lived download URL. There is no API to list a user’s generated files.
- There is no real billing, notification, password-reset, email-verification, social-login, or real-time capability.

## 2. Product Goals

### P0 goals

- Make tool discovery, upload, configuration, execution, and download feel immediate and dependable.
- Clearly distinguish local tools from server-powered tools before the user begins.
- Explain file limitations and transformation limitations in context, especially PDF redaction, signing, and text-level document conversion.
- Make account-only benefits useful but non-blocking: favorites, history, profile, and subscription status.
- Meet WCAG 2.2 AA and work from 320 px mobile width to large desktop.

### Non-goals

- A generic analytics dashboard or made-up business KPI charts.
- An upload repository, cloud drive, or permanent file history.
- Billing/checkout, account recovery, email verification, or notification center.
- Admin mutations: the current category write routes deliberately return `501 NOT_IMPLEMENTED`.

## 3. Target Users

### Anonymous tool user

**Goals:** locate and execute a one-off tool quickly without registration.

**Main tasks:** browse/search tools; use a frontend-only tool; upload and process files; inspect URLs; download results; optionally create an account.

**Key screens:** landing, catalog, category page, tool workspace, login/register.

**Permissions:** all public catalog and execution tools; no favorites, history, account, subscription, or admin areas.

### Registered user

**Goals:** retain convenient access to common tools and manage their account.

**Main tasks:** all anonymous actions; favorite a tool; view/clear history; update name; view free/subscription state; delete account.

**Key screens:** authenticated home, favorites, history, profile/account, subscription status.

**Permissions:** only their own user, favorites, history, subscription, and owned jobs if jobs are ever enabled.

### Administrator

**Goals:** inspect the tool catalog and user base.

**Main tasks:** search/paginate tools and users.

**Key screens:** admin tools, admin users.

**Permissions:** the backend recognizes an administrator only when the signed-in email is in `ADMIN_EMAILS`. No role is included in the auth response, so the web app can only discover admin access by attempting an admin endpoint and receiving success/403.

## 4. User Roles & Permissions

| Capability | Anonymous | Registered user | Administrator |
| --- | --- | --- | --- |
| Browse/search categories and tool catalog | Yes | Yes | Yes |
| Run public file/URL/backend tools | Yes | Yes | Yes |
| Run frontend-only tool UI | Yes | Yes | Yes |
| Register/login/logout | Yes | Yes (logout) | Yes (logout) |
| Favorite tools | No | Own favorites only | Own favorites only |
| View/clear history | No | Own history only | Own history only |
| Update/delete own account | No | Yes | Yes |
| View subscription state | No | Own state only | Own state only |
| View admin tools/users | No | No | Yes, environment allowlist |
| Create/edit/delete categories | No | No | Not available; backend returns 501 |
| Payments, invoices, checkout | No | No | No backend support |

### UI permission rules

- Show **Favorites**, **History**, **Account**, and **Subscription** only after a valid token is available. [BACKEND SUPPORTED]
- Show the **Admin** navigation group only after a successful admin-access probe in the current session; hide it after a `403`. [FRONTEND ONLY]
- Never rely on hidden controls for protection; protected routes must still call the API and handle `401`/`403`. [BACKEND SUPPORTED]
- Do not display category create/edit/delete controls. [BACKEND SUPPORT REQUIRED]

## 5. Technology Stack

### Required foundation

- React with JavaScript and Vite.
- React Router for route composition, protected routes, nested layouts, parameters, and 404 fallback.
- Axios for JSON/multipart HTTP requests.

### Recommended libraries

| Library | Use | Reason |
| --- | --- | --- |
| TanStack Query | Server state | Caching, mutations, cancellation, invalidation, paginated data |
| React Hook Form | Forms | Reliable field state, file controls, submission state |
| Zod | Client validation | Mirrors known backend constraints without replacing server validation |
| Tailwind CSS | Styling | Scalable semantic design-token implementation |
| Lucide React | Icons | Consistent accessible outline icon set |
| Zustand | Small client store only | Token/session UI state and ephemeral result queue; avoid a large global store |
| date-fns | Display dates | History/admin date formatting |

Do not add charting, notification, payment, WebSocket, upload-resume, or rich-text libraries until an actual screen needs them.

## 6. Frontend Architecture

```text
Route page
  ↓
Feature component
  ↓
Feature hook (TanStack Query mutation/query)
  ↓
Feature API service
  ↓
Axios API client
  ↓
/api/v1 backend
```

### Principles

- Keep server state in TanStack Query, not Zustand.
- Keep filter/search/page state in the URL where it is shareable.
- Keep only session token, session user, theme preference, and ephemeral result/download state in local persistence or a small store.
- Drive tool screens from a frontend tool-definition registry. This registry may map existing slugs to endpoint, input controls, limits, output type, warnings, and helper copy; it must mirror the backend contract rather than create new tools. [FRONTEND ONLY]
- Use a single `ToolWorkspace` shell plus specialized parameter panels instead of 72 unrelated pages.

## 7. Application Structure

```text
Public marketing and discovery
├── Landing
├── Tool catalogue
├── Category catalogue
├── Tool details/workspace
├── Login and registration
└── Public error pages

Authenticated account area
├── Personal home
├── Favorites
├── History
├── Account profile
└── Subscription status

Administrator area
├── Tool catalogue administration (read-only)
└── User directory (read-only)
```

The primary application shell should serve the catalog and tools; an account area should not feel like a separate enterprise dashboard.

## 8. Route Architecture

```text
/
├── tools
│   ├── :slug                         tool details/workspace
│   └── category/:categorySlug         filtered category view
├── login
├── register
├── app
│   ├── home
│   ├── favorites
│   ├── history
│   ├── account
│   └── subscription
├── admin
│   ├── tools
│   └── users
├── 401
├── 403
├── 404
└── *                                  redirect/render 404
```

| Route | Access | Notes |
| --- | --- | --- |
| `/` | Public | Landing plus featured discovery; not dependent on invented metrics |
| `/tools` | Public | Catalog/search entry point |
| `/tools/category/:categorySlug` | Public | Category data from API, invalid category leads to 404 state |
| `/tools/:slug` | Public | Shared shell; selected renderer comes from actual slug metadata |
| `/login`, `/register` | Public-only | Redirect authenticated users to `/app/home` or previous safe route |
| `/app/*` | Bearer | Redirect unauthenticated users to login with return path |
| `/admin/*` | Admin probe/API protected | Render 403 on denied access |

## 9. Complete Screen Inventory

| Screen | Route | Access | Purpose | Backend module/status |
| --- | --- | --- | --- | --- |
| Landing | `/` | Public | Brand, search, categories, featured catalog tools | Tools/categories [BACKEND SUPPORTED] |
| Tool catalogue | `/tools` | Public | Search/filter/paginate all active tools | Tools [BACKEND SUPPORTED] |
| Category catalogue | `/tools/category/:categorySlug` | Public | Browse a category and its tools | Categories/tools [BACKEND SUPPORTED] |
| Tool workspace | `/tools/:slug` | Public | Run one known tool or explain unavailable local implementation | Tool executors [BACKEND SUPPORTED]; local implementation shell [FRONTEND ONLY] |
| Login | `/login` | Public-only | Authenticate | Auth [BACKEND SUPPORTED] |
| Register | `/register` | Public-only | Create account | Auth [BACKEND SUPPORTED] |
| Personal home | `/app/home` | Authenticated | Quick access, favorites/history snippets, subscription state | Multiple modules [BACKEND SUPPORTED] |
| Favorites | `/app/favorites` | Authenticated | Manage own saved tools | Favorites [BACKEND SUPPORTED] |
| History | `/app/history` | Authenticated | Browse/clear own recorded tool history | History [BACKEND SUPPORTED] |
| Account | `/app/account` | Authenticated | View/update name; delete account | Users/auth [BACKEND SUPPORTED] |
| Subscription | `/app/subscription` | Authenticated | View state only | Subscriptions [BACKEND SUPPORTED] |
| Admin tools | `/admin/tools` | Administrator | Read-only catalog table | Admin [BACKEND SUPPORTED] |
| Admin users | `/admin/users` | Administrator | Read-only user table | Admin [BACKEND SUPPORTED] |
| 401/403/404/500/network pages | `/401`, etc. | Varies | Clear recovery and navigation | [FRONTEND ONLY] |

Do not create screens for password reset, email verification, checkout, invoices, notifications, job creation/listing, category editing, or generated file history. They are unsupported or unusable with the current backend.

## 10. Screen Specifications

### Screen: Landing

**Route/access:** `/`, public.

**Purpose:** Help a visitor choose a tool in one interaction. This is a discovery page, not a marketing-only splash screen.

**Layout:** utility header; concise hero with catalog search; category-chip rail; “Popular/featured tools” grid sourced from the catalog; trust/limitations panel; compact footer.

**Data/APIs:** `GET /api/v1/categories`; `GET /api/v1/tools?limit=20`. “Featured” is a frontend display subset based on returned catalog order, not usage analytics. [FRONTEND ONLY]

**Actions:** search opens `/tools?search=...`; category card opens category page; tool card opens tool workspace; login/register/account menu.

**States:** skeleton cards while loading; retry block on API error; catalogue fallback wording must not claim popularity; no empty state is expected, but show a diagnostic catalog-unavailable state.

### Screen: Tool Catalogue

**Route/access:** `/tools`, public.

**Purpose:** Full searchable, filterable catalogue.

**Layout:** page heading and description; search input; horizontally scrollable category filter; active-filter count/clear action; responsive tool-card grid; pagination footer.

**Data/API:** `GET /api/v1/tools?category=&search=&page=&limit=` and category list for filters.

**Actions:** change search/category/page; open tool; add/remove favorite from a card when signed in; otherwise open login prompt.

**States:** 300 ms debounced search; preserve URL state; skeleton grid; “No tools match” empty state; retryable error state; no full-page spinner after initial render.

### Screen: Category Catalogue

**Route/access:** `/tools/category/:categorySlug`, public.

**Purpose:** A human-readable category landing page.

**Data/API:** `GET /api/v1/categories/:slug` and `GET /api/v1/tools?category=:slug&page=&limit=`.

**Actions/states:** same as catalogue; use returned category name/description in header; render an in-page 404 if the category does not exist.

### Screen: Tool Workspace

**Route/access:** `/tools/:slug`, public.

**Purpose:** Execute exactly one existing tool in a focused environment.

**Layout:** breadcrumb; tool identity and category; capability badges (local/server, file/no-file, account requirement, offline); workspace card; “how it works/limitations” card; related tools; optional favorite control.

**Data/API:** `GET /api/v1/tools/:slug`; an endpoint from the tool matrix when the tool is backend implemented. Send `POST /api/v1/analytics` events on open/completion/failure as a non-blocking best effort. [BACKEND SUPPORTED]

**Tool classes:**

- `implementation: backend`: render the relevant upload/form or URL inspector and execute it.
- `implementation: frontend`: render only when the frontend contains a reviewed local implementation. Until then, show “This tool is catalogued for local execution; exact web implementation is not in this backend repository.” [FRONTEND ONLY]

**Result behavior:** use the immediate returned `downloadUrl`; offer Download as the primary action. Do not promise saved results. For JSON inspection results, show a readable result panel with copy/download JSON action. [BACKEND SUPPORTED]

**Important warnings:** show a persistent warning for visual-only PDF redaction; show non-cryptographic warning for PDF signing; show text/layout limitation for Word/PDF transforms; show a short-lived-results note for downloads.

### Screen: Login

**Route/access:** `/login`, public-only.

**Form:** email, password, show/hide password, submit, link to registration.

**API:** `POST /api/v1/auth/login`.

**Behavior:** validate email and password client-side; show generic credential error for 401; persist token only after success; fetch `/auth/me`; redirect to validated return path or `/app/home`. No “forgot password” control because no endpoint exists.

### Screen: Register

**Route/access:** `/register`, public-only.

**Form:** name optional, email, password, password guidance, consent copy only if legal requirements are independently supplied. Do not invent terms acceptance storage.

**API:** `POST /api/v1/auth/register`.

**Behavior:** mirror max lengths and password 8–128 constraints; map `EMAIL_TAKEN` to inline email error; on success persist token, fetch `/auth/me`, and redirect to `/app/home`.

### Screen: Personal Home

**Route/access:** `/app/home`, authenticated.

**Purpose:** A lightweight personal command center, not an unsupported analytics dashboard.

**Layout:** greeting; quick search/open tool; favorite tool cards; recent history list; subscription status card; account shortcut.

**Data/APIs:** `GET /auth/me`, `GET /favorites`, `GET /history?limit=5`, `GET /subscriptions/me`.

**Allowed KPIs:** favorite count and total returned history count may be shown. Tool catalog count may be displayed only if fetched from `/tools`. Do not show time-series usage charts, total downloads, billing metrics, notifications, or “recent generated files.”

### Screen: Favorites

**Route/access:** `/app/favorites`, authenticated.

**Layout:** title, explanatory text, responsive saved-tool card list, remove action, browse-tools CTA.

**Data/API:** `GET /favorites`, `DELETE /favorites/:toolId`.

**States:** skeleton cards; empty “Save tools you use often” state; optimistic removal with rollback/error toast; action remains idempotent.

### Screen: History

**Route/access:** `/app/history`, authenticated.

**Layout:** title, total count, paginated timeline/list, clear-history control.

**Data/API:** `GET /history?page=&limit=`; `DELETE /history`.

**Actions:** open a listed `toolSlug` only after resolving it as a valid catalog route; clearing requires confirmation. Do not expose edit/create controls for arbitrary history rows, even though the backend POST exists; automatic history semantics are not enforced by backend execution.

### Screen: Account

**Route/access:** `/app/account`, authenticated.

**Layout:** identity card with immutable email, profile-name form, security/session explanation, danger zone.

**Data/API:** `GET /users/me`, `PATCH /users/me`, `DELETE /users/me`, `POST /auth/logout`.

**Actions:** update name; delete account through a typed confirmation dialog; on deletion clear token/cache and navigate to `/`. Do not offer password change, profile picture, MFA, or email change.

### Screen: Subscription

**Route/access:** `/app/subscription`, authenticated.

**Data/API:** `GET /subscriptions/me`.

**Layout:** current tier/status, expiry only if returned, explanation that management/checkout is unavailable.

**Restriction:** no upgrade, cancel, invoice, or payment methods UI. [BACKEND SUPPORT REQUIRED]

### Screen: Admin Tools

**Route/access:** `/admin/tools`, administrator.

**Data/API:** `GET /admin/tools?page=&limit=&search=`.

**Layout:** dense desktop table with responsive cards on mobile; search, pagination, active status badge, catalogue detail link.

**Restriction:** no edit/activate/delete action; admin write operations are not implemented.

### Screen: Admin Users

**Route/access:** `/admin/users`, administrator.

**Data/API:** `GET /admin/users?page=&limit=&search=`.

**Layout:** search plus user table/cards showing id, email, name, created date. Do not expose password, subscription, favorites, history, or deletion actions because no supporting API exists.

### Screen: Error Pages

**Routes/access:** `/401`, `/403`, `/404`, `/500`, `/offline` as needed. [FRONTEND ONLY]

**Behavior:** clear visual distinction, plain-language reason, primary recovery action, secondary “Browse tools” action, no technical stack traces.

## 11. Navigation

### Desktop header

```text
Logo → Tools → Categories menu → Search → Favorites when signed in → Account menu
                                                         └── Admin link only after successful probe
```

### Authenticated account navigation

Use a compact left sub-navigation on desktop and a tab/drawer on small screens:

```text
Home
Favorites
History
Account
Subscription
Admin (conditional)
```

### Mobile navigation

- Header: logo, search trigger, account/menu trigger.
- Full-screen or side drawer: catalog categories, account links, auth state, admin links if eligible.
- Keep the active tool page’s primary action visible; do not bury Upload/Run beneath the drawer.

### Breadcrumbs

Use on category/tool/admin pages: `Tools / Category / Tool`. Do not use on landing or account home.

## 12. Layout System

### Application shell

```text
AppShell
├── Skip link
├── Global header
├── Context navigation (account/admin only)
├── Main landmark
│   ├── Breadcrumbs when relevant
│   ├── Page header
│   └── Page content
└── Footer
```

### Tool workspace layout

```text
ToolWorkspace
├── Breadcrumbs
├── ToolHero (name, description, badges, favorite)
├── Main workspace column
│   ├── Input/upload panel
│   ├── Parameter panel when applicable
│   ├── Run/result panel
│   └── Privacy/retention note
└── Supporting column or lower section
    ├── Limitations and tips
    └── Related tool cards
```

At desktop widths, use a 7/5 or 8/4 workspace/support layout. Stack all content on tablet/mobile.

## 13. Design System

### Visual direction

Calm, high-trust utility software: neutral canvas, bright but restrained primary action, strong typography, generous whitespace, and clearly bounded work areas. Avoid a generic dark “admin dashboard” appearance.

### Semantic color tokens

| Token | Suggested role |
| --- | --- |
| `primary` | Primary run/download/focus action; deep indigo or blue |
| `primary-hover` | Interactive hover/pressed state |
| `accent` | Category highlights and informational emphasis; restrained teal/cyan |
| `canvas` | Page background, warm/slightly cool neutral |
| `surface` | Cards, dialogs, inputs |
| `surface-subtle` | Tool parameter groups and skeletons |
| `text` / `text-muted` | Main and secondary text |
| `border` | Dividers and field boundaries |
| `success` | Completed result/download ready |
| `warning` | Transform limitations and expiry messaging |
| `danger` | Delete account, validation/destructive actions |
| `info` | Server/local capability information |

All foreground/background combinations must meet WCAG 2.2 AA contrast. Do not encode state solely by color.

### Typography

- Font: Inter or system sans stack. [FRONTEND ONLY]
- Display/page title: 32–40 px desktop, 28–32 px mobile, 650–700 weight.
- Section heading: 20–24 px, 600–700 weight.
- Body: 15–16 px, 400–450 weight, 1.5–1.6 line height.
- Labels: 13–14 px, 500–600 weight.
- Mono/readout: system monospace for hashes, IDs, DNS, certificate values.

### Spacing, radius, elevation

- Base spacing scale: 4, 8, 12, 16, 24, 32, 48, 64 px.
- Radius: 6 px small, 10 px controls, 16 px cards/dialogs, full pill for badges.
- Shadows: 0 default; low for cards; medium only for modal/drawer; use borders before shadows.

### Icons and motion

- Use Lucide React icons with visible text labels for unfamiliar actions.
- Honor `prefers-reduced-motion`; use brief 150–200 ms transitions only for state continuity.

## 14. Global Components

| Component | Purpose and key states |
| --- | --- |
| `AppShell` | Shared landmarks, header/footer, route outlet |
| `GlobalHeader` | Logo, catalog navigation, search, account/menu state |
| `AccountNav` | Authenticated section navigation, desktop/mobile variants |
| `AdminNav` | Conditional admin links only after access check |
| `PageHeader` | Title, description, breadcrumb/action slot |
| `Breadcrumbs` | Semantic navigation trail |
| `GlobalSearch` | Catalog-only debounced query that navigates to `/tools` |
| `AuthGate` | Protected-route loading/redirect/error behavior |
| `AdminGate` | API-backed admin access handling |
| `ToastRegion` | Assertive/success/polite feedback messages |
| `ErrorBoundary` | Unexpected client-render error recovery |
| `Footer` | Product/legal links only when supplied; no invented links |

## 15. Feature Components

### Catalog and discovery

- `CategoryRail`, `CategoryChip`, `ToolCard`, `ToolGrid`, `ToolBadgeSet`, `CatalogFilters`, `CatalogPagination`, `FavoriteButton`.
- Tool cards receive catalog data only: name, slug, description, icon, category, implementation, file/auth/offline flags. Never infer pricing or popularity.

### Tool workspace

- `ToolWorkspace`, `ToolInputPanel`, `FileDropzone`, `FileQueue`, `ToolParameterForm`, `ToolRunButton`, `ToolResultPanel`, `DownloadResult`, `JsonResultViewer`, `ToolLimitations`, `ToolPrivacyNotice`, `RelatedTools`.
- `FileDropzone` must support only the file count/extensions/size declared for the selected tool.
- `ToolResultPanel` stores only immediate in-memory/session UI state; it is not a generated-file library.

### Account and admin

- `FavoriteToolList`, `HistoryTimeline`, `ClearHistoryDialog`, `ProfileForm`, `DeleteAccountDialog`, `SubscriptionCard`, `AdminToolTable`, `AdminUserTable`, `AdminAccessDenied`.

### Component behavior contract

Every interactive feature component accepts data/loading/error/disabled states, supports keyboard operation, and avoids coupling directly to Axios. Hooks/services own API calls.

## 16. Component Hierarchy

```text
ToolWorkspacePage
├── AppShell
│   ├── GlobalHeader
│   └── Breadcrumbs
├── ToolHero
│   ├── ToolBadgeSet
│   └── FavoriteButton
├── ToolWorkspace
│   ├── FileDropzone or UrlInputForm or FrontendToolPlaceholder
│   ├── FileQueue
│   ├── ToolParameterForm
│   ├── ToolRunButton
│   └── ToolResultPanel
│       ├── DownloadResult
│       └── JsonResultViewer
└── ToolLimitations + RelatedTools
```

```text
AccountHomePage
├── AccountNav
├── WelcomeHeader
├── QuickToolSearch
├── FavoriteToolList
├── HistoryPreview
└── SubscriptionCard
```

```text
AdminUsersPage
├── AdminGate
├── PageHeader
├── SearchInput
├── AdminUserTable / AdminUserCards
└── Pagination
```

## 17. Forms

| Form | Fields / validation | API | Status |
| --- | --- | --- | --- |
| Login | email valid/max255; password 1–128 | `POST /auth/login` | [BACKEND SUPPORTED] |
| Register | name optional 1–100; email valid/max255; password 8–128 | `POST /auth/register` | [BACKEND SUPPORTED] |
| Profile name | name 1–100; do not offer blank/null clear UI | `PATCH /users/me` | [BACKEND SUPPORTED] |
| Delete account | typed acknowledgement; no backend field | `DELETE /users/me` | [BACKEND SUPPORTED] |
| Catalog search/filter | search max100, category, page/limit | `GET /tools` | [BACKEND SUPPORTED] |
| Favorite mutation | tool id from catalog, no free input | `POST/DELETE /favorites` | [BACKEND SUPPORTED] |
| Tool execution | selected tool’s exact files and fields | Exact tool endpoint | [BACKEND SUPPORTED] |
| URL status/metadata | URL 1–2000 | `/tools/url/status`, `/metadata` | [BACKEND SUPPORTED] |
| DNS/TLS lookup | hostname only, max253 | `/tools/url/dns`, `/ssl` | [BACKEND SUPPORTED] |
| Admin search | search max100, page/limit | admin list endpoints | [BACKEND SUPPORTED] |

Tool parameter form rules must come from the endpoint matrix in section 46. Client validation is assistance only; backend validation is authoritative.

### Complete tool form registry contract

Implement these as configurations rendered inside the shared `ToolWorkspace`; do not create a different visual pattern for every route. Every file row below is public multipart field `files`, normally limited to 10 MiB **per file**, and returns a download result unless marked **JSON**. The UI must show the count/extensions/parameter constraints before submit.

#### PDF tool forms

| Tool endpoint | File selection | Additional controls | Result / required warning |
| --- | --- | --- | --- |
| `/tools/pdf/merge` | 2–20 `.pdf` | None | PDF download |
| `/tools/pdf/split` | 1 `.pdf` | `ranges`, required, 1–200 chars; syntax example `1-3,5`; max 500 selected pages | PDF download |
| `/tools/pdf/compress` | 1 `.pdf` | None | PDF download; explain optimization is not image downsampling |
| `/tools/pdf/to-word` | 1 `.pdf`, max 200 pages | None | DOCX download; text extraction only, scanned/image PDFs can fail |
| `/tools/pdf/from-image` | 1–10 png/jpg/jpeg | None | PDF download |
| `/tools/pdf/rotate` | 1 `.pdf` | `angle`: 90/180/270 required; optional `ranges` max200 | PDF download |
| `/tools/pdf/delete-pages` | 1 `.pdf` | `ranges` required max200 | PDF download; cannot remove every page |
| `/tools/pdf/text` | 1 `.pdf` | None | **JSON** page text/count |
| `/tools/pdf/metadata` | 1 `.pdf` | None | **JSON** metadata |
| `/tools/pdf/watermark` | 1 `.pdf` | `text` 1–100; opacity .05–.5 default .15; size int12–144 default48 | PDF download |
| `/tools/pdf/number-pages` | 1 `.pdf` | format `n-of-total`/`n`, default `n-of-total`; size int8–36 default10 | PDF download |
| `/tools/pdf/header-footer` | 1 `.pdf` | header and/or footer, each 1–200; size int8–36 default10 | PDF download |
| `/tools/pdf/reorder` | 1 `.pdf` | `order` required max500; complete comma-separated 1-based permutation | PDF download |
| `/tools/pdf/duplicate` | 1 `.pdf` | `ranges` required; `times` int1–10 default1 | PDF download |
| `/tools/pdf/flatten` | 1 `.pdf` | None | PDF download; metadata preserved |
| `/tools/pdf/search` | 1 `.pdf` | `query` required 1–200 | **JSON** page/line matches, max50 |
| `/tools/pdf/redact` | 1 `.pdf` | `regions` required JSON string, 1–100 regions `{page,x,y,w,h}` | PDF download; persistent visual-only, not secure-redaction warning |
| `/tools/pdf/metadata-edit` | 1 `.pdf` | At least one of title/author/subject/keywords/producer/creator, each max500; empty clears | PDF download |
| `/tools/pdf/to-image` | 1 `.pdf` | format png/jpg default png; pages optional; scale 1–3 default2; max20 pages | ZIP download |
| `/tools/pdf/sign` | exactly 1 `.pdf` and 1 png/jpg/jpeg | page int>=1 default1; x/y 0–2000 default50; width int10–500 default150 | PDF download; persistent visible-stamp/non-cryptographic warning |

#### Image tool forms

| Tool endpoint | File selection | Additional controls | Result |
| --- | --- | --- | --- |
| `/tools/image/compress` | 1 png/jpg/jpeg/webp | quality int1–100 default80 | Same-format image |
| `/tools/image/convert` | 1 png/jpg/jpeg/webp | format required png/jpg/webp | Converted image |
| `/tools/image/resize` | 1 image | width and/or height int1–8000; never upscale | Resized image |
| `/tools/image/crop` | 1 image | left/top int0–8000; width/height int1–8000; backend verifies bounds | Cropped image |
| `/tools/image/rotate` | 1 image | angle required 90/180/270 | Rotated image |
| `/tools/image/flip` | 1 image | direction required horizontal/vertical | Flipped image |
| `/tools/image/grayscale` | 1 image | None | Grayscale image |
| `/tools/image/blur` | 1 image | sigma .3–50 default5 | Blurred image |
| `/tools/image/sharpen` | 1 image | sigma .5–10 default1 | Sharpened image |
| `/tools/image/brightness` | 1 image | level .1–3 default1.2 | Adjusted image |
| `/tools/image/contrast` | 1 image | level .1–3 default1.2 | Adjusted image |
| `/tools/image/pixelate` | 1 image | blocks int4–100 default20 | Pixelated image |
| `/tools/image/watermark` | 1 image | text 1–100; position enum; opacity .05–.8 default.5; size int8–144 default24 | Watermarked image |
| `/tools/image/metadata` | 1 image | None | **JSON** image metadata |
| `/tools/image/exif-remove` | 1 image | None | Re-encoded metadata-stripped image |
| `/tools/image/favicon` | 1 image | None | ZIP favicon pack |
| `/tools/image/social` | 1 image | preset required: og/square/story/banner | Cover-fit image |
| `/tools/image/passport` | 1 image | None | 413×531 center crop; no face detection |
| `/tools/image/montage` | 2–9 images | cols/rows int1–3 default2; exact `cols×rows` count; gap 0–50 default4; hex background default `#ffffff` | Grid image |

#### Document tool forms

| Tool endpoint | File selection | Additional controls | Result / limitation |
| --- | --- | --- | --- |
| `/tools/document/to-pdf` | 1 `.docx` | None | PDF; extracted/re-rendered text, not source layout |
| `/tools/document/word-to-txt` | 1 `.docx` | None | TXT |
| `/tools/document/word-to-html` | 1 `.docx` | None | HTML download |
| `/tools/document/word-to-markdown` | 1 `.docx` | None | Markdown download |
| `/tools/document/txt-to-pdf` | 1 `.txt`, UTF-8, max2000 lines | None | PDF |
| `/tools/document/excel-to-csv` | 1 `.xlsx` | None | First worksheet CSV |
| `/tools/document/excel-to-json` | 1 `.xlsx` | None | First worksheet JSON |
| `/tools/document/csv-to-json` | 1 `.csv` | None | JSON |
| `/tools/document/csv-to-excel` | 1 `.csv` | None | XLSX |
| `/tools/document/json-to-csv` | 1 `.json` | None | CSV; array of objects, max50k rows/100 columns |
| `/tools/document/markdown-to-html` | 1 `.md`/`.markdown`, max500k characters | None | HTML download; default to download, not unsandboxed embedding |
| `/tools/document/metadata` | 1 `.docx`/`.xlsx` | None | **JSON** document metadata |
| `/tools/document/compress` | 1 `.docx`/`.xlsx` | None | Repacked same-type file |

#### File/archive and URL tool forms

| Tool endpoint | Input/control | Result |
| --- | --- | --- |
| `/tools/file/zip-create` | 2–20 allowed files; executable types blocked; combined 50 MiB server cap | ZIP |
| `/tools/file/zip-extract` | 1 `.zip`; archive limits enforced by backend | **JSON** extracted-file manifest/download URLs |
| `/tools/file/hash` | 1 file with extension | **JSON** SHA-256/SHA-512/size |
| `/tools/file/base64-encode` | 1 supported file, max5 MiB | Base64 text file |
| `/tools/file/base64-decode` | 1 txt/b64/md/csv/json, valid Base64 | Binary download |
| `/tools/file/metadata` | 1 file | **JSON** detected type/hash/line metadata |
| `/tools/file/type` | 1 file | **JSON** sniffed type/MIME |
| `/tools/file/merge` | 2–20 txt/md/csv/json with one shared extension | Text download |
| `/tools/file/split` | 1 txt/md/csv/json text file | ZIP chunks |
| `/tools/file/compress` | 1 txt/md/csv/json/html/bin, max5 MiB | Gzip |
| `/tools/file/rename` | 2–20 common files plus pattern containing `{i}` | ZIP |
| `/tools/file/folder-to-zip` | 2–20 common files plus `paths` JSON array matching file count | ZIP |
| `/tools/file/tar-create` | 2–20 common files, combined50 MiB server cap | TGZ |
| `/tools/file/tar-extract` | 1 tar/tgz/gz | ZIP |
| `/tools/file/zip-to-tar` | 1 zip | TGZ |
| `/tools/file/tar-to-zip` | 1 tar/tgz | ZIP |
| `/tools/url/status` | JSON `{url}` 1–2000 | **JSON** status/redirect/content data |
| `/tools/url/metadata` | JSON `{url}` 1–2000 | **JSON** HTML metadata |
| `/tools/url/dns` | JSON `{domain}` valid hostname max253 | **JSON** DNS records |
| `/tools/url/ssl` | JSON `{domain}` valid hostname max253 | **JSON** certificate data |

## 18. CRUD Requirements

### User profile

- **Read:** display id/email/name from `/users/me` or `/auth/me`.
- **Edit:** only name update is supported.
- **Delete:** destructive confirmation dialog, delete call, purge token/query cache/local ephemeral results, redirect home.
- **Create:** registration only; no user creation UI for admins.

### Favorites

- **List:** no pagination/search API; responsive cards using included tool summary.
- **Create/delete:** favorite/unfavorite from catalog/tool cards. Use optimistic UI only with rollback on failure.
- **Details/edit:** not supported or needed.

### History

- **List:** paginated API list, newest first.
- **Delete:** clear all own history with confirmation.
- **Create:** do not expose a manual history-creation form. The frontend may optionally call POST after a completed tool flow only after product owners define trustworthy content rules. [OPTIONAL]
- **Edit/details:** no API support.

### Admin records

- Tool and user lists are read-only. Search/pagination only.
- Category mutation UI is explicitly excluded until backend writes stop returning 501.

## 19. Tables

| Table/list | Columns/data | Sort/filter | Mobile behavior |
| --- | --- | --- | --- |
| Tool catalogue | icon, name, description, category, capability badges, favorite | backend category/search/page; no sort parameter | card grid throughout; no dense table |
| History | tool slug/name if resolvable, summary, created date | backend page only | timeline cards; summary truncates then expands |
| Admin tools | name, slug, active, category id, sort order | backend search/page; no sortable API | stacked cards with key/value rows |
| Admin users | email, name, created date, ID | backend search/page; no sortable API | stacked cards; copy ID action |

Do not add bulk selection/actions: no corresponding API exists.

## 20. Search & Filtering

- **Catalog:** search input debounced about 300 ms; category chip selection; preserve `search`, `category`, `page`, and `limit` in URL; reset to page 1 when search/filter changes. [BACKEND SUPPORTED]
- **Admin lists:** search debounced about 300 ms; preserve `search`, `page`, and `limit` in URL. [BACKEND SUPPORTED]
- **Global search:** routes to catalog search rather than maintaining a separate unsupported search endpoint. [FRONTEND ONLY]
- **History/favorites:** no backend search/filter query. Do not claim server searching. Small client-side filtering may be offered only if it clearly states it searches currently loaded records. [OPTIONAL]

## 21. Pagination

| Feature | Backend limit | UI requirement |
| --- | ---: | --- |
| Tool catalogue/category | 1–50, default20 | Numbered pages on desktop; previous/next plus page indicator on mobile |
| History | 1–50, default20 | Previous/next plus page indicator; preserve URL |
| Admin tools/users | 1–100, default50 | Table footer with page controls and results count |

Use `total`, `page`, and `limit` from the response. Do not use infinite scrolling because the API is page-based and admin lists need controlled navigation.

## 22. Dashboard

There is no aggregate dashboard or analytics endpoint. The only valid dashboard is the authenticated **Personal Home** described in section 10.

| Element | Data source | Interaction |
| --- | --- | --- |
| Favorite tools | `GET /favorites` | Open/unfavorite |
| Recent history | `GET /history?limit=5` | Open history/tool |
| Subscription status | `GET /subscriptions/me` | Open subscription page |
| Quick tool search | Catalog route | Navigate to tools |
| Optional counts | Favorites/history `items`/`total`, catalog `total` | Informational only |

Do not render charts, date-range filters, revenue, conversion, active-user, or usage KPI widgets. [BACKEND SUPPORT REQUIRED]

## 23. Authentication UX

### Login

1. Submit credentials to `/auth/login`.
2. On success store token according to section 36, seed session user from response, then verify/fetch `/auth/me`.
3. Redirect to safe `returnTo` route or `/app/home`.
4. On `401`, show “Email or password is incorrect.” Do not distinguish unknown email/password.
5. On `429`, preserve input and show retry guidance.

### Registration

1. Validate known limits locally.
2. Submit `/auth/register`.
3. Map `EMAIL_TAKEN` to email field error.
4. On success proceed as login.

### Logout

Call `/auth/logout` as a best-effort acknowledgement, then clear local token/query cache/client-only results regardless of network result. The backend cannot revoke the token.

### Expired/invalid session

On a protected API `401`, clear session once, preserve intended path when safe, show session-expired notice, and redirect to `/login?returnTo=...`. No refresh-token retry is allowed because no refresh endpoint exists.

## 24. Authorization UX

- A protected route shows a brief session-check skeleton, then renders or redirects to login.
- A `403` renders an access-denied page, not a login loop.
- Admin navigation is provisional because the token/user payload has no role; determine it by querying an admin endpoint after authentication or first admin navigation.
- Disable/hide unavailable actions but preserve explanatory copy where useful: “Category management is not available yet.” Do not send users to 501 controls.

## 25. API Integration

### Axios client

- Base URL from `VITE_API_BASE_URL`; default developer value may be `/api/v1` only when a local proxy is configured. [FRONTEND ONLY]
- JSON `Content-Type` for JSON bodies; never set multipart `Content-Type` manually.
- Attach `Authorization: Bearer <token>` only when a token exists; public tools must work without it.
- Set a reasonable UI timeout such as 30 seconds, but present long transform timeout errors honestly; backend itself has no async execution UI.
- Normalize backend envelope errors into `{status, code, message, details}`.
- Treat raw `GET /files/:fileId` as a binary download, not a JSON response.
- Use AbortController/cancellation for type-ahead and route changes. Do not cancel an in-flight transform unless backend cancellation exists—it does not.

### Error-code mapping

| Code/status | UI response |
| --- | --- |
| 400 `VALIDATION_ERROR` | Inline field errors or form alert; preserve upload selection when safe |
| 401 | Session-expired/login redirect for protected requests |
| 403 | Access-denied page or action toast |
| 404 tool/category | In-page not-found/tool unavailable state |
| 409 `EMAIL_TAKEN`/`ALREADY_FAVORITED` | Inline email error / reconcile favorite state |
| 410 `FILE_EXPIRED` | “Result expired; run the tool again” result state |
| 413 | File too large message with actual selected-file details |
| 429 | Disable repeat submit temporarily and show retry copy |
| 501 | Feature unavailable; do not expose as normal flow |
| 5xx/network | Retry panel; never imply file result exists |

## 26. Data Fetching

### Query keys

- `categories`
- `tools({category,search,page,limit})`
- `tool(slug)`
- `me`
- `favorites`
- `history({page,limit})`
- `subscription`
- `adminTools({search,page,limit})`
- `adminUsers({search,page,limit})`

### Cache/invalidation

- Catalog/categories: stale for several minutes; invalidate on no current frontend mutation.
- `favorites`: invalidate/update after favorite mutation.
- `history`: invalidate after an approved automatic history record or clear operation.
- `me`: invalidate after profile update; remove after logout/account deletion.
- Admin lists: short stale time and refetch on search/page change.
- Tool transforms: mutations only; do not cache files/URLs beyond the current result session due to one-hour expiry and no list API.

## 27. State Management

| State type | Recommended home |
| --- | --- |
| API data | TanStack Query |
| Form fields/errors | React Hook Form/local state |
| URL search/filter/page | React Router search parameters |
| Access token/session user | Minimal Zustand store or React context, with persistence policy |
| Theme/drawer/open dialogs | Local state or small UI store |
| Immediate tool result | Local route state/store; clear on logout/navigation expiration |

Avoid a global store for catalog data, form state, or server lists.

## 28. URL State

Use URL parameters for shareable, non-sensitive state:

```text
/tools?search=pdf&category=pdf&page=2&limit=20
/app/history?page=2&limit=20
/admin/users?search=example&page=1&limit=50
```

Do not put JWTs, uploaded file names, file IDs, raw tool parameters, history summaries, or result download URLs into the URL.

## 29. Loading States

| Area | Loading UI |
| --- | --- |
| Catalog/category grids | Tool-card skeletons retaining grid geometry |
| Tool metadata | Workspace header skeleton then form skeleton |
| File processing | Disabled primary button, visible progress phase (“Uploading/Processing”), selected file list remains visible; use indeterminate progress because backend has no progress API |
| URL inspection | Inline button spinner and result-panel skeleton |
| Favorites/history | Cards/timeline skeleton; no full shell spinner |
| Admin lists | Table-row skeletons on desktop, cards on mobile |
| Auth/profile mutation | Button-level loading; fields remain visible |
| Session validation | Small route-gate skeleton |

## 30. Empty States

| Area | Required message/action |
| --- | --- |
| Catalog search | “No tools match these filters.” Clear filters and browse categories actions |
| Favorites | “Save the tools you use most.” Browse tools CTA |
| History | “Your tool history is empty.” Browse tools CTA |
| Admin search | “No matching records.” Clear search action |
| Tool result | Before run: concise supported-input guidance, not a blank panel |
| Subscription | Backend free fallback is a valid state, not an empty/error state |

## 31. Error States

- Use inline field validation for local/400 form errors.
- Use result-panel errors for tool failures so the selected files and parameters remain visible.
- Use a page-level retry panel only when primary data cannot load.
- `401`: redirect only for protected API calls; public tool failure must not prompt login unless the user chooses it.
- `403`: show access context and return link.
- `404`: tool/category-specific page explains it may have been removed.
- `409`: preserve user intent and reconcile with current data.
- `429`: show rate-limit language; do not implement countdown based on unavailable reset headers.
- `500`/network: preserve unsent form data, provide retry, and avoid technical detail.

## 32. Notifications

There is no backend notification model or API. Do not implement a notification bell, badge, inbox, read/unread state, or notification settings. [BACKEND SUPPORT REQUIRED]

Use ephemeral in-app toasts only:

- success: favorite saved/removed, profile updated, history cleared, result ready;
- error: failed request, download failure, validation summary;
- warning: file expiry, visual-only redact, non-cryptographic sign;
- info: signed-out completion or rate-limit guidance.

## 33. File Uploads

### Shared UX requirements

- Drag/drop zone and accessible file picker.
- Explain allowed extensions, maximum number of files, and per-file size before selection.
- Show name, extension, size, remove action, and validation error for every selected file.
- Validate known limits on the client, but always allow server errors to be authoritative.
- Do not upload automatically on selection; require an explicit Run/Convert button.
- Support removing/replacing files before submit.
- Do not offer upload cancellation once processing starts; backend has no cancellation endpoint.
- Do not promise persistent uploads or a result library.
- Use `files` for tool endpoints and singular `file` only for the distinct validation-only `/files/process` endpoint.

### Tool-specific form families

| Family | UI |
| --- | --- |
| Single file, no parameters | Dropzone + Run (e.g., compress PDF, EXIF removal) |
| Single file with numeric/select fields | Dropzone + validated parameter controls (image/PDF transforms) |
| Multi-file composition | Reorderable/numbered file queue only where ordering affects output; exact-count hint (merge, montage, ZIP) |
| PDF page operations | Dropzone + ranges/order text field with syntax examples |
| Archive/folder tools | Multi-file queue plus safe paths/pattern control where endpoint supports it |
| URL/DNS/TLS | No file dropzone; URL/domain form and readable structured result |
| Metadata/hash/text extraction | Single-file input plus JSON/readout result panel |

## 34. Responsive Design

| Breakpoint | Layout behavior |
| --- | --- |
| Large desktop (≥1280px) | Full header, optional account side nav, 2-column tool workspace, 3–4 catalog cards |
| Desktop (≥1024px) | Full header, 2–3 catalog cards, tables remain tables |
| Tablet (768–1023px) | Collapsed account side nav, tool workspace stacks support content beneath form, filter rail scrolls |
| Mobile (320–767px) | Drawer navigation, one-column workspace/cards, sticky primary run action when safe, tables become cards, dialogs become bottom sheets/full-screen where content requires |

Additional rules:

- File queues must show clear remove controls at all widths.
- Do not make desktop tables horizontally scroll as the only mobile experience; use admin/history cards.
- Modal dialogs must fit viewport height and permit internal scrolling without hiding actions.
- Result actions use full-width buttons on small screens.

## 35. Accessibility

Target WCAG 2.2 AA.

- Use semantic landmarks, heading order, real labels, and descriptive button text.
- Provide a visible focus indicator and skip-to-main link.
- Ensure file dropzones are keyboard-operable file-picker controls, not drag-only zones.
- Associate field-level errors with controls and announce submission errors through an `aria-live` region.
- Use `aria-busy` for result/list loading where appropriate.
- Trap focus in dialogs/drawers, restore focus to triggers, and support Escape unless destructive submission is in progress.
- Give icon-only actions accessible names.
- Render data tables with semantic table markup on desktop; card alternatives on mobile preserve labels.
- Never communicate file validity, completion, favorites, or errors through color alone.
- Ensure download links/buttons state file format and expiry where possible.

## 36. Security

- Never expose `DATABASE_URL`, JWT secret, storage secrets, AI key, or admin allowlist in the frontend.
- Do not place a backend API secret in `VITE_*` variables.
- Use route guards for UX only; backend remains authorization authority.
- Treat every backend response and catalog description as untrusted display data; render text, not raw HTML.
- Default generated HTML files to download. Do not embed Markdown-to-HTML output unsandboxed; backend stripping is not a complete browser-sanitization policy.
- Validate extensions/sizes on the client for feedback, but do not claim client validation protects the service.
- Prefer memory-only token storage to reduce XSS persistence risk; if persistence is a product requirement, document the risk and use strict CSP/escaping. The backend only supports Bearer tokens, not secure HttpOnly cookie sessions. [BACKEND SUPPORTED constraint]
- Clear session state on 401/logout/account deletion.
- Treat `/files/:fileId` as a sensitive, short-lived link. Do not put it in analytics, browser history, public share URLs, screenshots, or persistent client storage.

## 37. Performance

- Lazy-load admin routes and heavy tool-form configuration groups.
- Code-split PDF/image/document workspace families.
- Cache catalog/categories with TanStack Query.
- Debounce searches; cancel superseded list requests.
- Keep upload previews lightweight; do not decode large local files unnecessarily.
- Do not create a client-side preview for every transform output. Prefer download; selectively preview small images/PDF metadata only when browser-safe and valuable. [OPTIONAL]
- Avoid client-side sorting/filtering of server-paginated admin/catalog records.
- Memoize large tool-card lists only after profiling.
- Avoid chart libraries until aggregate analytics endpoints exist.

## 38. SEO

Public pages need SEO; authenticated/account/admin pages do not.

| Page | Title/meta intent |
| --- | --- |
| Landing | Utilza — Everyday tools for files, PDFs, images, and documents |
| Catalog | Browse utility tools by category |
| Category | `<Category name> tools` using API category metadata |
| Tool page | `<Tool name> — Utilza` using API description |
| Auth/account/admin | `noindex` for account/admin; auth pages may be noindex to avoid thin pages |

Use semantic HTML, canonical URLs where hosting policy supplies them, Open Graph metadata for public routes, and a sitemap only after deployed public routes/domain are known. [UNKNOWN]

## 39. User Flows

### Anonymous server-tool flow

```text
Landing/catalog → Tool workspace → Select files → Configure valid parameters
→ Run → Processing state → Result ready → Download before expiry
```

### Anonymous URL-inspection flow

```text
Catalog/tool page → Enter URL/domain → Validate → Run lookup
→ Structured result or safe backend error → Copy/read result
```

### Registration/login flow

```text
Register or Login → validation → API success → token/session setup
→ safe return path or personal home
```

### Favorite flow

```text
Catalog/tool card → Favorite → login prompt if anonymous
→ POST favorite → UI/cache update → Favorites page
```

### History flow

```text
Personal home → History → paginate → open a currently valid tool
or Clear history → confirmation → DELETE → empty state
```

### Account deletion flow

```text
Account danger zone → confirmation dialog → DELETE /users/me
→ clear session/cache → landing success message
```

### Admin flow

```text
Authenticated session → admin-access API probe
→ show admin nav on success / 403 page on denial
→ search/paginate read-only users or tools
```

## 40. Data Flow

```text
User selects files and parameters
  ↓
ToolWorkspace / ToolParameterForm
  ↓
useToolExecution mutation
  ↓
toolService builds FormData
  ↓
Axios POST /api/v1/tools/<family>/<tool>
  ↓
{ jobId, fileId, downloadUrl, mimeType, size, expiresAt }
  ↓
ToolResultPanel displays expiry + Download action
```

```text
User searches catalogue
  ↓
URL search parameters
  ↓
useToolsQuery
  ↓
toolsService.getList
  ↓
GET /api/v1/tools?search=&category=&page=&limit=
  ↓
TanStack Query cache
  ↓
ToolGrid update
```

## 41. Settings

Only these settings are currently supportable:

| Area | Capability | API |
| --- | --- | --- |
| Profile | Change display name | `PATCH /users/me` |
| Account | Delete own account | `DELETE /users/me` |
| Session | Log out locally/best effort | `POST /auth/logout` |
| Subscription | Read status/tier/expiry | `GET /subscriptions/me` |

Do not design password, email, notification, billing, connected-app, MFA, appearance-sync, or security-device settings without backend support. A local theme preference is acceptable as [FRONTEND ONLY].

## 42. Error Pages

| Page | Message | Primary action |
| --- | --- | --- |
| 401 | “Your session has ended.” | Sign in |
| 403 | “You do not have access to this area.” | Go to tools/home |
| 404 | “We could not find that page or tool.” | Browse tools |
| 500 | “Something went wrong on our side.” | Retry / browse tools |
| Offline/network | “We could not reach Utilza.” | Retry |
| File expired | “This result has expired. Run the tool again.” | Return to tool |

Use a friendly illustration/icon, clear heading, short explanation, and navigation. Never show backend stack traces or raw error objects.

## 43. Frontend Folder Structure

```text
src/
├── app/                 app providers, query client, bootstrap
├── assets/              static brand assets only
├── components/
│   ├── ui/              primitives: button, input, card, badge, dialog
│   ├── feedback/        toast, empty, error, skeleton, progress
│   ├── layout/          header, shell, nav, breadcrumbs
│   └── tool-ui/         reusable upload/result/parameter building blocks
├── features/
│   ├── auth/
│   ├── catalog/
│   ├── tool-workspace/
│   ├── favorites/
│   ├── history/
│   ├── account/
│   ├── subscription/
│   └── admin/
├── hooks/               shared non-feature hooks
├── layouts/             public, account, admin layouts
├── lib/                 axios client, query helpers, formatting helpers
├── pages/               route-level page composition
├── routes/              route declarations and guards
├── services/            API services by actual backend module
├── stores/              minimal session/UI stores
├── styles/              tokens, global styles, Tailwind entry
└── utils/               pure helpers and constants
```

Each feature owns its API hook, forms, feature components, and tests where practical. Shared primitives must not import feature services.

## 44. Component Naming Convention

- PascalCase for React components: `ToolWorkspace`, `FavoriteButton`, `AdminUserTable`.
- Name by domain then responsibility: `ToolUploadForm`, `ToolResultPanel`, `ClearHistoryDialog`.
- Use `Page` suffix only for route-level components: `ToolWorkspacePage`.
- Use `Dialog`, `Drawer`, `Card`, `Table`, `List`, `Form`, `Button`, `Panel`, `State` suffixes consistently.
- Avoid vague names such as `CommonCard`, `DataManager`, or `Utils`.

## 45. Frontend Requirements Matrix

| Feature | Screens | Components | APIs | Roles | Priority |
| --- | --- | --- | --- | --- | --- |
| Catalog discovery | Landing/catalog/category | ToolGrid, ToolCard, filters | categories/tools | All | P0 |
| Backend tool execution | Tool workspace | upload, parameter, result components | 72 tool endpoints | All | P0 |
| URL utilities | Tool workspace | UrlInputForm, JsonResultViewer | 4 URL endpoints | All | P0 |
| Authentication | Login/register | AuthForm, AuthGate | auth endpoints | Anonymous/user | P0 |
| Account profile | Account | ProfileForm, DeleteAccountDialog | users/auth logout | User/admin | P0 |
| Favorites | Catalog/tool/favorites | FavoriteButton, FavoriteToolList | favorites | User/admin | P1 |
| History | Home/history | HistoryTimeline, ClearHistoryDialog | history | User/admin | P1 |
| Subscription read view | Home/subscription | SubscriptionCard | subscriptions/me | User/admin | P2 |
| Admin read views | Admin lists | Admin tables/cards | admin tools/users | Admin | P2 |
| Frontend-only tool logic | Tool workspace | Reviewed local tool renderer | Catalog metadata only | All | P2; exact logic unknown |
| Analytics events | Tool/catalog flows | non-visual tracking service | analytics | All | P3 |
| Payments/jobs/notifications | None | None | unavailable/unfinished | None | Excluded |

## 46. Screen → API Matrix

| Screen | API endpoint(s) | Method | Purpose |
| --- | --- | --- |
| Landing | `/categories`, `/tools?limit=20` | GET | Discovery content |
| Catalog/category | `/tools`, `/categories/:slug` | GET | Search/filter/pagination/category metadata |
| Tool workspace metadata | `/tools/:slug`, `/analytics` | GET, POST | Tool definition and best-effort event |
| PDF workspace | `/tools/pdf/merge`, `split`, `compress`, `to-word`, `from-image`, `rotate`, `delete-pages`, `text`, `metadata`, `watermark`, `number-pages`, `header-footer`, `reorder`, `duplicate`, `flatten`, `search`, `redact`, `metadata-edit`, `to-image`, `sign` | POST | Exact selected PDF operation |
| Image workspace | `/tools/image/compress`, `convert`, `resize`, `crop`, `rotate`, `flip`, `exif-remove`, `favicon`, `pixelate`, `watermark`, `metadata`, `grayscale`, `blur`, `sharpen`, `brightness`, `contrast`, `social`, `passport`, `montage` | POST | Exact selected image operation |
| Document workspace | `/tools/document/to-pdf`, `word-to-txt`, `word-to-html`, `word-to-markdown`, `txt-to-pdf`, `excel-to-csv`, `excel-to-json`, `csv-to-json`, `csv-to-excel`, `json-to-csv`, `markdown-to-html`, `metadata`, `compress` | POST | Exact selected document operation |
| File workspace | `/tools/file/zip-create`, `zip-extract`, `hash`, `base64-encode`, `base64-decode`, `metadata`, `type`, `merge`, `split`, `compress`, `rename`, `folder-to-zip`, `tar-create`, `tar-extract`, `zip-to-tar`, `tar-to-zip` | POST | Exact selected file/archive operation |
| URL workspace | `/tools/url/status`, `metadata`, `dns`, `ssl` | POST | URL/domain result |
| Result download | `/files/:fileId` | GET | Raw result attachment |
| Login/register | `/auth/login`, `/auth/register`, `/auth/me`, `/auth/logout` | POST/GET | Session flows |
| Personal home | `/auth/me`, `/favorites`, `/history`, `/subscriptions/me` | GET | Personal summary |
| Favorites | `/favorites`, `/favorites/:toolId` | GET/POST/DELETE | List and toggle |
| History | `/history` | GET/DELETE | List and clear |
| Account | `/users/me`, `/auth/logout` | GET/PATCH/DELETE/POST | Profile/account state |
| Subscription | `/subscriptions/me` | GET | Read subscription state |
| Admin tools/users | `/admin/tools`, `/admin/users` | GET | Read-only administration |

All paths above are relative to `/api/v1`. Tool input fields and limits are defined by the existing API contract and must be mirrored exactly in the tool-definition registry.

## 47. Screen → Component Matrix

| Screen | Components |
| --- | --- |
| Landing | GlobalHeader, GlobalSearch, CategoryRail, ToolGrid, Footer |
| Catalog/category | PageHeader, CatalogFilters, ToolGrid, CatalogPagination, EmptyState |
| Tool workspace | Breadcrumbs, ToolHero, ToolWorkspace, FileDropzone/UrlInputForm, ToolParameterForm, ToolResultPanel, ToolLimitations |
| Login/register | AuthLayout, AuthForm, PasswordField, InlineError |
| Personal home | AccountNav, WelcomeHeader, FavoriteToolList, HistoryPreview, SubscriptionCard |
| Favorites | AccountNav, FavoriteToolList, EmptyState, ConfirmDialog |
| History | AccountNav, HistoryTimeline, Pagination, ClearHistoryDialog |
| Account | AccountNav, ProfileForm, DeleteAccountDialog |
| Subscription | AccountNav, SubscriptionCard |
| Admin tools/users | AdminGate, PageHeader, SearchInput, AdminTable/AdminCards, Pagination |
| Error pages | ErrorPage, RecoveryActions |

## 48. Feature → Component Matrix

| Feature | Components | Pages |
| --- | --- | --- |
| Discovery | ToolCard, ToolGrid, CategoryRail, CatalogFilters | Landing, catalog, category |
| Tool execution | ToolWorkspace, FileQueue, parameter forms, result/download panels | Tool workspace |
| Auth/session | AuthForm, AuthGate, AccountMenu | Login, register, all protected pages |
| Favorites | FavoriteButton, FavoriteToolList | Catalog, workspace, favorites, home |
| History | HistoryPreview, HistoryTimeline, ClearHistoryDialog | Home, history |
| Account | ProfileForm, DeleteAccountDialog | Account |
| Subscription | SubscriptionCard | Home, subscription |
| Admin | AdminGate, AdminToolTable, AdminUserTable | Admin tools/users |

## 49. Implementation Checklist

### Foundation

- [ ] Create Vite React JavaScript project.
- [ ] Install Router, Axios, TanStack Query, React Hook Form, Zod, Tailwind, Lucide, and date formatting support.
- [ ] Configure environment-driven API base URL.
- [ ] Create API client, envelope/error normalization, query client, and error boundary.
- [ ] Establish semantic design tokens and base accessible primitives.

### Routing and session

- [ ] Implement public/account/admin layouts and routes.
- [ ] Implement token/session store and Axios auth interceptor.
- [ ] Implement protected route, admin gate, 401/403/404 handling.
- [ ] Implement login, registration, logout, session-expiry behavior.

### Discovery

- [ ] Implement categories/tools services and query hooks.
- [ ] Build landing, catalog search/filter/pagination, category page, and tool cards.
- [ ] Build tool metadata route and capability badges.
- [ ] Implement favorites affordances with authenticated gating.

### Tool execution

- [ ] Build frontend tool-definition registry based solely on existing endpoints.
- [ ] Build shared file dropzone/queue and client limit feedback.
- [ ] Build parameter panel primitives for number/select/text/ranges/JSON fields.
- [ ] Build multipart mutation service and result/download panel.
- [ ] Implement PDF, image, document, file, and URL configurations incrementally.
- [ ] Add mandatory limitation notices for redact/sign/conversion/expiry.
- [ ] Add analytics calls as non-blocking best effort.

### Account

- [ ] Build personal home using only favorites/history/subscription data.
- [ ] Build favorites, history clear, profile update, account deletion, and subscription view.
- [ ] Do not create unsupported password/billing/notification UI.

### Admin

- [ ] Build API-backed admin access probe/gate.
- [ ] Build read-only tool and user list pages with search/pagination.
- [ ] Exclude category mutation controls.

### Quality

- [ ] Implement all loading, empty, error, expired-file, and rate-limit states.
- [ ] Verify keyboard navigation, focus, dialogs, contrast, and screen-reader behavior.
- [ ] Verify mobile/table/card transformations.
- [ ] Test every implemented API integration against the running backend.
- [ ] Test signed-out, expired-token, forbidden-admin, and expired-download journeys.

## 50. Implementation Order

1. **Foundation:** Vite, routing, design tokens, API client, query provider, error boundary.
2. **Design system:** primitives, responsive shell, feedback states, accessibility baseline.
3. **Catalog/discovery:** landing, tools, categories, filters, URL state.
4. **Authentication/session:** registration, login, logout, route guards.
5. **Tool workspace core:** metadata, common upload/result flow, download handling.
6. **Tool families:** PDF/image/document/file/URL forms in small verified batches.
7. **Account:** home, favorites, history, profile, subscription.
8. **Admin:** access probe and read-only lists.
9. **Polish:** analytics events, responsive refinements, SEO, accessibility audit, performance profiling.
10. **Acceptance:** verify every screen against actual backend response/error behavior and update this specification only after backend changes are confirmed.

## 51. AI Coding Agent Handoff

# INSTRUCTIONS FOR THE FRONTEND CODING AGENT

1. Read this `WEB_APP_REQUIREMENTS.md` before writing code.
2. Read `BACKEND_ANALYSIS.md` if it is added later; currently use `docs/BACKEND-FRONTEND-INTEGRATION-SPEC.md` and the actual backend source as the backend reference.
3. Inspect actual backend routes, schemas, and `docs/API.md` whenever a field, response, status, or limit is uncertain.
4. Follow the API contract exactly. Do not invent endpoints, request fields, response fields, roles, permissions, tool parameters, or workflow states.
5. Do not modify backend APIs unless explicitly instructed in a separate task.
6. Treat labels in this document as scope controls. Do not turn `[BACKEND SUPPORT REQUIRED]` items into apparently working features.
7. Build in the implementation order above, using reusable primitives and feature components rather than duplicating tool screens.
8. Follow the design system, responsive behavior, accessibility requirements, and all loading/empty/error states.
9. Respect public, authenticated, and admin permissions both in route UX and API error handling.
10. Test each feature against the backend before moving to the next feature. Verify success, validation failure, unauthorized, forbidden, rate-limited, and expired-result paths where applicable.
11. Keep generated-file download links ephemeral and avoid leaking them into persistent client storage or analytics.

Treat this file as the frontend product specification.

## 52. Final Product Vision

The finished web app should feel like a polished, high-trust utility product rather than a collection of API forms or a generic CRUD dashboard. A visitor should understand what a tool does, whether it works locally or on the server, what it accepts, and what will happen to its result before uploading anything. The interface should be quick to scan, calm under error conditions, excellent on a phone, and explicit about important limitations such as result expiry, visual-only PDF redaction, and text-only conversions.

Registered users should experience meaningful convenience through favorites, history, and account controls without being forced into an oversized dashboard. Administrators should have restrained, clearly read-only operational views. Across every route, the application should remain accessible, responsive, predictable, and faithful to the backend that exists today.
