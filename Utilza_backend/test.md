# Utilza Backend — Manual Endpoint Test Guide

Covers every route in `src/docs.contract.test.ts` (112 entries). Run the
server first (`npm run dev`), then work top to bottom — later sections reuse
the token, tool id, and file id from earlier ones.

```bash
BASE=http://localhost:4000
```

Conventions: success → `{success:true, data}`; failure →
`{success:false, error:{code,message}}`. File tools upload via multipart
field **`files`** and return `{jobId, fileId, downloadUrl, mimeType, size,
expiresAt}` — download the bytes via `GET $BASE/api/v1/files/<fileId>`.

## 0. Setup

- [ ] Start the API: `npm run dev` (or `npm run build && npm start`)
- [ ] `GET $BASE/health` → 200 `{status:"ok"}`
- [ ] `GET $BASE/api/v1/health` → 200, note `data.db` is `true`

## 1. Auth (`/api/v1/auth`)

- [ ] Register: `POST $BASE/api/v1/auth/register`
  `{"email":"tester@example.com","password":"TestPass123!","name":"Tester"}`
  → 201 `{user, token}`. Save `TOKEN`.
- [ ] Duplicate register (same email) → 409 `EMAIL_TAKEN`
- [ ] Bad body (`{"email":"bad"}`) → 400 `VALIDATION_ERROR`
- [ ] Login: `POST $BASE/api/v1/auth/login` same credentials → 200 + token
- [ ] Wrong password → 401 generic `Invalid credentials.`
- [ ] Unknown email → same generic 401 (no account enumeration)
- [ ] `GET $BASE/api/v1/auth/me` with `Authorization: Bearer $TOKEN` → 200 you
- [ ] Same without token → 401 `UNAUTHORIZED`
- [ ] `POST $BASE/api/v1/auth/logout` → 200 `{loggedOut:true}`

From here add `-H "Authorization: Bearer $TOKEN"` where marked 🔒.

## 2. Users (`/api/v1/users`, 🔒 all)

- [ ] `GET $BASE/api/v1/users/me` → your `{id,email,name}`, no `passwordHash`
- [ ] `PATCH $BASE/api/v1/users/me` `{"name":"New Name"}` → updated user
- [ ] `PATCH` with `{"name":""}` → 400 `VALIDATION_ERROR`
- [ ] No token → 401 on all three (check GET)

## 3. Categories (public)

- [ ] `GET $BASE/api/v1/categories` → `{items}` (9: calculators, date-time,
  text, generators, pdf, image, documents, file, url), sorted by `sortOrder`
- [ ] `GET $BASE/api/v1/categories/calculators` → 200, `slug` matches
- [ ] `GET $BASE/api/v1/categories/nope` → 404 `CATEGORY_NOT_FOUND`
- [ ] `POST $BASE/api/v1/categories` without token → 401
- [ ] Same with token (non-admin) → 403; `PATCH`/`DELETE /:slug` same 401/403
  pair (admin writes are 501 `NOT_IMPLEMENTED` by documented decision)

## 4. Tool discovery (public)

- [ ] `GET $BASE/api/v1/tools` → `{items,page,limit,total}`, total ≥ 60
- [ ] `GET $BASE/api/v1/tools?search=percentage` → filtered items
- [ ] `GET $BASE/api/v1/tools?category=pdf` → only pdf tools
- [ ] `GET $BASE/api/v1/tools?limit=50&page=2` → second page
- [ ] `GET $BASE/api/v1/tools/percentage-calculator` → 200 with
  `implementation:"frontend"`, `supportsOffline:true`
- [ ] `GET $BASE/api/v1/tools/pdf-merge` → 200 with
  `implementation:"backend"`, `requiresFile:true`
- [ ] `GET $BASE/api/v1/tools/nope` → 404 `TOOL_NOT_FOUND`
- [ ] Save a backend tool's `id` as `TOOLID` (needed for favorites)

## 5. PDF file tools (multipart `files`, then download via `downloadUrl`)

Prepare fixtures: any 2+ page PDF as `a.pdf` (export one), a PNG as `a.png`.

- [ ] **merge** `POST .../tools/pdf/merge` with 2 PDFs → 200, download opens
  with combined pages; single file → 400 "At least two"
