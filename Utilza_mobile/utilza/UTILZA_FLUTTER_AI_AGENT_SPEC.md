# Utilza Flutter Mobile App — AI Agent Implementation Specification

## 0. Purpose

Build the **Flutter mobile application** for the existing `utilza_backend` REST API.

This document is the implementation contract for the AI coding agent. The agent must use the backend exactly as documented here and must **not invent endpoints, request fields, authentication mechanisms, roles, payment flows, realtime features, or background workers**.

The backend/API source documents are:

- `BACKEND-FRONTEND-INTEGRATION-SPEC.md`
- `API.md`

The backend uses a versioned REST API under `/api/v1`. The same API is intended to serve the web client and Flutter client.

---

# 1. Non-Negotiable Agent Rules

1. **Do not change the backend** unless explicitly requested.
2. **Do not invent API endpoints.**
3. **Do not derive API endpoints from tool slugs.** Use the exact endpoint mapping in this document.
4. **Do not invent request fields.**
5. **Do not invent response fields.**
6. **Do not implement a refresh-token flow.** There is no refresh endpoint.
7. **Do not use cookies for authentication.**
8. **Do not store JWT tokens in SharedPreferences.** Use OS-backed secure storage.
9. **Do not expose or store backend secrets in Flutter.**
10. **Do not implement payments.** The backend payment system is not implemented.
11. **Do not implement push notifications/realtime.** No backend contract exists.
12. **Do not implement a working jobs/async-processing UI.** The backend has a jobs scaffold but currently has no workers.
13. **Do not create an admin role locally.** Admin authorization is determined by the backend.
14. **Do not expose admin screens merely because an email looks like an admin email.**
15. **Do not assume a file result is permanent.** Generated download URLs expire after roughly one hour.
16. **Do not automatically retry non-idempotent multipart uploads.**
17. **Do not persist raw user-uploaded files unnecessarily.**
18. **If a requested capability is absent from this contract, report: `BACKEND CONTRACT MISSING`.**
19. Backend validation is authoritative. Client validation is only for UX.
20. Preserve backend HTTP status codes and stable error codes.

---

# 2. Product Overview

Utilza is an EverydayTools application.

There are two kinds of tools:

### A. Frontend/local tools

Tools with:

```text
implementation: "frontend"
```

These tools have **no execution endpoint** on the backend.

Flutter must execute these locally.

Do NOT call an imagined backend endpoint for them.

### B. Backend tools

Tools with:

```text
implementation: "backend"
```

These tools are executed by the backend.

They include:

- PDF tools
- Image tools
- Document tools
- File tools
- URL tools

The Flutter application must call the exact API endpoint associated with each backend tool.

---

# 3. Technology Requirements

Use:

- Flutter
- Dart
- Null safety
- Material 3
- Clean Architecture
- Repository pattern
- Typed API models
- Secure token storage
- Multipart upload support
- Local temporary file handling
- Share/open downloaded files
- Connectivity-aware behavior

Recommended project structure:

```text
lib/
├── core/
│   ├── constants/
│   ├── errors/
│   ├── network/
│   ├── storage/
│   ├── routing/
│   ├── utils/
│   └── widgets/
│
├── features/
│   ├── auth/
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   │
│   ├── catalogue/
│   ├── categories/
│   ├── tools/
│   ├── favorites/
│   ├── history/
│   ├── profile/
│   ├── subscription/
│   ├── analytics/
│   └── admin/
│
└── app/
    ├── app.dart
    ├── router.dart
    └── theme.dart
```

The exact state-management package may be selected by the agent if the existing project does not already define one. Prefer a maintainable solution such as Riverpod, Bloc, or Cubit.

Do not introduce unnecessary dependencies.

---

# 4. Environment Configuration

The Flutter application must use an environment-provided API URL.

Example:

```text
API_BASE_URL=https://api.example.com/api/v1
```

The real production API host is deployment-provided and is currently unknown.

Never hardcode a production backend URL.

Use:

```text
{origin}/api/v1
```

for API requests.

The public health endpoint is:

```text
{origin}/health
```

Important:

If the backend returns:

```json
{
  "downloadUrl": "/api/v1/files/abc..."
}
```

and the configured API base is:

```text
https://example.com/api/v1
```

do NOT produce:

```text
https://example.com/api/v1/api/v1/files/abc
```

Resolve relative download URLs against the server origin correctly.

---

# 5. Global API Contract

All normal JSON success responses use:

```json
{
  "success": true,
  "data": {}
}
```

All normal JSON errors use:

```json
{
  "success": false,
  "error": {
    "code": "STABLE_CODE",
    "message": "Human readable."
  }
}
```

Development validation responses may additionally contain:

```json
{
  "error": {
    "details": {}
  }
}
```

Production normally returns only:

```text
code
message
```

Create reusable Dart models:

```dart
class ApiSuccess<T> {
  final bool success;
  final T data;
}

class ApiError {
  final bool success;
  final ApiErrorBody error;
}

class ApiErrorBody {
  final String code;
  final String message;
  final dynamic details;
}
```

The actual implementation may use sealed classes/freezed/etc., but all API responses must be normalized centrally.

---

# 6. Authentication

Authentication is JWT Bearer authentication.

Login/register returns:

```json
{
  "user": {
    "id": "...",
    "email": "...",
    "name": null
  },
  "token": "..."
}
```

Protected requests must contain:

```http
Authorization: Bearer <token>
```

## Authentication flow

```text
App startup
    ↓
Read JWT from secure storage
    ↓
If token exists
    ↓
GET /auth/me
    ↓
Valid → authenticated application state
Invalid/expired → delete token → unauthenticated state
```

There is:

- no refresh token
- no refresh endpoint
- no cookie session
- no password reset
- no email verification
- no OTP
- no social login
- no server-side logout/revocation
- no token revocation endpoint

Therefore:

**Never implement automatic JWT refresh.**

When the backend returns:

```text
401 UNAUTHORIZED
```

clear the local token and return the user to authentication.

