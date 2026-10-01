# EverydayTools --- Backend Specification

## 1. Purpose

The backend is a Node.js REST API responsible for server-side
functionality.

Technology:

-   Node.js
-   TypeScript
-   Express
-   Prisma
-   PostgreSQL
-   Neon

The backend must be modular, secure, testable, and easy to extend.

------------------------------------------------------------------------

## 2. Responsibilities

The backend handles:

-   Authentication
-   User accounts
-   Profiles
-   Favorites
-   Tool metadata
-   Tool discovery
-   History synchronization
-   Usage tracking
-   Analytics events
-   Subscription state
-   Server-side file processing
-   Upload validation
-   Rate limiting
-   Administrative functionality
-   API health checks

Simple calculations should not unnecessarily pass through the backend.

------------------------------------------------------------------------

## 3. Database

Database provider:

**Neon PostgreSQL**

ORM:

**Prisma**

Environment variable:

``` env
DATABASE_URL="postgresql://..."
```

Never commit `.env` files.

Use `.env.example` with placeholders.

------------------------------------------------------------------------

## 4. Initial Prisma Data Model

Core entities:

-   User
-   Category
-   Tool
-   Favorite
-   ToolHistory
-   Subscription

Possible future entities:

-   RefreshToken / Session
-   UsageEvent
-   FileJob
-   Notification
-   Device
-   FeatureFlag
-   AdminUser

Database schema should evolve through Prisma migrations.

Development:

``` bash
npx prisma migrate dev --name <migration-name>
```

Production:

``` bash
npx prisma migrate deploy
```

Do not manually modify the production database schema unless there is a
documented emergency procedure.

------------------------------------------------------------------------

## 5. Suggested Backend Structure

``` text
src/
├── app.ts
├── server.ts
├── config/
│   ├── env.ts
│   └── database.ts
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.routes.ts
│   │   ├── auth.schema.ts
│   │   └── auth.types.ts
│   ├── users/
│   ├── tools/
│   ├── categories/
│   ├── favorites/
│   ├── history/
│   ├── analytics/
│   ├── subscriptions/
│   └── files/
├── middleware/
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   ├── rate-limit.middleware.ts
│   └── validation.middleware.ts
├── lib/
│   ├── prisma.ts
│   └── logger.ts
├── utils/
└── types/
```

Use modular architecture.

Avoid putting all controllers and business logic into a single file.

------------------------------------------------------------------------

## 6. API Versioning

Base URL:

``` text
/api/v1
```

Examples:

``` text
GET /api/v1/tools
GET /api/v1/tools/:slug
GET /api/v1/categories
POST /api/v1/auth/register
POST /api/v1/auth/login
GET /api/v1/users/me
GET /api/v1/favorites
POST /api/v1/favorites
DELETE /api/v1/favorites/:toolId
```

The API should be versioned from the beginning.

------------------------------------------------------------------------

## 7. Authentication

Use secure authentication.

Requirements:

-   Password hashing
-   Input validation
-   Secure tokens
-   Authorization middleware
-   Account ownership checks
-   Rate limiting on authentication endpoints
-   Generic authentication error messages where appropriate

Never return password hashes.

Never log passwords or authentication secrets.

------------------------------------------------------------------------

## 8. Validation

Every externally supplied value must be validated.

Validate:

-   Body
-   Query parameters
-   Route parameters
-   Uploaded files
-   File type
-   File size

Reject invalid input with consistent errors.

Recommended response shape:

``` json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input.",
    "details": []
  }
}
```

Successful responses should follow a consistent structure.

------------------------------------------------------------------------

## 9. Error Handling

Use centralized Express error handling.

Errors should contain:

-   HTTP status
-   Stable error code
-   User-safe message

Development logs may contain technical details, but production responses
must not expose:

-   Stack traces
-   Database credentials
-   Internal paths
-   Secrets
-   Sensitive user information

------------------------------------------------------------------------

## 10. Security

Required protections:

-   Helmet or equivalent security middleware
-   CORS configuration
-   Rate limiting
-   Input validation
-   Secure authentication
-   File upload restrictions
-   Request size limits
-   SQL injection protection through Prisma
-   Authorization checks
-   Environment variable protection

Do not trust client-side authorization.

------------------------------------------------------------------------

## 11. File Processing

File tools may require server processing.

The backend must:

1.  Validate the file.
2.  Validate file size.
3.  Generate a safe temporary identifier.
4.  Process the file.
5.  Return the result.
6.  Delete temporary files.

Never use a user-provided filename as a filesystem path.

Never trust MIME type alone.

Use defense-in-depth validation.

------------------------------------------------------------------------

## 12. Tool Registry

Tools should have database metadata but their actual processing logic
should remain modular.

A tool record may contain:

``` text
id
name
slug
description
categoryId
icon
isActive
```

Processing logic should not be stored as arbitrary executable code in
the database.

The database describes a tool; application code implements it.

------------------------------------------------------------------------

## 13. Analytics

Create a lightweight event system.

Example:

``` json
{
  "event": "tool_completed",
  "toolSlug": "percentage-calculator",
  "platform": "web"
}
```

Avoid storing unnecessary personal information.

Use anonymous identifiers where possible.

------------------------------------------------------------------------

## 14. Logging

Use structured logs.

Log:

-   Request ID
-   HTTP method
-   Route
-   Status
-   Duration
-   Safe error information

Do not log:

-   Passwords
-   Tokens
-   Full private documents
-   Sensitive file contents
-   Payment secrets

------------------------------------------------------------------------

## 15. Testing

Backend testing should cover:

### Unit tests

-   Services
-   Validation
-   Utility functions
-   Business rules

### Integration tests

-   API routes
-   Database interactions
-   Authentication
-   Authorization

### Security tests

-   Invalid tokens
-   Unauthorized access
-   Invalid uploads
-   Rate limits
-   Malformed input

------------------------------------------------------------------------

## 16. Environment Variables

Example:

``` env
NODE_ENV=development
PORT=4000

DATABASE_URL=

JWT_SECRET=

CORS_ORIGIN=http://localhost:5173

STORAGE_ENDPOINT=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
```

Never commit real values.

------------------------------------------------------------------------

## 17. Backend Rules

-   Keep controllers thin.
-   Put business logic in services.
-   Use Prisma only through a controlled database layer where practical.
-   Validate every external input.
-   Use transactions when multiple related writes must succeed together.
-   Keep API responses predictable.
-   Do not build unnecessary endpoints.
-   Do not expose database internals.
-   Design for future web and Flutter clients.