- [ ] **split** `POST .../tools/pdf/split` + `ranges="1"` → 1-page PDF;
  `ranges="9"` on a short doc → 400 out of range; missing `ranges` → 400
- [ ] **compress** `POST .../tools/pdf/compress` → smaller-or-equal valid PDF
- [ ] **to-word** `POST .../tools/pdf/to-word` → `.docx` download containing
  the text (text-level conversion, layout not preserved)
- [ ] **from-image** `POST .../tools/pdf/from-image` with PNG+JPG → multi-page
  PDF (one page per image, A4-fitted)
- [ ] **rotate** `POST .../tools/pdf/rotate` + `angle=90` → rotated PDF;
  `angle=45` → 400; optional `ranges` limits pages
- [ ] **delete-pages** `POST .../tools/pdf/delete-pages` + `ranges="1"` →
  page count drops by one; deleting all → 400
- [ ] **text** `POST .../tools/pdf/text` → `{pageCount, pages, charCount}` JSON
- [ ] **metadata** `POST .../tools/pdf/metadata` → metadata JSON, absent
  fields null, no bytes echoed
- [ ] **metadata-edit** `POST .../tools/pdf/metadata-edit` +
  `title="T" author="A"` → download shows new values; empty body → 400
- [ ] **watermark** `POST .../tools/pdf/watermark` + `text="DRAFT"` → stamped
  PDF; missing `text` → 400
- [ ] **number-pages** `POST .../tools/pdf/number-pages` → "Page 1 of N" text
  present; `format=n` variant works
- [ ] **header-footer** `POST .../tools/pdf/header-footer` +
  `header="H" footer="F"` → both present; neither → 400
- [ ] **reorder** `POST .../tools/pdf/reorder` + `order="2,1"` on 2 pages →
  swapped; `order="1"` (subset) → 400 "every page exactly once"
- [ ] **duplicate** `POST .../tools/pdf/duplicate` + `ranges="1" times=2` →
  page count = original + 2
- [ ] **flatten** `POST .../tools/pdf/flatten` → valid PDF, same pages
- [ ] **search** `POST .../tools/pdf/search` + `query="<known word>"` →
  `{matches:[{page,line}]}`; gibberish query → empty matches, still 200
- [ ] **redact** `POST .../tools/pdf/redact` +
  `regions='[{"page":1,"x":10,"y":10,"w":100,"h":20}]'` → black-boxed PDF
  (visual cover only — text stays extractable, documented)
- [ ] **to-image** `POST .../tools/pdf/to-image` → ZIP with `page-01.png`;
  `format=jpg` variant → `.jpg` entries; `pages="9"` → 400
- [ ] **sign** `POST .../tools/pdf/sign` with PDF + signature PNG +
  `page=1 x=50 y=50 width=150` → stamped PDF (visible mark, not crypto);
  PDF alone → 400
- [ ] Any PDF route with a `.exe` file → 400; with no file → 400

## 6. Image tools (multipart `files`: PNG/JPG/WEBP)

- [ ] **compress** `POST .../tools/image/compress` + `quality=30` → smaller
  file, same dims/format; `quality=101` → 400
- [ ] **convert** `POST .../tools/image/convert` + `format=jpg` on a PNG →
  JPEG bytes; `format=gif` → 400; missing `format` → 400
- [ ] **resize** `POST .../tools/image/resize` + `width=200` on 400×300 →
  200×150; neither dim → 400
- [ ] **crop** `POST .../tools/image/crop` + `left/top/width/height` inside
  bounds → exact region; overflowing region → 400 with real dimensions
- [ ] **rotate** `POST .../tools/image/rotate` + `angle=90` on 400×300 →
  300×400 (pixels move, unlike PDF rotate); `angle=45` → 400
- [ ] **flip** `POST .../tools/image/flip` + `direction=horizontal` → same
  dims/format; `direction=diagonal` → 400
- [ ] **grayscale** `POST .../tools/image/grayscale` (no params) → valid image
- [ ] **blur** `+ sigma=3`, **sharpen** `+ sigma=2`, **brightness** and
  **contrast** `+ level=1.5` → all 200; `sigma=999` → 400