---

# 7. Secure Storage

Use OS-backed secure storage for the JWT.

Suitable implementation:

```text
flutter_secure_storage
```

Never use:

```text
SharedPreferences
```

for the authentication token.

Never:

- log JWTs
- put JWTs in URLs
- put JWTs into analytics
- put JWTs into crash reports
- display JWTs in UI

---

# 8. Auth API

## Register

```http
POST /api/v1/auth/register
```

JSON:

```json
{
  "email": "user@example.com",
  "password": "password",
  "name": "User"
}
```

Validation:

- email: valid email, max 255
- password: 8–128 characters
- name: optional, 1–100 characters

Success:

```text
201
```

Returns:

```json
{
  "user": {
    "id": "string",
    "email": "string",
    "name": "string|null"
  },
  "token": "string"
}
```

Errors:

```text
400 VALIDATION_ERROR
409 EMAIL_TAKEN
429 RATE_LIMITED
```

---

## Login

```http
POST /api/v1/auth/login
```

JSON:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

Success:

```text
200
```

Returns user + token.

Invalid credentials:

```text
401 UNAUTHORIZED
```

The backend deliberately uses generic invalid-credentials behavior. Do not reveal whether an email exists.

---

## Logout

```http
POST /api/v1/auth/logout
```

No authentication is technically required.

Returns:

```json
{
  "loggedOut": true
}
```

Important:

This does NOT revoke the JWT.

Flutter must always delete its locally stored token.

---

## Current user

```http
GET /api/v1/auth/me
```

Bearer required.

Returns:

```json
{
  "id": "string",
  "email": "string",
  "name": "string|null"
}
```

Also available:

```http
GET /api/v1/users/me
```

---

# 9. User Profile

## Get profile

```http
GET /api/v1/users/me
```

Bearer required.

## Update profile

```http
PATCH /api/v1/users/me
```

JSON:

```json
{
  "name": "New Name"
}
```

Name:

```text
1–100 characters
```

Important backend behavior:

Although `null` is accepted by the validation schema, the current handler does not actually clear the existing name.

Therefore do not present a working "clear name" feature unless the backend is changed explicitly.

## Delete account

```http
DELETE /api/v1/users/me
```

Returns:

```json
{
  "deleted": true
}
```

This cascades:

- favorites
- history
- subscription

There is no undo.

Flutter must:

1. show confirmation
2. explain permanent deletion
3. call endpoint
4. clear JWT
5. clear authenticated caches
6. navigate to public application state

---

# 10. Catalogue

## Categories

```http
GET /api/v1/categories
```

Returns:

```json
{
  "items": [
    {
      "...": "category"
    }
  ]
}
```

Only active categories are returned.

Sorted by `sortOrder`.

Category detail:

```http
GET /api/v1/categories/:slug
```

Unknown category:

```text
404 CATEGORY_NOT_FOUND
```

---

# 11. Tools Catalogue

List tools:

```http
GET /api/v1/tools
```

Query parameters:

```text
category
search
page
limit
```

Example:

```text
GET /api/v1/tools?category=pdf&search=merge&page=1&limit=20
```

Rules:

- `category`: exact category slug
- `search`: case-insensitive substring over name/description/slug
- `page`: integer >= 1
- `limit`: integer 1–50
- omit optional values instead of sending empty strings

Response:

```json
{
  "items": [],
  "page": 1,
  "limit": 20,
  "total": 100
}
```

Tool model:

```text
id
name
slug
description
icon
isActive
sortOrder
implementation
platforms
requiresFile
requiresAuth
supportsOffline
categoryId
createdAt
updatedAt
category
```

Category:

```text
category.slug
category.name
```

Important:

Do NOT assume a tool endpoint can be derived from:

```text
/tool/:slug
```

Use the explicit endpoint mapping in this specification.

---

# 12. Tool Routing Logic

Flutter should inspect:

```text
tool.implementation
```

If:

```text
frontend
```

→ open the local implementation.

If:

```text
backend
```

→ open the appropriate backend executor screen.

Never send frontend tools to the backend.

Never assume that every backend endpoint necessarily has a matching catalogue entry.

---

# 13. Favorites

All favorites are scoped to the authenticated user.

## Get favorites

```http
GET /api/v1/favorites
```

Returns:

```json
{
  "items": [
    {
      "id": "string",
      "userId": "string",
      "toolId": "string",
      "createdAt": "ISO-8601",
      "tool": {
        "id": "string",
        "name": "string",
        "slug": "string",
        "icon": "string|null"
      }
    }
  ]
}
```

## Add favorite

```http
POST /api/v1/favorites
```

JSON:

```json
{
  "toolId": "string"
}
```

Success:

```text
201
```

Errors:

```text
404 TOOL_NOT_FOUND
409 ALREADY_FAVORITED
```

## Remove favorite

```http
DELETE /api/v1/favorites/:toolId
```

Returns:

```json
{
  "deleted": true
}
```

The operation is idempotent.

Use the actual `tool.id`.

Do NOT use the slug as `toolId`.

---

# 14. History

History is authenticated and caller-scoped.

## Get history

```http
GET /api/v1/history?page=1&limit=20
```

Returns:

```json
{
  "items": [],
  "page": 1,
  "limit": 20,
  "total": 0
}
```

Newest first.

## Create history record

```http
POST /api/v1/history
```

JSON:

```json
{
  "toolSlug": "tool-slug",
  "inputSummary": "optional summary"
}
```

`inputSummary`:

```text
maximum 500 characters
```

Do not store raw file contents.

The backend does NOT automatically create history.

Flutter must call this endpoint explicitly if the user is authenticated and the product wants that execution recorded.

## Clear history

```http
DELETE /api/v1/history
```

Returns:

```json
{
  "deleted": true
}
```

---

# 15. Subscription

Current endpoint:

```http
GET /api/v1/subscriptions/me
```

Bearer required.

Response is either the subscription or:

```json
{
  "status": "free",
  "tier": "free"
}
```

Important:

Subscription purchasing is NOT implemented.

Do not create:

- checkout
- upgrade payment
- cancellation payment flow
- refund flow
- payment provider UI

The webhook:

```http
POST /api/v1/subscriptions/webhook
```

returns:

```text
501 NOT_IMPLEMENTED
```

Do not expose it as a working feature.

---

# 16. Analytics

Analytics endpoint:

```http
POST /api/v1/analytics
```

Public.

JSON:

```json
{
  "event": "tool_opened",
  "toolSlug": "example-tool",
  "platform": "android"
}
```

Allowed events:

```text
tool_opened
tool_completed
tool_failed
file_uploaded
result_downloaded
result_copied
tool_favorited
search_performed
```

Allowed platforms:

```text
web
android
ios
unknown
```

Success:

```json
{
  "recorded": true
}
```

Do not send PII.

For Flutter always use:

```text
android
```

or:

```text
ios
```

according to platform.

Analytics is currently logged only and does not provide a dashboard.

---

# 17. Health

Public liveness:

```http
GET /health
```

Returns:

```json
{
  "status": "ok",
  "uptime": 123
}
```

API health:

```http
GET /api/v1/health
```

Returns:

```json
{
  "status": "ok",
  "uptime": 123,
  "db": true,
  "version": "0.1.0"
}
```

Important:

`db:false` means the database is unreachable, but the process itself is alive.

---

# 18. File Upload Rules

Most backend processing endpoints use:

```text
multipart/form-data
```

The uploaded file field is exactly:

```text
files
```

The generic validator endpoint is the exception:

```text
file
```

Do not manually set:

```http
Content-Type: multipart/form-data
```

when using a Flutter multipart client if the library needs to generate the boundary.

Let the HTTP library generate the multipart boundary.

Normal maximum:

```text
10 MiB per file
```

Some endpoints have lower combined limits.

Flutter should validate:

- extension
- file count
- approximate file size
- required parameters

But backend validation remains authoritative.

---

# 19. Standard Backend File Result

Most successful transform endpoints return:

```json
{
  "jobId": "uuid",
  "fileId": "cuid",
  "downloadUrl": "/api/v1/files/<fileId>",
  "mimeType": "application/pdf",
  "size": 12345,
  "expiresAt": "ISO-8601"
}
```

This is not actually a long-running background job.

Most transformations are synchronous.

Therefore UI:

```text
Selecting file
      ↓
Validate
      ↓
Uploading/processing
      ↓
Wait
      ↓
Receive result
      ↓
Download/share/open
```

There is no progress API.

Use an indeterminate progress indicator.

---

# 20. Generated File Downloads

Download endpoint:

```http
GET /api/v1/files/:fileId
```

The response is raw bytes, NOT:

```json
{
  "success": true
}
```

Respect:

```text
Content-Type
Content-Disposition
```

Flutter should:

1. fetch bytes
2. save to a temporary/local file
3. use platform open/share functionality
4. optionally record `result_downloaded`
5. never assume permanent storage

Generated URLs expire after roughly one hour.

If download returns:

```text
410 FILE_EXPIRED
```

show:

> This result has expired. Please run the tool again.

Do not repeatedly retry.

There is no delete-generated-file endpoint.

---

# 21. PDF Backend Tools

All below use:

```text
POST /api/v1/tools/<path>
multipart/form-data
files = uploaded file(s)
```

## PDF Merge

```text
POST /api/v1/tools/pdf/merge
```

Files:

```text
2–20 PDFs
```

Result:

```text
PDF download
```

---

## PDF Split

```text
POST /api/v1/tools/pdf/split
```

Files:

```text
exactly 1 PDF
```

Field:

```text
ranges
```

Example:

```text
1-3,5
```

Rules:

- 1–200 range expression
- maximum 500 selected pages

---

## PDF Compress

```text
POST /api/v1/tools/pdf/compress
```

Exactly 1 PDF.

Result:

```text
PDF download
```

Metadata is stripped.

No image downsampling.

---

## PDF to Word

```text
POST /api/v1/tools/pdf/to-word
```

Exactly 1 PDF.

Maximum:

```text
200 pages
```

Produces `.docx`.

Text-only layout.

Scanned image-only PDFs without a text layer are not supported.

---

## PDF From Images

```text
POST /api/v1/tools/pdf/from-image
```

Files:

```text
1–10 PNG/JPG/JPEG
```

Result:

```text
A4 PDF
```

---

## PDF Rotate

```text
POST /api/v1/tools/pdf/rotate
```

Fields:

```text
angle = 90 | 180 | 270
ranges = optional
```

Exactly 1 PDF.

Rotation is absolute.

---

## PDF Delete Pages

```text
POST /api/v1/tools/pdf/delete-pages
```

Fields:

```text
ranges
```

Cannot remove all pages.

---

## PDF Watermark

```text
POST /api/v1/tools/pdf/watermark
```

Fields:

```text
text: 1–100
opacity: 0.05–0.5, default 0.15
size: 12–144, default 48
```

---

## PDF Number Pages

```text
POST /api/v1/tools/pdf/number-pages
```

Fields:

```text
format: n-of-total | n
size: 8–36, default 10
```

---

## PDF Header/Footer

```text
POST /api/v1/tools/pdf/header-footer
```

At least one:

```text
header
footer
```

Each:

```text
1–200 chars
```

Optional:

```text
size: 8–36
```

---

## PDF Reorder

```text
POST /api/v1/tools/pdf/reorder
```

Field:

```text
order
```

Example:

```text
3,1,2
```

Must contain every page exactly once.

---

## PDF Duplicate

```text
POST /api/v1/tools/pdf/duplicate
```

Fields:

```text
ranges
times: 1–10, default 1
```

---

## PDF Flatten

```text
POST /api/v1/tools/pdf/flatten
```

Exactly 1 PDF.

Metadata preserved.

---

## PDF Redact

```text
POST /api/v1/tools/pdf/redact
```

Field:

```text
regions
```

JSON string:

```json
[
  {
    "page": 1,
    "x": 10,
    "y": 10,
    "w": 100,
    "h": 20
  }
]
```

Maximum 100 regions.

IMPORTANT:

This is a visual cover only.

Underlying PDF text remains extractable.

Do not describe this as secure permanent redaction.

---

## PDF to Image

```text
POST /api/v1/tools/pdf/to-image
```

Fields:

```text
format: png | jpg
pages: optional
scale: 1–3, default 2
```

Maximum:

```text
20 pages
```

Returns ZIP.

---

## PDF Sign

```text
POST /api/v1/tools/pdf/sign
```

Files:

```text
1 PDF
1 PNG/JPG signature
```

Fields:

```text
page
x
y
width
```

Default values:

```text
page = 1
x = 50
y = 50
width = 150
```

This is a visible image stamp, NOT a cryptographic signature.

---

## PDF Text Extraction

```text
POST /api/v1/tools/pdf/text
```

One PDF.

Returns JSON:

```json
{
  "pageCount": 10,
  "pages": [],
  "charCount": 1000
}
```

No download.

---

## PDF Metadata

```text
POST /api/v1/tools/pdf/metadata
```

One PDF.

Returns metadata including:

```text
title
author
subject
keywords
producer
creator
creationDate
modificationDate
pageCount
```

Nullable metadata values are possible.

---

## PDF Search

```text
POST /api/v1/tools/pdf/search
```

One PDF.

Field:

```text
query: 1–200 chars
```

Returns:

```json
{
  "pageCount": 10,
  "query": "hello",
  "matches": [
    {
      "page": 1,
      "line": "..."
    }
  ]
}
```

Maximum 50 matches.

Case-insensitive.

---

## PDF Metadata Edit

```text
POST /api/v1/tools/pdf/metadata-edit
```

At least one field:

```text
title
author
subject
keywords
producer
creator
```

Maximum 500 characters each.

Empty string clears a field.

Omitted fields remain unchanged.

---

# 22. Image Backend Tools

## Compress

```text
POST /api/v1/tools/image/compress
```

One:

```text
png/jpg/jpeg/webp
```

Field:

```text
quality: 1–100, default 80
```

Same format.

---

## Convert

```text
POST /api/v1/tools/image/convert
```

Field:

```text
format: png | jpg | webp
```

---

## Resize

```text
POST /api/v1/tools/image/resize
```

At least one:

```text
width
height
```

Each:

```text
1–8000
```

Aspect ratio preserved.

Upscaling is not allowed.

---

## Crop

```text
POST /api/v1/tools/image/crop
```

Fields:

```text
left
top
width
height
```

All must fit actual image dimensions.

---

## Rotate

```text
POST /api/v1/tools/image/rotate
```

Field:

```text
angle: 90 | 180 | 270
```

---

## Flip

```text
POST /api/v1/tools/image/flip
```

Field:

```text
direction: horizontal | vertical
```

---

## Grayscale

```text
POST /api/v1/tools/image/grayscale
```

No fields.

---

## Blur

```text
POST /api/v1/tools/image/blur
```

Field:

```text
sigma: 0.3–50, default 5
```

---

## Sharpen

```text
POST /api/v1/tools/image/sharpen
```

Field:

```text
sigma: 0.5–10, default 1
```

---

## Brightness

```text
POST /api/v1/tools/image/brightness
```

Field:

```text
level: 0.1–3, default 1.2
```

---

## Contrast

```text
POST /api/v1/tools/image/contrast
```

Field:

```text
level: 0.1–3, default 1.2
```

---

## Pixelate

```text
POST /api/v1/tools/image/pixelate
```

Field:

```text
blocks: 4–100, default 20
```

---

## Watermark

```text
POST /api/v1/tools/image/watermark
```

Fields:

```text
text: 1–100
position:
  top-left
  top-right
  bottom-left
  bottom-right
  center

opacity: 0.05–0.8, default 0.5
size: 8–144, default 24
```

---

## EXIF Remove

```text
POST /api/v1/tools/image/exif-remove
```

No fields.

---

## Favicon

```text
POST /api/v1/tools/image/favicon
```

No fields.

Returns ZIP containing:

```text
16px PNG
32px PNG
48px PNG
180px PNG
192px PNG
site.webmanifest
```

---

## Social Image

```text
POST /api/v1/tools/image/social
```

Field:

```text
preset
```

Allowed:

```text
og      = 1200x630
square  = 1080x1080
story   = 1080x1920
banner  = 1500x500
```

---

## Passport Image

```text
POST /api/v1/tools/image/passport
```

No fields.

Output:

```text
413x531
```

Center crop.

There is no face detection.

---

## Image Montage

```text
POST /api/v1/tools/image/montage
```

Files:

```text
2–9 images
```

Fields:

```text
cols: 1–3, default 2
rows: 1–3, default 2
gap: 0–50, default 4
background: hex, default #ffffff
```

The number of files must equal:

```text
cols × rows
```

---

## Image Metadata

```text
POST /api/v1/tools/image/metadata
```

Returns:

```text
format
width
height
space
channels
depth
density
hasAlpha
hasProfile
isProgressive
size
```

---

# 23. Document Backend Tools

## DOCX → PDF

```text
POST /api/v1/tools/document/to-pdf
```

Exactly one `.docx`.

Maximum:

```text
2000 paragraphs
```

Important:

- text-level conversion
- Latin scripts only
- tables/images/columns are not preserved

---

## Word → TXT

```text
POST /api/v1/tools/document/word-to-txt
```

One `.docx`.

Returns text download.

---

## Word → HTML

```text
POST /api/v1/tools/document/word-to-html
```

One `.docx`.

Returns escaped HTML.

---

## Word → Markdown

```text
POST /api/v1/tools/document/word-to-markdown
```

One `.docx`.

Returns Markdown.

---

## TXT → PDF

```text
POST /api/v1/tools/document/txt-to-pdf
```

One UTF-8 `.txt`.

Maximum:

```text
2000 lines
```

---

## Excel → CSV

```text
POST /api/v1/tools/document/excel-to-csv
```

One `.xlsx`.

First worksheet only.

`.xls` is unsupported.

---

## Excel → JSON

```text
POST /api/v1/tools/document/excel-to-json
```

One `.xlsx`.

First row becomes JSON keys.

---

## CSV → JSON

```text
POST /api/v1/tools/document/csv-to-json
```

One `.csv`.

---

## CSV → Excel

```text
POST /api/v1/tools/document/csv-to-excel
```

One `.csv`.

Returns `.xlsx`.

---

## JSON → CSV

```text
POST /api/v1/tools/document/json-to-csv
```

One `.json`.

Input must be an array of objects.

Limits:

```text
50,000 rows
100 columns
```

---

## Markdown → HTML

```text
POST /api/v1/tools/document/markdown-to-html
```

One:

```text
.md
.markdown
```

Maximum:

```text
500,000 chars
```

Scripts and event handlers are stripped.

If rendered inside a web view, sandbox it.

---

## Document Metadata

```text
POST /api/v1/tools/document/metadata
```

One:

```text
.docx
.xlsx
```

DOCX response can contain:

```text
format
title
creator
subject
keywords
created
modified
application
pages
words
```

XLSX response can contain:

```text
format
title
creator
subject
keywords
created
modified
sheets
```

---

## Document Compress

```text
POST /api/v1/tools/document/compress
```

One:

```text
.docx
.xlsx
```

Returns same type.

---

# 24. Generic File Tools

## ZIP Create

```text
POST /api/v1/tools/file/zip-create
```

Files:

```text
2–20
```

Executable files blocked.

Combined maximum:

```text
50 MB
```

---

## ZIP Extract

```text
POST /api/v1/tools/file/zip-extract
```

One `.zip`.

Returns JSON:

```json
{
  "count": 2,
  "files": [
    {
      "fileId": "...",
      "downloadUrl": "...",
      "name": "...",
      "size": 123,
      "mimeType": "..."
    }
  ]
}
```

Maximum:

```text
50 entries
50 MB uncompressed
```

---

## Hash

```text
POST /api/v1/tools/file/hash
```

One file.

Returns:

```json
{
  "sha256": "...",
  "sha512": "...",
  "size": 123
}
```

Bytes are not stored.

---

## File Type

```text
POST /api/v1/tools/file/type
```

One file.

Uses content sniffing rather than extension.

Returns:

```json
{
  "type": "...",
  "mime": "..."
}
```

Possible recognized types include:

```text
png
jpeg
webp
gif
pdf
zip
docx
xlsx
pptx
mp3
mp4
text
unknown
```

---

## File Metadata

```text
POST /api/v1/tools/file/metadata
```

Returns:

```text
name
size
declaredMime
detectedType
detectedMime
sha256
textLines
```

---

## File Merge

```text
POST /api/v1/tools/file/merge
```

Files:

```text
2–20
```

Allowed matching text types:

```text
txt
md
csv
json
```

Mixed extensions are rejected.

---

## File Split

```text
POST /api/v1/tools/file/split
```

One text file.

Returns ZIP of up to 20 line chunks.

---

## File Compress

```text
POST /api/v1/tools/file/compress
```

One file.

Maximum:

```text
5 MB
```

Returns gzip.

---

## Base64 Encode

```text
POST /api/v1/tools/file/base64-encode
```

One file.

Maximum:

```text
5 MB
```

Returns `.b64`.

---

## Base64 Decode

```text
POST /api/v1/tools/file/base64-decode
```

Input:

```text
.txt
.b64
.md
.csv
.json
```

Returns raw bytes.

---

## Rename

```text
POST /api/v1/tools/file/rename
```

Files:

```text
2–20
```

Field:

```text
pattern
```

Must contain:

```text
{i}
```

Example:

```text
document-{i}
```

Returns ZIP.

Executables blocked.

---

## Folder to ZIP

```text
POST /api/v1/tools/file/folder-to-zip
```

Files:

```text
2–20
```

Field:

```text
paths
```

`paths` is a JSON string representing a relative path array.

No:

```text
..
```

Allowed.

---

## TAR Create

```text
POST /api/v1/tools/file/tar-create
```

Files:

```text
2–20
```

Combined:

```text
50 MB
```

Returns `.tgz`.

---

## TAR Extract

```text
POST /api/v1/tools/file/tar-extract
```

One:

```text
.tar
.tgz
.gz
```

Maximum:

```text
50 entries
50 MB uncompressed
```

Returns ZIP.

---

## ZIP → TAR

```text
POST /api/v1/tools/file/zip-to-tar
```

One `.zip`.

Returns `.tgz`.

---

## TAR → ZIP

```text
POST /api/v1/tools/file/tar-to-zip
```

One `.tar` or `.tgz`.

Returns ZIP.

---

# 25. URL Tools

URL tools use JSON, not multipart.

## URL Status

```http
POST /api/v1/tools/url/status
```

JSON:

```json
{
  "url": "https://example.com"
}
```

URL maximum:

```text
2000 characters
```

Response includes:

```text
url
ok
status
finalUrl
redirects
contentType
size
```

Security:

- only public HTTP/HTTPS
- URL credentials rejected
- private DNS/IP targets rejected
- IP literals rejected
- timeout around 10 seconds
- maximum 5 redirects
- fetched body maximum 1 MiB

---

## URL Metadata

```http
POST /api/v1/tools/url/metadata
```

JSON:

```json
{
  "url": "https://example.com"
}
```

Only HTML metadata is supported.

Response:

```text
url
title
description
openGraph
```

---

## DNS

```http
POST /api/v1/tools/url/dns
```

JSON:

```json
{
  "domain": "example.com"
}
```

Bare hostname only.

No IP literal.

Returns:

```text
domain
a
aaaa
mx
txt
ns
```

---

## SSL

```http
POST /api/v1/tools/url/ssl
```

JSON:

```json
{
  "domain": "example.com"
}
```

Returns:

```text
domain
subject
issuer
validFrom
validTo
daysLeft
fingerprint256
```

Port is fixed to:

```text
443
```

---

# 26. Generic Upload Validator

```http
POST /api/v1/files/process
```

Important:

This is NOT a real transform endpoint.

It is an MVP validation stub.

Multipart field:

```text
file
```

Allowed:

```text
png
jpg
jpeg
webp
pdf
```

Maximum:

```text
10 MB
```

Response:

```json
{
  "jobId": "...",
  "originalName": "upload",
  "ext": "...",
  "size": 123,
  "note": "..."
}
```

Do not present this as a processing feature.

---

# 27. Jobs

The backend has job routes, but there are currently no registered workers.

Create job:

```http
POST /api/v1/jobs
```

Currently returns:

```text
404 NO_WORKER
```

for every type because the handler map is empty.

Therefore:

**Do not expose job creation/polling as a normal mobile feature.**

The backend also has:

```http
GET /api/v1/jobs
GET /api/v1/jobs/:id
```

but these should not be surfaced as a user-facing jobs system unless explicitly requested and the backend gains actual workers.

---

# 28. Admin

Admin access is based on the backend environment variable:

```text
ADMIN_EMAILS
```

There is no persisted role field.

There is no `/me/role` endpoint.

Therefore Flutter cannot reliably determine admin status before contacting a protected admin endpoint.

Read-only endpoints:

```http
GET /api/v1/admin/tools?page=&limit=&search=
GET /api/v1/admin/users?page=&limit=&search=
```

Admin tools response:

```text
id
name
slug
isActive
categoryId
sortOrder
```

Admin users response:

```text
id
email
name
createdAt
```

Admin writes are NOT implemented.

Category writes return:

```text
501 NOT_IMPLEMENTED
```

Flutter admin behavior:

- keep admin feature optional
- never trust a local role
- handle `403 FORBIDDEN`
- do not expose category CRUD
- do not expose user mutation controls

---

# 29. Error Handling

Implement one centralized error mapper.

Important codes:

| HTTP | Code | Flutter behavior |
|---|---|---|
| 400 | `VALIDATION_ERROR` | show field/tool validation error |
| 401 | `UNAUTHORIZED` | clear auth and go to login |
| 403 | `FORBIDDEN` | access denied / hide protected feature |
| 404 | `NOT_FOUND` | unavailable/not found |
| 404 | `TOOL_NOT_FOUND` | tool unavailable |
| 404 | `CATEGORY_NOT_FOUND` | category unavailable |
| 404 | `FILE_NOT_FOUND` | result unavailable |
| 404 | `JOB_NOT_FOUND` | job unavailable |
| 404 | `NO_WORKER` | do not retry; feature unavailable |
| 409 | `EMAIL_TAKEN` | registration field error |
| 409 | `ALREADY_FAVORITED` | reconcile favorite state |
| 410 | `FILE_EXPIRED` | tell user to rerun tool |
| 413 | `PAYLOAD_TOO_LARGE` | request too large |
| 413 | `FILE_TOO_LARGE` | select smaller file |
| 429 | `RATE_LIMITED` | back off |
| 429 | `AI_QUOTA_EXCEEDED` | show quota error if ever encountered |
| 500 | `INTERNAL_ERROR` | generic server error |
| 501 | `NOT_IMPLEMENTED` | feature unavailable |
| 502 | `AI_PROVIDER_ERROR` | generic recoverable error |
| 503 | `AI_NOT_CONFIGURED` | feature unavailable |

Never show raw backend stack traces.

---

# 30. Pagination

Pagination is offset based.

```text
page = 1
limit = 20
```

Response:

```json
{
  "items": [],
  "page": 1,
  "limit": 20,
  "total": 100
}
```

Flutter calculates:

```text
totalPages = ceil(total / limit)
```

Pagination exists for:

- tools
- history
- admin tools
- admin users

Limits:

```text
tools: 50
history: 50
admin: 100
```

Flutter requirements:

- prevent duplicate page requests
- preserve already loaded items
- support pull-to-refresh
- reset to page 1 after search/filter changes
- do not invent cursor pagination

---

# 31. Offline Behavior

Offline is valid only for:

- cached catalogue data
- tools marked `supportsOffline:true`
- purely local frontend tools

Backend transformations require connectivity.

Authenticated server state requires connectivity.

Do not pretend that a backend transformation can work offline.

---

# 32. File Picker UX

For each backend tool, dynamically or explicitly build the form around the endpoint contract.

The screen should contain:

1. Tool title
2. Description
3. File picker
4. Selected file list
5. File count validation
6. File extension validation
7. File size validation
8. Tool-specific fields
9. Submit button
10. Processing indicator
11. Result section
12. Download/open/share buttons
13. Expiration information
14. Error state
15. Retry/rerun action where appropriate

Disable duplicate submissions while processing.

---

# 33. Download UX

After successful transform:

```text
Result received
    ↓
Show success
    ↓
Show file type and size
    ↓
Download/save/open/share
```

Because the URL expires, do not save only the remote URL as the permanent user artifact.

Prefer downloading the result to local temporary storage when the user chooses to save/share it.

For:

```text
410 FILE_EXPIRED
```

show a clear "Run Again" action.

---

# 34. Suggested Flutter Packages

If the project does not already have equivalents, the agent may use:

```text
dio
flutter_secure_storage
file_picker
path_provider
share_plus
open_filex
connectivity_plus
json_annotation / freezed
```

Choose versions compatible with the existing Flutter SDK/project.

Do not add packages merely for convenience if existing project code already provides the functionality.

---

# 35. API Client Architecture

Create a centralized API client.

Responsibilities:

```text
Base URL
Headers
JWT injection
JSON serialization
Multipart requests
Response envelope parsing
Error normalization
Timeouts
401 handling
Download bytes
```

Conceptual architecture:

