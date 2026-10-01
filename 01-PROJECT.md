# EverydayTools --- Full Project Specification

## 1. Project Overview

**EverydayTools** is a multi-platform utility ecosystem available as:

-   Web application
-   Flutter mobile application
-   Node.js backend API
-   PostgreSQL database hosted on Neon
-   Prisma ORM

The product goal is simple:

> Give anyone a fast, simple, trustworthy tool for solving small
> everyday problems.

EverydayTools is inspired by the utility-platform model of products such
as iLovePDF, but it is intentionally broader. It should eventually
contain many focused tools across calculations, dates, text, images,
documents, generators, converters, and other everyday tasks.

The product should feel:

-   Fast
-   Simple
-   Friendly
-   Accessible
-   Mobile-first
-   Privacy-conscious
-   Search-friendly
-   Reliable
-   Consistent across web and mobile

The application should not feel like a complicated productivity suite. A
user should be able to open a tool, understand it immediately,
enter/upload information, receive a result, and leave.

------------------------------------------------------------------------

## 2. Core Product Principle

The main interaction is:

**Find a tool → use it → get a result.**

Users should not need an account for basic tools.

Accounts are optional and should unlock features such as:

-   Favorites
-   Recent tools
-   Cross-device synchronization
-   Usage history where appropriate
-   Personalized settings
-   Premium features

The free experience must remain useful without registration.

------------------------------------------------------------------------

## 3. Initial Tool Categories

The platform should be expandable. Categories are not hardcoded into the
architecture.

### Calculators

Initial examples:

-   Percentage Calculator
-   Percentage Increase Calculator
-   Percentage Decrease Calculator
-   Discount Calculator
-   Tip Calculator
-   Age Calculator
-   BMI Calculator
-   GPA Calculator
-   Salary Calculator
-   Loan Calculator
-   Time Duration Calculator
-   Date Difference Calculator
-   Unit Converter
-   Basic Math Calculator

### Date & Time

-   Days Between Dates
-   Add Days to Date
-   Subtract Days from Date
-   Working Days Calculator
-   Countdown
-   Age from Date
-   Time Zone Converter
-   Time Duration Calculator

### Text

-   Word Counter
-   Character Counter
-   Sentence Counter
-   Line Counter
-   Reading Time Calculator
-   Uppercase Converter
-   Lowercase Converter
-   Title Case Converter
-   Remove Duplicate Lines
-   Remove Empty Lines
-   Sort Lines
-   Remove Extra Spaces
-   Text Cleaner
-   Text Repeater

### Image

-   Image Compressor
-   Image Resizer
-   Image Cropper
-   Image Rotator
-   JPG to PNG
-   PNG to JPG
-   WEBP to JPG
-   Image to PDF
-   Image Metadata Remover

### Documents / PDF

-   PDF Merger
-   PDF Splitter
-   PDF Compressor
-   PDF to JPG
-   JPG to PDF
-   PDF Page Extractor
-   PDF Metadata Remover
-   PDF Text Extractor

### Generators

-   QR Code Generator
-   Password Generator
-   UUID Generator
-   Random Number Generator
-   Random Name Generator
-   Color Palette Generator

This list is a starting point, not a final limit.

------------------------------------------------------------------------

## 4. Tool Architecture Principle

Every tool should be treated as an independent product inside the
EverydayTools ecosystem.

Each tool should have:

-   Unique name
-   Unique slug
-   Category
-   Description
-   Search-friendly metadata
-   Icon
-   Input UI
-   Validation
-   Processing logic
-   Result UI
-   Copy/download/share actions where relevant
-   Related tools
-   Optional history/favorite integration
-   Analytics events

A new tool should be addable without rewriting unrelated parts of the
application.

------------------------------------------------------------------------

## 5. Client-Side vs Server-Side Processing

Use client-side processing whenever it is practical.

### Prefer client-side processing for:

-   Calculators
-   Text manipulation
-   Case conversion
-   Word counting
-   Date calculations
-   Password generation
-   UUID generation
-   QR generation where feasible
-   Small image operations where feasible

Benefits:

-   Faster
-   Lower server cost
-   Better privacy
-   Works without sending data to the server
-   Easier scaling

### Use the backend when needed for:

-   Authentication
-   User data
-   Favorites
-   History synchronization
-   Subscription information
-   Server-side file processing
-   Large files
-   AI-powered processing
-   Premium operations
-   Server-generated resources
-   Usage limits that must be enforced securely

Private files should never be stored permanently in PostgreSQL.

Temporary uploaded files should use appropriate object/file storage and
have automatic cleanup.

------------------------------------------------------------------------

## 6. Platforms

### Web

React + TypeScript + Vite.

The web application is the primary SEO and AdSense acquisition channel.

Each important tool should have its own indexable route, for example:

`/tools/percentage-calculator`

`/tools/age-calculator`

`/tools/image-compressor`

### Mobile

Flutter.

The mobile app should consume the same backend API when backend
functionality is needed, while keeping local tools local when possible.

### Backend

Node.js + Express + TypeScript.

### Database

PostgreSQL hosted on Neon.

### ORM

Prisma.

------------------------------------------------------------------------

## 7. Monetization

