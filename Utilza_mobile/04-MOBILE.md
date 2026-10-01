# EverydayTools --- Flutter Mobile Application Specification

## 1. Purpose

The mobile app provides the EverydayTools experience on Android and iOS.

Technology:

-   Flutter
-   Dart
-   BLoC or Cubit for state management
-   REST API integration for server features

The mobile app should feel native and simple.

------------------------------------------------------------------------

## 2. Main Principle

The user should be able to:

**Open → Search/select tool → Use → Get result**

Most simple tools should work without an account.

------------------------------------------------------------------------

## 3. Suggested Structure

``` text
lib/
├── core/
│   ├── constants/
│   ├── errors/
│   ├── network/
│   ├── theme/
│   ├── routing/
│   ├── storage/
│   └── utils/
├── features/
│   ├── home/
│   ├── tools/
│   ├── categories/
│   ├── search/
│   ├── favorites/
│   ├── history/
│   ├── auth/
│   └── settings/
├── shared/
│   ├── widgets/
│   └── models/
└── main.dart
```

------------------------------------------------------------------------

## 4. Screens

### Home

Include:

-   Search
-   Popular tools
-   Categories
-   Favorites
-   Recently used tools
-   Recommended tools

### Search

Search all available tools.

### Categories

Examples:

-   Calculators
-   Date & Time
-   Text
-   Images
-   Documents
-   Generators

### Tool Screen

Each tool should have:

-   Title
-   Description
-   Input
-   Action
-   Result
-   Copy
-   Share
-   Save/favorite where appropriate
-   Reset

### Settings

Include:

-   Theme
-   Language if implemented
-   Account
-   Privacy
-   About
-   Contact
-   App version

------------------------------------------------------------------------

## 5. Mobile State Management

Use BLoC/Cubit consistently.

Avoid putting business logic directly into widgets.

Widgets should mainly handle:

-   Layout
-   User interaction
-   Rendering state

Logic belongs in:

-   Cubits/BLoCs
-   Services
-   Use cases where justified

------------------------------------------------------------------------

## 6. Local vs Backend Processing

Simple tools should run locally when practical.

Examples:

-   Percentage
-   Age
-   Date calculations
-   Text counters
-   Case conversion
-   Password generator
-   UUID generator

Use the API for:

-   Authentication
-   Favorites synchronization
-   History synchronization
-   Server processing
-   Large file processing
-   Premium features
-   AI functionality

------------------------------------------------------------------------

## 7. AdMob

Google AdMob is the primary mobile monetization system.

Potential ad formats:

-   Banner
-   Native
-   Interstitial
-   Rewarded

Rules:

-   Never make ads look like buttons.
-   Never place ads over critical controls.
-   Do not show an interstitial immediately after app launch.
-   Do not interrupt every tool operation.
-   Use frequency limits.
-   Ensure ad placement complies with Google's policies.

The ad implementation should be isolated behind reusable
widgets/services so the product can change ad strategy without rewriting
every tool.

------------------------------------------------------------------------

## 8. Mobile UX

The app should support:

-   Android phones
-   iPhones
-   Different screen sizes
-   Light/dark mode where implemented
-   Large text accessibility settings where practical
-   Screen readers
-   Touch accessibility

Use large, clear controls.

Avoid tiny icons without labels when the action is important.

------------------------------------------------------------------------

## 9. Offline Capability

Where possible, basic tools should work offline.

Examples:

-   Calculator
-   Age Calculator
-   Date Difference
-   Word Counter
-   Character Counter
-   Password Generator
-   UUID Generator
-   Unit Converter

Network-dependent tools should show clear offline states.

------------------------------------------------------------------------

## 10. API Layer

Use a dedicated API client.

Conceptual structure:

``` text
ApiClient
 ├── AuthApi
 ├── ToolsApi
 ├── FavoritesApi
 ├── HistoryApi
 └── UserApi
```

Do not scatter raw HTTP calls throughout widgets.

------------------------------------------------------------------------

## 11. Error Handling

Errors must be user-friendly.

Examples:

-   Network unavailable
-   Invalid input
-   File too large
-   Unsupported file type
-   Server unavailable

Provide retry actions where appropriate.

------------------------------------------------------------------------

## 12. Testing

Include:

-   Unit tests
-   Widget tests
-   BLoC/Cubit tests
-   API integration tests for important flows
-   Basic accessibility testing
-   Device testing on different screen sizes

Critical calculation logic should be tested thoroughly.

------------------------------------------------------------------------

## 13. Mobile Rules

-   Do not require login for basic tools.
-   Keep startup fast.
-   Avoid unnecessary network requests.
-   Do not store sensitive information insecurely.
-   Do not put secrets in the Flutter application.
-   Keep API credentials and server secrets on the backend.
-   Keep tool logic modular.
-   Reuse common UI components.
-   Avoid excessive animations.
