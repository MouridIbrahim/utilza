# EverydayTools --- Web Application Specification

## 1. Purpose

The web application is the primary public-facing version of
EverydayTools.

Its main goals are:

1.  Let users find a tool quickly.
2.  Let users use it without registration.
3.  Provide excellent SEO.
4.  Provide a fast and accessible experience.
5.  Monetize through Google AdSense without damaging usability.
6.  Provide optional account features.

------------------------------------------------------------------------

## 2. Technology

-   React
-   TypeScript
-   Vite
-   React Router
-   Tailwind CSS
-   Axios or an equivalent HTTP client
-   TanStack Query for server state
-   A lightweight local state solution when necessary

Use strict TypeScript.

Avoid `any` unless there is a documented reason.

------------------------------------------------------------------------

## 3. Suggested Structure

``` text
src/
├── app/
│   ├── router/
│   ├── providers/
│   └── layouts/
├── components/
│   ├── ui/
│   ├── navigation/
│   ├── ads/
│   ├── tools/
│   └── common/
├── features/
│   ├── auth/
│   ├── favorites/
│   ├── history/
│   ├── search/
│   └── tools/
├── pages/
│   ├── HomePage.tsx
│   ├── ToolsPage.tsx
│   ├── CategoryPage.tsx
│   ├── ToolPage.tsx
│   ├── LoginPage.tsx
│   └── ...
├── lib/
├── hooks/
├── services/
├── types/
├── utils/
└── styles/
```

------------------------------------------------------------------------

## 4. Main Pages

### Home

Should include:

-   Brand
-   Search
-   Popular tools
-   Categories
-   Recently used tools where available
-   Featured tools
-   Clear navigation
-   Ad placements that do not obstruct the experience

### All Tools

Show all active tools grouped by category.

### Category

Example:

`/category/calculators`

Display tools belonging to that category.

### Tool

Example:

`/tools/percentage-calculator`

Each tool gets its own route.

### Authentication

-   Login
-   Register
-   Forgot password
-   Reset password
-   Profile

Account pages are not the center of the product.

------------------------------------------------------------------------

## 5. Tool Page Standard

Every tool page should follow a consistent pattern.

``` text
Tool title
Short description

[ Input area ]

[ Main action ]

Result

[ Copy ]
[ Download ]
[ Share ]
[ Reset ]

How it works
FAQ
Related tools
```

Do not overload the page with unnecessary controls.

------------------------------------------------------------------------

## 6. SEO

Each tool page should have:

-   Unique title
-   Meta description
-   Canonical URL
-   H1
-   Useful textual explanation
-   Internal links
-   Related tools
-   FAQ when useful
-   Structured data where appropriate

Example:

``` text
/tools/percentage-calculator
```

should target a clear search intent around percentage calculations.

Avoid generating hundreds of thin pages with nearly identical content.

------------------------------------------------------------------------

## 7. Global Search

Search should be prominent.

Features:

-   Search by tool name
-   Search by keywords
-   Search by category
-   Keyboard-friendly on desktop
-   Touch-friendly on mobile web

Example:

Input:

`compress`

Results:

-   Image Compressor
-   PDF Compressor
-   Video Compressor

------------------------------------------------------------------------

## 8. Web Performance

Priorities:

-   Fast initial load
-   Lazy loading
-   Code splitting
-   Efficient assets
-   Avoid unnecessary API requests
-   Cache static data
-   Client-side processing when possible

Heavy processing libraries should not be loaded on every page.

Load them only when the relevant tool is opened.

------------------------------------------------------------------------

## 9. Responsive Design

Support:

-   Desktop
-   Laptop
-   Tablet
-   Mobile browser

The tool interface must remain usable on small screens.

Minimum touch target should be comfortably usable.

------------------------------------------------------------------------

## 10. Ads

Use Google AdSense only after the website is ready and compliant with
Google's policies.

Ads must:

-   Be clearly distinguishable from tool controls.
-   Never impersonate buttons.
-   Never block essential functionality.
-   Never cause accidental clicks.
-   Respect applicable consent requirements.

Potential placements:

-   Header area
-   Between content sections
-   Below result
-   Sidebar on desktop where appropriate

Do not put an ad between a user and a critical result.

------------------------------------------------------------------------

## 11. Accessibility

Use semantic HTML.

Requirements:

-   Labels
-   Keyboard navigation
-   Focus states
-   Screen reader support
-   Clear errors
-   Sufficient contrast
-   Reduced-motion consideration
-   Responsive controls

------------------------------------------------------------------------

## 12. Tool Implementation

Prefer a standard interface for tools.

Conceptually:

``` ts
interface ToolDefinition {
  slug: string;
  name: string;
  category: string;
  description: string;
}
```

Each tool owns its UI and logic while following the common product
design.

Avoid creating a huge universal component that contains special cases
for every tool.

------------------------------------------------------------------------

## 13. Error States

Provide friendly messages.

Bad:

`ERR_PROCESS_FAILED_500`

Better:

`We couldn't process this file. Please check the file type and try again.`

Developer details belong in logs, not user-facing UI.

------------------------------------------------------------------------

## 14. Web Testing

Test:

-   Tool calculations
-   Input validation
-   Responsive layout
-   Navigation
-   Search
-   API integration
-   Authentication
-   Accessibility basics
-   File processing
-   Error states

Critical calculation logic must have automated tests.

------------------------------------------------------------------------

## 15. Web Rules

-   Do not require login for basic tools.
-   Do not put ads inside functional controls.
-   Do not sacrifice speed for visual effects.
-   Do not duplicate tool logic unnecessarily.
-   Keep tool URLs stable.
-   Keep SEO content useful.
-   Do not create fake SEO pages.
-   Prefer native browser APIs when they are sufficient.