EverydayTools is primarily a free utility platform monetized through
advertising.

### Web

Use Google AdSense after the site satisfies Google's requirements and
policies.

Ads must never obstruct the core functionality.

### Mobile

Use Google AdMob.

Potential formats:

-   Banner ads
-   Native ads
-   Interstitial ads used sparingly
-   Rewarded ads only where the user receives a meaningful optional
    benefit

Never interrupt a critical calculation or result unnecessarily.

### Future Premium

The architecture should leave room for:

-   Ad-free experience
-   Higher file limits
-   Batch processing
-   Advanced tools
-   Cloud synchronization
-   Additional AI functionality
-   Premium-only features

Premium is optional for the initial release.

------------------------------------------------------------------------

## 8. User Accounts

Users should be able to use basic tools anonymously.

Optional account features:

-   Register
-   Login
-   Logout
-   Profile
-   Favorites
-   Recent tools
-   Synced preferences
-   Usage history where applicable

Authentication should be secure and handled by the backend.

Do not store passwords in plaintext.

------------------------------------------------------------------------

## 9. Analytics

The platform needs analytics to understand which tools users actually
use.

Track events such as:

-   Tool opened
-   Tool completed
-   Tool failed
-   File uploaded
-   Result downloaded
-   Result copied
-   Tool favorited
-   Search performed
-   Subscription started
-   Ad-related events where permitted by the relevant platform policies

Do not collect unnecessary sensitive information.

Analytics must respect privacy and applicable consent requirements.

------------------------------------------------------------------------

## 10. Search and Discovery

The website should be SEO-first.

Every important tool should have:

-   SEO title
-   Meta description
-   Canonical URL
-   Useful explanatory content
-   FAQ where appropriate
-   Internal links
-   Related tools
-   Structured data where appropriate

The homepage should expose categories and popular tools.

The site should also have global tool search.

Example:

User searches:

`percentage`

Results:

-   Percentage Calculator
-   Percentage Increase
-   Percentage Decrease
-   Discount Calculator
-   Tip Calculator

------------------------------------------------------------------------

## 11. Design System

The product should use one shared design language.

Core qualities:

-   Clean
-   Modern
-   Light
-   Friendly
-   High readability
-   Strong spacing
-   Large touch targets
-   Clear hierarchy
-   Responsive
-   Accessible

Avoid unnecessary visual complexity.

Tools should prioritize the input and result.

Web and mobile do not need identical layouts, but they must feel like
the same product.

------------------------------------------------------------------------

## 12. Privacy

Privacy is a major product principle.

Rules:

-   Do not collect data without a reason.
-   Do not permanently store user files unless explicitly required and
    disclosed.
-   Prefer local/browser processing for simple tools.
-   Delete temporary files automatically.
-   Never log sensitive file contents.
-   Never expose private user data through public endpoints.
-   Use HTTPS in production.
-   Protect authentication endpoints.
-   Validate uploads.
-   Restrict file size and file type.
-   Apply rate limits to expensive endpoints.

------------------------------------------------------------------------

## 13. Accessibility

Every tool should be usable by as many people as practical.

Requirements include:

-   Keyboard navigation on web
-   Visible focus states
-   Good color contrast
-   Labels for form controls
-   Clear error messages
-   Touch-friendly mobile controls
-   Screen-reader-friendly semantics
-   Avoid relying only on color
-   Avoid tiny text

The product should be comfortable for children, adults, and older users.

------------------------------------------------------------------------

## 14. Project Structure

The repository should be organized as a monorepo or clearly separated
applications.

Recommended:

``` text
everydaytools/
├── apps/
│   ├── backend/
│   ├── web/
│   └── mobile/
├── packages/
│   ├── shared-types/
│   ├── shared-config/
│   └── tool-definitions/
├── docs/
└── README.md
```

If Flutter's project structure makes a single repository impractical,
the mobile app may remain a separate application while sharing
documented API contracts.

------------------------------------------------------------------------

## 15. Development Philosophy

Build the foundation first.

Do not create dozens of tools before establishing:

-   Architecture
-   Design system
-   API conventions
-   Error handling
-   Authentication strategy
-   Database conventions
-   Tool registration system
-   Analytics strategy
-   Testing strategy

After the foundation is stable, tools should be implemented
incrementally.

------------------------------------------------------------------------

## 16. MVP

The first public MVP should contain approximately 10 high-quality tools
rather than 100 unfinished tools.

Recommended MVP:

1.  Percentage Calculator
2.  Discount Calculator
3.  Age Calculator
4.  Date Difference Calculator
5.  Unit Converter
6.  Word Counter
7.  Character Counter
8.  Case Converter
9.  Password Generator
10. QR Code Generator

Then add image/document tools.

------------------------------------------------------------------------

## 17. Long-Term Vision

EverydayTools should become a large collection of focused utilities that
people can bookmark and return to whenever they have a small problem.

The long-term product should optimize for:

-   Utility
-   Speed
-   Discoverability
-   Reliability
-   Privacy
-   Low friction
-   Cross-platform availability
-   Sustainable advertising revenue

The product should not become bloated merely to increase the number of
tools.

Quality and usefulness come first.