```text
Presentation
    ↓
Repository
    ↓
Remote Data Source
    ↓
ApiClient
    ↓
HTTP
    ↓
utilza_backend
```

Example repository interfaces:

```text
AuthRepository
CatalogueRepository
CategoryRepository
ToolRepository
FavoriteRepository
HistoryRepository
ProfileRepository
SubscriptionRepository
AnalyticsRepository
FileToolRepository
AdminRepository
```

Do not let widgets directly call Dio/http.

---

# 36. API Client Rules

JSON requests:

```http
Accept: application/json
Content-Type: application/json
```

Multipart requests:

```text
do not manually set Content-Type boundary
```

Authorization:

```http
Authorization: Bearer <token>
```

Only add it when a token exists.

Do not automatically attach authorization to downloads unless the backend contract requires it. Generated-file downloads are currently unauthenticated.

Network timeout:

The backend does not expose a client timeout contract. Choose a sensible user-facing timeout in Flutter.

Do not automatically retry:

- login
- register
- file upload
- transform POST requests

unless the retry is explicitly user initiated.

---

# 37. Models

At minimum create typed models for:

```text
PublicUser
Category
Tool
Favorite
ToolHistory
Subscription
FileToolResult
Job
ApiError
Pagination<T>
```

Dates are ISO-8601 strings and should become Dart `DateTime`.

IDs are opaque strings.

Never construct or parse CUIDs for business logic.

---

# 38. Application Screens

Required public screens:

```text
Splash
Home/Catalogue
Category
Search
Tool Detail
Backend Tool Executor
Local Tool Executor
Login
Register
```

Required authenticated screens:

```text
Profile
Favorites
History
Subscription
```

Optional:

```text
Admin Tools
Admin Users
```

Do not implement:

```text
Payment Checkout
Notifications Center
Push Settings
Realtime Jobs
Job Progress
Password Reset
Email Verification
Social Login
```

because no backend contract currently exists.

---

# 39. Navigation

Recommended structure:

```text
Splash
 ├── authenticated → Home
 └── unauthenticated → Home/Login as appropriate

Home
 ├── Categories
 ├── Search
 ├── Tool Detail
 │    ├── Local Tool
 │    └── Backend Tool
 │
 ├── Favorites
 ├── History
 ├── Profile
 └── Subscription
```

Authenticated-only routes must redirect or prompt login.

Public tool execution should remain available for tools whose backend does not require authentication.

---

# 40. Authentication State

Use states conceptually equivalent to:

```text
initializing
unauthenticated
authenticated
authError
```

Bootstrap:

```text
Splash
 ↓
secure storage
 ↓
token?
 ├─ no → unauthenticated
 └─ yes → GET /auth/me
              ├─ success → authenticated
              └─ 401 → delete token → unauthenticated
```

On logout:

```text
POST /auth/logout
delete local token
clear authenticated cache
return public state
```

Even if logout request fails, the local token must still be deleted when the user explicitly logs out.

---

# 41. Local Tool Architecture

The catalogue tells the app whether a tool is:

```text
implementation = frontend
```

For frontend tools:

- do calculations locally
- do not call backend
- do not fake API requests
- record analytics if appropriate
- optionally create history only through the actual history endpoint

The exact list of local tools should come from the backend catalogue rather than hardcoding assumptions where possible.

---

# 42. Backend Tool Architecture

For backend tools:

```text
Tool detail
 ↓
Executor configuration
 ↓
File picker / fields
 ↓
Client validation
 ↓
Multipart request
 ↓
ApiSuccess<FileToolResult> OR JSON result
 ↓
Result UI
```

A reusable executor abstraction is recommended.

Example conceptual model:

```text
ToolExecutorConfig
- endpoint
- method
- fileField
- minFiles
- maxFiles
- allowedExtensions
- fields
- resultType
```

However:

**Do not generate endpoint names from slugs.**

The configuration must map exact known API routes.

---

# 43. JSON Result vs File Result

Not every backend tool returns a file.

Examples of JSON-result tools:

```text
pdf/text
pdf/metadata
pdf/search
image/metadata
document/metadata
file/hash
file/type
file/metadata
file/zip-extract
url/status
url/metadata
url/dns
url/ssl
```

These should display structured result UI.

Examples of file-result tools:

```text
pdf/merge
pdf/split
pdf/compress
image/convert
document/to-pdf
file/zip-create
...
```

These should provide download/open/share functionality.

Do not assume every POST under `/tools` returns a `FileToolResult`.

---

# 44. History Strategy

After successful execution, if the user is authenticated:

```text
POST /api/v1/history
```

Use:

```json
{
  "toolSlug": "...",
  "inputSummary": "..."
}
```

Never put:

- passwords
- JWTs
- raw file contents
- sensitive personal data

inside `inputSummary`.

Keep it short and useful.

---

# 45. Analytics Strategy

Examples:

When opening a tool:

```text
tool_opened
```

When successful:

```text
tool_completed
```

When failed:

```text
tool_failed
```

After upload:

```text
file_uploaded
```

After download:

```text
result_downloaded
```

After copy:

```text
result_copied
```

When favorite is created:

```text
tool_favorited
```

Search:

```text
search_performed
```

Always use the exact allowlisted names.

Do not send PII.

---

# 46. Loading States

Catalogue:

```text
skeleton/shimmer/list loading
```

Tool processing:

```text
indeterminate progress
```

Authentication:

```text
button loading state
```

Download:

```text
download progress where supported
```

Avoid blocking the entire application unnecessarily.

---

# 47. Empty States

Favorites:

> No favorite tools yet.

History:

> No recent tools.

Search:

> No tools match your search.

Categories:

> No tools available in this category.

Subscription:

> You are currently on the free plan.

Backend result:

> No result available.

Do not confuse a server error with an empty dataset.

---

# 48. Security Requirements

Production must use HTTPS.

Never store:

```text
JWT_SECRET
DATABASE_URL
AI_API_KEY
STORAGE_SECRET
ADMIN_EMAILS
```

in Flutter.

Never put secrets in:

- `.env` committed to repository
- Dart source
- API request body
- analytics
- URLs
- filenames

Flutter only receives the public API origin.

Treat server-generated text as data, not executable code.

---

# 49. Backend Contract Limitations

The current backend has these known limitations:

### Missing

- token refresh
- token revocation
- password reset
- email verification
- social login
- current-user role endpoint
- generated file deletion
- durable shared object storage
- admin mutations
- dashboard metrics
- persisted analytics dashboard
- notifications
- realtime
- push
- payments
- checkout
- working background workers
- job progress
- job cancellation

### Important behavior

Generated files are currently stored using process-local temporary storage/in-memory indexing. A backend restart or multi-instance deployment can affect availability.

Flutter should therefore download useful results promptly rather than assuming the remote result URL is durable.

---

# 50. API Contract Problems Not To Hide

The source-confirmed backend has some inconsistencies.

## Profile name clearing

`PATCH /users/me` accepts `name: null` in validation but currently does not clear the value.

Do not build a "clear name" feature as if it works.

## Admin role

There is no role field in `PublicUser`.

Do not create a fake local admin role.

## Jobs

Jobs exist as API scaffolding but creation currently fails with:

```text
NO_WORKER
```

Do not build normal job processing UI.

## Generic files/process

`/files/process` is only a validation stub.

Do not treat it as a real processor.

## Download URLs

Generated downloads are unauthenticated and time-limited.

Treat the URL as capability-like and avoid unnecessary exposure.

## Tool catalogue fallback

Backend catalogue fallback data may not have exactly the same optional fields as DB-backed tool data.

Flutter models should defensively handle nullable/optional fields.

---

# 51. Testing Requirements

The AI agent must create tests for:

## API layer

- success envelope parsing
- error envelope parsing
- 401 behavior
- bearer header
- multipart field names
- query serialization
- download handling

## Auth

- register
- login
- logout
- token persistence
- bootstrap
- expired token
- 401 logout

## Catalogue

- category loading
- tool pagination
- search
- category filtering
- empty results

## Favorites

- load
- add
- delete
- duplicate favorite

## History

- load
- pagination
- create
- clear

## Backend tools

At minimum test representative tools from:

```text
PDF
Image
Document
File
URL
```

## Downloads

- successful bytes
- content type
- expired result
- missing result

## UI

- loading
- success
- empty
- validation
- server error
- retry
- unauthenticated redirect

---

# 52. Implementation Order

The AI agent should implement in this order.

## Phase 1 — Project foundation

- Flutter architecture
- theme
- routing
- dependency injection if needed
- API configuration
- error system

## Phase 2 — Network layer

- API client
- envelopes
- errors
- secure storage
- auth interceptor/header
- download client
- multipart client

## Phase 3 — Models

Create all shared models.

## Phase 4 — Authentication

- splash
- secure token
- login
- register
- logout
- `/auth/me`
- 401 handling

## Phase 5 — Catalogue

- categories
- tools
- search
- pagination
- tool detail

## Phase 6 — Favorites/history/profile

- favorites
- history
- profile
- account deletion
- subscription read-only

## Phase 7 — Local tools

Implement frontend tools locally.

## Phase 8 — Backend executor framework

Build reusable:

- file picker
- multipart request
- parameters
- validation
- processing state
- result handling

## Phase 9 — Backend tools

Implement:

1. PDF
2. Image
3. Document
4. File
5. URL

## Phase 10 — Download/share/open

Implement temporary file storage and platform integration.

## Phase 11 — Analytics

Add allowlisted analytics events.

## Phase 12 — Optional admin

Only read-only admin tools/users.

## Phase 13 — Testing and polish

- unit tests
- repository tests
- widget tests
- error states
- loading states
- offline boundaries
- accessibility
- performance

---

# 53. Definition of Done

The Flutter application is considered complete when:

- [ ] API base URL is configurable
- [ ] API envelope parsing is centralized
- [ ] API error parsing is centralized
- [ ] JWT is stored securely
- [ ] JWT is attached as Bearer
- [ ] 401 clears authentication
- [ ] no refresh-token logic exists
- [ ] registration works
- [ ] login works
- [ ] logout works
- [ ] profile works
- [ ] account deletion works
- [ ] categories work
- [ ] catalogue works
- [ ] search works
- [ ] pagination works
- [ ] local frontend tools work
- [ ] backend tool executors work
- [ ] multipart uploads use `files`
- [ ] generic validator uses `file`
- [ ] client file validation exists
- [ ] server validation errors are displayed
- [ ] JSON-result tools are supported
- [ ] file-result tools are supported
- [ ] downloads work
- [ ] open/share works
- [ ] expired downloads are handled
- [ ] favorites work
- [ ] history works
- [ ] subscription is read-only
- [ ] analytics uses allowlisted events
- [ ] no payment UI exists
- [ ] no fake notifications/realtime exists
- [ ] no fake jobs system exists
- [ ] admin is server-authorized
- [ ] no backend secrets are present
- [ ] tests cover critical API/client behavior

---

# 54. Final AI Agent Instruction

You are implementing a Flutter client for an existing production-style REST API.

Treat this document and the supplied backend/API files as the source of truth.

Your priority order is:

```text
1. Correctness against API contract
2. Security
3. Maintainable architecture
4. Good mobile UX
5. Performance
6. Visual polish
```

Before implementing any API operation, verify:

```text
HTTP method
exact path
authentication requirement
request body/query fields
multipart field name
file count
file size
allowed extension
response type
error codes
```

Never guess.

If the backend does not expose a required operation, do not simulate it with an invented endpoint.

Instead write:

```text
BACKEND CONTRACT MISSING
```

and explain which backend capability is missing.

When implementing backend tools, preserve the exact API contract.

When implementing local tools, keep execution entirely on-device.

When a server result is returned, handle it according to its actual response type.

When a result download expires, ask the user to rerun the tool.

The final application must be a real Flutter mobile client of `utilza_backend`, not a mock frontend.