- [ ] **pixelate** `POST .../tools/image/pixelate` + `blocks=8` → same dims,
  coarse blocks
- [ ] **watermark** `POST .../tools/image/watermark` + `text="DRAFT"` → valid
  image; missing text → 400
- [ ] **metadata** `POST .../tools/image/metadata` → `{format,width,height,
  space,channels,...,size}` JSON, no bytes
- [ ] **exif-remove** `POST .../tools/image/exif-remove` on a tagged JPEG →
  `orientation` gone, dims kept
- [ ] **favicon** `POST .../tools/image/favicon` → ZIP with 16/32/48/180/192
  PNGs + `site.webmanifest` (verify a 16px icon's dims)
- [ ] **social** `POST .../tools/image/social` + `preset=og` → exactly
  1200×630; bad preset → 400
- [ ] **passport** `POST .../tools/image/passport` (no params) → exactly
  413×531
- [ ] **montage** `POST .../tools/image/montage` + `cols=2 rows=2` + 4 images
  → 204×204 (2×100 + default gap 4); 3 images → 400 "requires exactly 4"

## 7. Document tools

Prepare: `doc.docx` (Word), `notes.txt`, `data.csv`, `data.json`, `doc.md`.

- [ ] **to-pdf** `POST .../tools/document/to-pdf` with docx → text-rendered
  PDF (word-wrap, Latin scripts; tables/images not preserved)
- [ ] **word-to-txt/html/markdown** → `.txt` paragraphs / escaped single-page
  `.html` (`&amp;` entities) / `.md` text
- [ ] **txt-to-pdf** with notes.txt → paginated PDF; binary bytes → 400;
  blank file → 400
- [ ] **excel-to-csv / excel-to-json** with a real `.xlsx` → CSV text / JSON
  array keyed by headers; garbage bytes named `.xlsx` → 400
- [ ] **csv-to-json / csv-to-excel / json-to-csv** → converted downloads;
  `{"a":1}` (non-array) to json-to-csv → 400; `{oops` → 400 "not valid JSON"
- [ ] **markdown-to-html** → standalone page with `<h1>` etc.; embedded
  `<script>`/`onclick` stripped; blank file → 400
- [ ] **metadata** with docx → `{format:"docx",creator,title,...}`;
  with xlsx → `{format:"xlsx",...,sheets:N}`; PDF upload → 400
- [ ] **compress** with docx → same-type repack, still opens as ZIP with
  `word/document.xml`; plain zip renamed `.docx` → 400

## 8. File tools

- [ ] **zip-create** with 2+ common files → ZIP with original names;
  single file → 400 "At least two"; `.exe` included → 400
- [ ] **zip-extract** with that ZIP → `{count, files:[{fileId,downloadUrl,
  name,size}]}`; download an entry, verify bytes; garbage `.zip` → 400
- [ ] **hash** any file → `{sha256, sha512, size}` (verify against
  `sha256sum`); nothing stored server-side
- [ ] **base64-encode** → `.b64` text matching `base64` CLI output; decode it
  back via **base64-decode** → byte-identical; `!!!` input → 400
- [ ] **metadata** any file → `{name,size,detectedType,detectedMime,sha256,
  textLines}`; PDF detected as `pdf` even named `.txt`
- [ ] **type** PDF named `.txt` → `{type:"pdf"}` (extension ignored)
- [ ] **merge** two `.txt` → concatenated download; mixed `.txt`+`.md` → 400
- [ ] **split** 10-line txt → ZIP of parts covering all lines; binary → 400
- [ ] **compress** text file → `.gz` smaller than input, `gunzip` round-trips
- [ ] **rename** 2 files + `pattern="photo-{i}"` → `photo-1.*`, `photo-2.*`;
  pattern without `{i}` → 400
- [ ] **folder-to-zip** 2 files + `paths='["docs/a.txt","img/b.txt"]'` →
  folder structure preserved; `["../evil","b"]` → 400; count mismatch → 400
- [ ] **tar-create** 2 files → `.tgz` (gzip magic `1f8b`); **tar-extract** →
  entries back; garbage `.tar` → 400
- [ ] **zip-to-tar** then **tar-to-zip** round-trip → identical content
- [ ] `POST .../tools/file/process` with no file → 400 (legacy stub route)

## 9. URL tools (JSON bodies, public, rate-limited)

- [ ] **status** `POST .../tools/url/status` `{"url":"https://example.com"}`
  → `{ok,status,finalUrl,redirects,contentType,size}`
- [ ] `{"url":"http://127.0.0.1/"}` → 400 (SSRF: private); `file:///etc/passwd`
  and `ftp://...` → 400 (scheme); `notaurl` → 400
- [ ] **metadata** `{"url":"https://example.com"}` → `{title,description,
  openGraph}`; a non-HTML URL → 400
- [ ] **dns** `{"domain":"example.com"}` → `{a,aaaa,mx,txt,ns}`;
  `{"domain":"not a domain!"}` → 400
- [ ] **ssl** `{"domain":"example.com"}` → subject/issuer/`daysLeft`/
  fingerprint; `{"domain":"1.2.3.4"}` → 400 (no IP literals)

## 10. Favorites, history (🔒)

- [ ] `GET $BASE/api/v1/favorites` (no token) → 401; with token → `{items:[]}`
- [ ] `POST $BASE/api/v1/favorites` `{"toolId":"$TOOLID"}` → 201; repeat →
  409 `ALREADY_FAVORITED`; unknown id → 404 `TOOL_NOT_FOUND`
- [ ] `DELETE $BASE/api/v1/favorites/$TOOLID` → 200; list is empty again
- [ ] `POST $BASE/api/v1/history` `{"toolSlug":"word-counter",
  "inputSummary":"smoke"}` → 201
- [ ] `{"toolSlug":"x","inputSummary":"<501 chars>"}` → 400
- [ ] `GET $BASE/api/v1/history` → your entry only; `DELETE` clears it

## 11. Analytics, subscriptions, files download

- [ ] `POST $BASE/api/v1/analytics`
  `{"event":"tool_completed","toolSlug":"word-counter","platform":"web"}`
  → 201; `{"event":"hacked"}` → 400; unknown `toolSlug` → 400
- [ ] `GET $BASE/api/v1/subscriptions/me` (🔒) → free default;
  `POST .../webhook` (public) → 501 `NOT_IMPLEMENTED`
- [ ] `GET $BASE/api/v1/files/<fileId>` from any §5–8 tool → bytes with
  `attachment` disposition; bogus id → 404 `FILE_NOT_FOUND`

## 12. Admin (Bearer + `ADMIN_EMAILS` env)

- [ ] Without token → 401; non-admin token → 403 on `/api/v1/admin/tools`
  and `/api/v1/admin/users`
- [ ] As admin: tools list (incl. inactive, paginated), users list with NO
  `passwordHash` anywhere; `?limit=1000` → 400
- [ ] With `ADMIN_EMAILS` empty → 403 "not configured"

## 13. Jobs (async ledger)

- [ ] `GET $BASE/api/v1/jobs` without token → 401
- [ ] `POST $BASE/api/v1/jobs` `{"type":"video-convert"}` (🔒) →
  404 `NO_WORKER` (fails fast, never stalls)
- [ ] `POST` with `{}` → 400; `GET /jobs/c___...` unknown → 404 `JOB_NOT_FOUND`
- [ ] `GET $BASE/api/v1/jobs` (🔒) → only your jobs

## 14. Security spot-checks

- [ ] `GET` unknown route → 404 `{code:"NOT_FOUND"}` with no paths/stacks
- [ ] Forged/expired JWT on `/users/me` → 401
- [ ] Malformed JSON body → 400 `VALIDATION_ERROR`
- [ ] 101 KB JSON to `/analytics` → 413 `PAYLOAD_TOO_LARGE`
- [ ] Oversize file (>10 MB) to any file tool → 413 `FILE_TOO_LARGE`
- [ ] Response headers include `nosniff`, `SAMEORIGIN`, CSP; no `x-powered-by`
- [ ] Unknown origin gets no `access-control-allow-origin` echo

## 15. Finish (destructive — new throwaway account)

- [ ] Register a fresh user, then `DELETE $BASE/api/v1/users/me` (🔒) → 200;
  its token now 401s everywhere (cascade verified)
- [ ] Full automated gate still green: `npm run format && npm run lint &&
  npm run typecheck && npm test`
