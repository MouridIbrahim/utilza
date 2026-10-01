# API v1 Contract

Base: `/api/v1`. Success: `{success:true, data}`. Error: `{success:false, error:{code,message}}`.

## Health
- `GET /health` → public
- `GET /api/v1/health` → `{status, uptime, db, version}`

## Tools (public)
- `GET /api/v1/tools?category=&search=&page=1&limit=20` → `{items, page, limit, total}`
- `GET /api/v1/tools/:slug` → 404 `TOOL_NOT_FOUND`

## Categories (public)
- `GET /api/v1/categories`
- `GET /api/v1/categories/:slug` → 404 `CATEGORY_NOT_FOUND`

## Auth
- `POST /api/v1/auth/register {email,password,name?}` → 201 `{user, token}`, 409 `EMAIL_TAKEN`
- `POST /api/v1/auth/login {email,password}` → `{user, token}`, 401 on bad creds
- `POST /api/v1/auth/logout` → `{loggedOut:true}`
- `GET /api/v1/auth/me` → Bearer required

## Users (Bearer)
- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me {name?}`
- `DELETE /api/v1/users/me`

## Favorites (Bearer)
- `GET /api/v1/favorites`
- `POST /api/v1/favorites {toolId}` → 409 `ALREADY_FAVORITED`
- `DELETE /api/v1/favorites/:toolId`

## History (Bearer)
- `GET /api/v1/history?page=&limit=`
- `POST /api/v1/history {toolSlug, inputSummary? max 500}`
- `DELETE /api/v1/history`

## Analytics (public, rate-limited)
- `POST /api/v1/analytics {event, toolSlug?, platform?}`
- events: `tool_opened|tool_completed|tool_failed|file_uploaded|result_downloaded|result_copied|tool_favorited|search_performed`

## Subscriptions (Bearer)
- `GET /api/v1/subscriptions/me` → `{status,tier}` default free
- `POST /api/v1/subscriptions/webhook` → 501 stub

## Files
- `POST /api/v1/files/process` multipart `file` ≤10MB, ext `png|jpg|jpeg|webp|pdf` → MVP validates only
