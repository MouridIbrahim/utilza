# EverydayTools --- AI Agent Development Rules

## 1. Role

You are an AI software engineering agent working on the EverydayTools
project.

Your job is to implement the product described in the project
specification while preserving architecture, quality, security,
usability, and consistency.

These rules apply to all generated code.

------------------------------------------------------------------------

# 2. Source of Truth

The five project documents are the primary project specification:

1.  `01-PROJECT.md`
2.  `02-BACKEND.md`
3.  `03-WEB.md`
4.  `04-MOBILE.md`
5.  `05-AI-AGENT-RULES.md`

If another instruction conflicts with these documents, stop and identify
the conflict before making architectural changes.

Do not silently redefine the product.

------------------------------------------------------------------------

# 3. Do Not Build Everything at Once

Do not generate the entire application in one step unless explicitly
instructed.

Work in clearly defined tasks.

For every task:

1.  Understand the requested scope.
2.  Inspect the existing code.
3.  Identify affected files.
4.  Implement only the requested scope.
5.  Run relevant tests/checks.
6.  Report what changed.
7.  Report any remaining issues.

Do not modify unrelated features.

------------------------------------------------------------------------

# 4. Inspect Before Editing

Before changing an existing project:

-   Inspect directory structure.
-   Inspect package configuration.
-   Inspect relevant source files.
-   Inspect Prisma schema before database changes.
-   Inspect routes before adding routes.
-   Inspect existing components before creating duplicates.
-   Inspect existing design tokens before introducing new ones.

Never assume a file has a specific implementation.

------------------------------------------------------------------------

# 5. Architecture Rules

Use modular architecture.

Do not create:

-   One giant backend file
-   One giant React component
-   One giant Flutter widget
-   One giant service containing every tool
-   Duplicate implementations of the same functionality

Keep responsibilities separated.

------------------------------------------------------------------------

# 6. Backend Rules

Backend stack:

-   Node.js
-   Express
-   TypeScript
-   Prisma
-   Neon PostgreSQL

Rules:

-   Use Prisma for PostgreSQL access.
-   Never hardcode database credentials.
-   Never commit `.env`.
-   Validate external input.
-   Use centralized error handling.
-   Use authentication middleware for protected routes.
-   Check authorization on every protected resource.
-   Do not expose secrets.
-   Do not expose database internals.
-   Use migrations for schema changes.
-   Use transactions when required.
-   Keep controllers thin.
-   Keep business logic in services.

------------------------------------------------------------------------

# 7. Database Rules

Database:

**Neon PostgreSQL**

ORM:

**Prisma**

Rules:

-   Use migrations.
-   Use meaningful model names.
-   Use indexes when justified.
-   Use unique constraints where appropriate.
-   Add foreign keys/relations correctly.
-   Use cascade behavior carefully.
-   Do not store large binary files directly in PostgreSQL unless there
    is a documented reason.
-   Do not store sensitive data unnecessarily.

Before changing the Prisma schema, understand the impact on existing
data.

------------------------------------------------------------------------

# 8. Web Rules

Technology:

-   React
-   TypeScript
-   Vite
-   React Router
-   Tailwind CSS
-   TanStack Query

Rules:

-   Use strict TypeScript.
-   Avoid `any`.
-   Reuse components.
-   Keep pages focused.
-   Keep business logic outside presentation components when practical.
-   Use accessible HTML.
-   Keep tool URLs stable.
-   Make each tool SEO-friendly.
-   Avoid unnecessary dependencies.
-   Avoid excessive animations.
-   Optimize performance.

------------------------------------------------------------------------

# 9. Flutter Rules

Technology:

-   Flutter
-   Dart
-   BLoC/Cubit

Rules:

-   Keep widgets focused on presentation.
-   Put logic into Cubits/BLoCs/services.
-   Do not put secrets in the app.
-   Reuse widgets.
-   Support different screen sizes.
-   Handle loading/error/empty states.
-   Keep API access in dedicated services.
-   Keep simple tools usable offline when practical.

------------------------------------------------------------------------

# 10. Tool Development Rules

Every new tool must have:

-   Name
-   Slug
-   Category
-   Description
-   Input design
-   Validation
-   Processing logic
-   Result state
-   Error state
-   Reset behavior
-   Responsive UI
-   Accessibility considerations
-   Tests where applicable

For web:

-   SEO title
-   Meta description
-   Useful content
-   Related tools

For mobile:

-   Native-friendly UI
-   Loading/error states where needed
-   Share/copy/download behavior where relevant

------------------------------------------------------------------------

# 11. Client-Side Processing Rule

Before creating a backend endpoint for a tool, ask:

> Can this safely and efficiently run on the client?

If yes, prefer client-side processing.

Do not create API endpoints for simple calculations merely to make the
architecture look more complex.

------------------------------------------------------------------------

# 12. Security Rules

Never:

-   Hardcode secrets.
-   Commit API keys.
-   Commit database URLs.
-   Store plaintext passwords.
-   Trust client authorization.
-   Trust filenames.
-   Trust MIME types alone for uploads.
-   Log passwords.
-   Log access tokens.
-   Log private file contents.

Always:

-   Validate input.
-   Validate uploads.
-   Limit file size.
-   Apply authorization.
-   Use HTTPS in production.
-   Rate-limit sensitive endpoints.
-   Sanitize user-controlled output where required.

------------------------------------------------------------------------

# 13. Privacy Rules

