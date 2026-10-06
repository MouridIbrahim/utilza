# API Contract Review — 2026-10-06 (maintainer self-review)

Status: this is a **maintainer self-review**, not an independent peer review.
No consumer team exists yet (`Utilza_webApp` = spec only, `Utilza_mobile` =
fresh scaffold). An independent review by the first consumer team is still
recommended; the automated contract test is the standing guard until then.

## Method

1. Enumerated every route mounted in `src/app.ts` + `src/modules/tools/tools.routes.ts`.
2. Checked each appears verbatim in `docs/API.md` (enforced continuously by
   `src/docs.contract.test.ts`: endpoint strings + error-code strings, now
   93 assertions).
3. Grepped every error code in the docs table against `src/**` producers and
   confirmed each is asserted over HTTP in the suite (spot samples below).
4. Ran the full gate: `format → lint → typecheck → test` (see Verification).

## Findings (all clear)

- All 66 tool endpoints + 12 platform endpoints documented; no route exists
  that docs omit, no documented route missing from code.
- Error codes verified end-to-end (selection):
  `TOOL_NOT_FOUND` (tools + favorites 404s), `CATEGORY_NOT_FOUND`,
  `EMAIL_TAKEN` (409 incl. P2002 race path), `ALREADY_FAVORITED`,
  `FILE_EXPIRED` (410 + row flip to `expired`), `VALIDATION_ERROR`,
  `PAYLOAD_TOO_LARGE` (101 KB probe), `FILE_TOO_LARGE` (10 MB+1 probe),
  `RATE_LIMITED` (raw-factory behavior test), `NOT_IMPLEMENTED`
  (subscriptions webhook, category admin stubs), `FORBIDDEN`/`UNAUTHORIZED`.
- Conventions hold everywhere: `{success, data}` / `{success:false,
  error:{code,message}}`, `details` only outside production, Bearer auth,
  pagination `{items,page,limit,total}`, per-tool file limits documented.
- `GONE` default mapping added to the error middleware during this review
  (410s previously fell through to `INTERNAL_ERROR` without an explicit code).

## Consumer-readiness checklist

- [x] Base URL + versioning documented
- [x] Auth flows (register/login/logout/me) with generic 401s (no enumeration)
- [x] Every tool: method, multipart field name (`files`), params, limits, outputs
- [x] Shared execution envelope + download endpoint documented once
- [x] Honest capability notes (text-level conversions, visual-cover redact,
  non-crypto sign, xlsx-only, no face detection)
- [ ] Independent consumer-team review (pending team existence)