EverydayTools handles potentially sensitive user data.

Use data minimization.

Ask:

> Do we really need to store this?

If not, do not store it.

For file tools:

-   Prefer browser-side processing when practical.
-   Use temporary storage for server-side processing.
-   Delete temporary files automatically.
-   Never permanently store files without a clear product requirement.

------------------------------------------------------------------------

# 14. Ads Rules

Web:

**Google AdSense**

Mobile:

**Google AdMob**

Rules:

-   Ads must not interfere with tool functionality.
-   Never disguise ads as application buttons.
-   Never encourage accidental clicks.
-   Do not spam interstitials.
-   Keep the user experience more important than ad density.
-   Follow the relevant Google advertising policies.
-   Do not implement ad behavior designed to manipulate clicks.

------------------------------------------------------------------------

# 15. Code Quality

Generated code should be:

-   Readable
-   Maintainable
-   Typed
-   Modular
-   Testable
-   Consistent with existing conventions

Do not over-engineer simple functionality.

Prefer the simplest implementation that satisfies the requirements.

------------------------------------------------------------------------

# 16. Dependencies

Before adding a dependency:

1.  Check whether the project already has a library that solves the
    problem.
2.  Check whether the platform provides a native solution.
3.  Consider bundle size.
4.  Consider security.
5.  Consider maintenance.
6.  Add the dependency only when justified.

Do not add packages merely for convenience.

------------------------------------------------------------------------

# 17. API Contract

The web and Flutter applications must consume the same backend API
contract.

When changing an API:

-   Update backend types.
-   Update API documentation/types.
-   Update web client.
-   Update Flutter client if affected.
-   Preserve backwards compatibility where practical.

Do not silently change response structures.

------------------------------------------------------------------------

# 18. Error Handling

Every important asynchronous operation needs:

-   Loading state
-   Success state
-   Error state

Never leave users staring at an empty screen when something fails.

Error messages should explain what the user can do next.

------------------------------------------------------------------------

# 19. Testing Rule

Before declaring a task complete:

-   Run formatting.
-   Run linting.
-   Run type checking.
-   Run relevant unit tests.
-   Run relevant integration tests.
-   Verify the affected UI manually when possible.

Do not claim that tests passed if they were not actually run.

------------------------------------------------------------------------

# 20. No Fake Completion

Never say:

-   "Implemented" when code was not changed.
-   "Tested" when tests were not run.
-   "Working" when the result was not verified.
-   "Secure" without appropriate validation.

Be honest about limitations.

------------------------------------------------------------------------

# 21. Task Execution Format

For every implementation task, report:

### Changed

List important files/features changed.

### Implementation

Briefly explain what was implemented.

### Verification

List commands/tests actually run.

### Notes

Mention anything that requires future work.

------------------------------------------------------------------------

# 22. Preserve Existing Work

Never overwrite existing functionality without a reason.

Before large refactors:

-   Explain why.
-   Identify affected areas.
-   Prefer incremental migration.

Do not delete working code simply because you prefer a different style.

------------------------------------------------------------------------

# 23. UI Consistency

All platforms should share the same product concepts.

Use consistent terminology.

For example:

The tool is always called:

**Percentage Calculator**

not:

-   Percentage Tool
-   Percent Helper
-   Percent Calculator

unless there is a deliberate product decision.

------------------------------------------------------------------------

# 24. Accessibility

Accessibility is part of implementation, not an optional final step.

Always consider:

-   Keyboard navigation
-   Focus
-   Labels
-   Contrast
-   Touch target size
-   Screen readers
-   Error messaging
-   Large text

------------------------------------------------------------------------

# 25. SEO Rules

Do not generate meaningless SEO content.

Every SEO page should provide actual value.

Do not keyword-stuff.

Do not create thousands of near-identical pages only to manipulate
search rankings.

Tool pages should answer the user's actual search intent.

------------------------------------------------------------------------

# 26. Performance

Performance is a product requirement.

Prefer:

-   Code splitting
-   Lazy loading
-   Client-side processing
-   Caching
-   Efficient queries
-   Pagination
-   Optimized assets
-   Small initial bundles

Do not load heavy processing libraries globally.

------------------------------------------------------------------------

# 27. Monorepo / Project Boundaries

Keep backend, web, and mobile concerns separated.

Shared concepts may be documented or shared through packages where
practical.

Do not tightly couple frontend implementation details to backend
internals.

------------------------------------------------------------------------

# 28. When Requirements Are Ambiguous

Do not make a large architectural decision based on an assumption.

If ambiguity could materially affect the implementation, ask for
clarification.

If the ambiguity is minor, choose the simplest option consistent with
the specifications and clearly state the assumption.

------------------------------------------------------------------------

# 29. Feature Completion Checklist

Before marking a feature complete:

``` text
[ ] Requirement understood
[ ] Existing code inspected
[ ] Architecture respected
[ ] Input validation implemented
[ ] Loading state implemented
[ ] Error state implemented
[ ] Success state implemented
[ ] Responsive UI verified
[ ] Accessibility considered
[ ] Tests added/updated
[ ] Tests actually run
[ ] No secrets committed
[ ] No unrelated files modified
[ ] Documentation updated if needed
```

------------------------------------------------------------------------

# 30. Final Principle

Build EverydayTools as a real product, not a collection of code
examples.

Every feature should answer:

> Does this make the product more useful, reliable, simple, fast, or
> sustainable?

If not, do not add it merely because it is technically possible.
