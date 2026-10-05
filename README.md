[README(1).md](https://github.com/user-attachments/files/33047466/README.1.md)
# ⚡ UTILZA

<p align="center">
  <strong>Small tools. Zero friction. One place.</strong>
</p>

<p align="center">
  A fast, simple, privacy-conscious utility platform for everyday tasks — from calculators and text tools to image, PDF, conversion, and generation utilities.
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-toolbox">Toolbox</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-roadmap">Roadmap</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-In%20Development-8b5cf6?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/Web-React%20%2B%20TypeScript-61dafb?style=for-the-badge&logo=react&logoColor=white" alt="Web" />
  <img src="https://img.shields.io/badge/Mobile-Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white" alt="Flutter" />
  <img src="https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/ORM-Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/License-To%20be%20added-lightgrey?style=flat-square" alt="License" />
</p>

---

## ✨ What is UTILZA?

**UTILZA** is a multi-platform utility ecosystem built around one simple idea:

> **Find a tool → use it → get a result.**

Instead of installing a separate application for every small task, UTILZA brings useful everyday tools into one consistent experience.

The platform is designed for **web**, **mobile**, and a shared **Node.js API**, with privacy and simplicity built into the architecture from the beginning.

### 🌐 Platforms

| Platform | Technology | Purpose |
|---|---|---|
| 🖥️ **Web** | React + TypeScript | Fast, searchable utility experience |
| 📱 **Mobile** | Flutter + Dart | Native cross-platform utility app |
| ⚙️ **Backend** | Node.js + Express | Accounts, sync, files, premium features & APIs |

---

## 🚀 Core Principles

UTILZA is intentionally designed around a few strong principles:

- ⚡ **Fast** — small bundles, lazy loading, and client-side processing wherever practical.
- 🎯 **Simple** — every tool should do one job clearly and efficiently.
- 👤 **No login required** — basic tools work anonymously; accounts are optional.
- 🔒 **Privacy-conscious** — simple operations stay in the browser or on the device whenever possible.
- 🔎 **Search-friendly** — important tools have dedicated, indexable pages.
- ♿ **Accessible** — usable across ages, devices, input methods, and screen sizes.
- 🎨 **Consistent** — web and mobile share the same product language.
- 💎 **Quality over quantity** — a small collection of excellent tools is better than hundreds of unfinished ones.

### 👤 Optional Accounts

Accounts unlock additional features without making them mandatory:

- ⭐ Favorites
- 🕘 Recent tools
- ☁️ Cross-device synchronization
- ⚙️ Synced preferences
- 📊 Usage history where appropriate
- 💎 Future premium features

---

## 🧰 Toolbox

UTILZA is designed to grow into a large collection of focused utilities.

| Category | Example Tools |
|---|---|
| 🧮 **Calculators** | Percentage, Discount, Tip, Age, BMI, GPA, Salary, Loan, Unit Converter |
| 📅 **Date & Time** | Days Between Dates, Add/Subtract Days, Working Days, Countdown, Time Zone Converter |
| ✍️ **Text** | Word Counter, Character Counter, Sentence Counter, Case Converter, Duplicate Line Remover, Text Cleaner |
| 🖼️ **Image** | Compressor, Resizer, Cropper, Rotator, JPG/PNG/WEBP Converter, Metadata Remover |
| 📄 **Documents / PDF** | Merge, Split, Compress, PDF → JPG, Page Extractor, Text Extractor |
| 🪄 **Generators** | QR Code, Password, UUID, Random Number, Color Palette |

> This list is intentionally expandable. New categories and tools should be added without requiring architectural changes.

---

## 🎯 MVP

The first public release focuses on **10 polished tools**:

- [ ] Percentage Calculator
- [ ] Discount Calculator
- [ ] Age Calculator
- [ ] Date Difference Calculator
- [ ] Unit Converter
- [ ] Word Counter
- [ ] Character Counter
- [ ] Case Converter
- [ ] Password Generator
- [ ] QR Code Generator

Image and document-processing tools will follow once the core foundation is stable.

---

## 🏗️ Architecture

UTILZA uses a **monorepo-style architecture** with separate applications and reusable packages.

```text
utilza/
│
├── apps/
│   ├── backend/          # Node.js + Express + Prisma API
│   ├── web/              # React + Vite web application
│   └── mobile/           # Flutter mobile application
│
├── packages/
│   ├── shared-types/     # Shared TypeScript types / API contracts
│   ├── shared-config/    # Shared configuration
│   └── tool-definitions/ # Tool metadata shared across platforms
│
├── docs/                 # Product specifications & documentation
└── README.md
```

> If Flutter's project structure makes a single repository impractical, the mobile application may live separately while continuing to share documented API contracts.

### 🧩 Every Tool is a Mini-Product

Each utility has its own definition and experience, including:

- Unique name and slug
- Category
- Description
- Search metadata
- Icon
- Input UI
- Validation rules
- Processing logic
- Result UI
- Copy / download / share actions
- Related tools
- Analytics events

Adding a new tool should **not** require rewriting unrelated parts of the platform.

### 🖥️ Client-First Processing

Simple operations should happen as close to the user as possible.

| Client-side | Backend |
|---|---|
| Calculators | Authentication & accounts |
| Text manipulation | Favorites & history sync |
| Date calculations | Subscription state |
| Password / UUID generation | Server-side file processing |
| QR generation | Large-file processing |
| Small image operations | AI & premium features |
| Lightweight utilities | Secure usage limits |

> **Simple calculations never need to pass through the server.**

### 🗂️ Tool Registry

The database **describes** tools; application code **implements** them.

A tool record can contain metadata such as:

```text
id
name
slug
description
categoryId
icon
isActive
```

Processing logic is **never stored as executable code in the database**.

### 🗃️ Core Data Model

Current core entities:

```text
User
Category
Tool
Favorite
ToolHistory
Subscription
```

Planned entities:

```text
Session / RefreshToken
UsageEvent
FileJob
Notification
Device
FeatureFlag
AdminUser
```

All schema changes are managed through **Prisma migrations**.

---

## 🧱 Technology Stack

### Web

- React
- TypeScript — strict mode
- Vite
- React Router
- Tailwind CSS
- TanStack Query

### Mobile

- Flutter
- Dart
- BLoC / Cubit

### Backend

- Node.js
- Express
- TypeScript
- Prisma

### Database & Services

- PostgreSQL
- Neon
- Google AdSense — web
- Google AdMob — mobile

---

## 📁 Project Structure

### Backend — `apps/backend/src`

```text
src/
├── app.ts
├── server.ts
├── config/          # Environment & database configuration
├── modules/         # Auth, users, tools, categories, favorites,
│                    # history, analytics, subscriptions, files
├── middleware/      # Auth, errors, rate limits, validation
├── lib/             # Prisma client, logger
├── utils/
└── types/
```

### Web — `apps/web/src`

```text
src/
├── app/             # Router, providers, layouts
├── components/      # UI, navigation, ads, tools, common
├── features/        # Auth, favorites, history, search, tools
├── pages/
├── lib/
├── hooks/
├── services/
├── types/
├── utils/
└── styles/
```

### Mobile — `apps/mobile/lib`

```text
lib/
├── core/            # Constants, errors, network, theme, routing, storage
├── features/        # Home, tools, categories, search, favorites,
│                    # history, auth, settings
├── shared/          # Reusable widgets & models
└── main.dart
```

---

## 🛠️ Getting Started

> 🚧 **UTILZA is under active development.** Commands below describe the intended development workflow and may change as the project evolves.

### Prerequisites

Make sure you have installed:

- [Node.js](https://nodejs.org/) — LTS recommended
- npm
- [Flutter SDK](https://flutter.dev/)
- A PostgreSQL database — a free [Neon](https://neon.tech/) project works well

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/utilza.git
cd utilza
```

### 2. Start the Backend

```bash
cd apps/backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

### 3. Start the Web App

```bash
cd apps/web
npm install
npm run dev
```

### 4. Start the Mobile App

```bash
cd apps/mobile
flutter pub get
flutter run
```

### Production Database

```bash
npx prisma migrate deploy
```

> ⚠️ Do not manually modify the production database schema outside a documented emergency procedure.

---

## 🔐 Environment Variables

Create `apps/backend/.env` from `.env.example`.

**Never commit real secrets or `.env` files to Git.**

```env
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

> 🔒 Secrets must never be placed in the web or Flutter applications.

---

## 🔌 API

The API is versioned from day one:

```text
/api/v1
```

### Current Core Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/tools` | List tools |
| `GET` | `/api/v1/tools/:slug` | Get a tool |
| `GET` | `/api/v1/categories` | List categories |
| `POST` | `/api/v1/auth/register` | Register |
| `POST` | `/api/v1/auth/login` | Login |
| `GET` | `/api/v1/users/me` | Current user |
| `GET` | `/api/v1/favorites` | List favorites |
| `POST` | `/api/v1/favorites` | Add favorite |
| `DELETE` | `/api/v1/favorites/:toolId` | Remove favorite |

### Consistent Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input.",
    "details": []
  }
}
```

The web and Flutter applications consume the same API contract.

---

## 🔒 Privacy & Security

Privacy is a **product feature**, not an afterthought.

- Collect only the data that is necessary.
- Prefer local, browser-based, or on-device processing.
- Never permanently store private files in PostgreSQL.
- Temporary server-side files use object storage with automatic cleanup.
- Never log passwords, tokens, or file contents.
- Use HTTPS in production.
- Hash passwords; never store them in plaintext.
- Use Helmet, CORS, rate limiting, and request-size limits.
- Strictly validate bodies, queries, route parameters, and uploads.
- Never trust uploaded files based only on MIME type or filename.
- Check authorization for every protected resource.
- Keep analytics anonymous where possible and respect consent requirements.

---

## ♿ Accessibility

Accessibility is part of the product, not a later enhancement.

- Semantic HTML
- Screen-reader-friendly interfaces
- Full keyboard navigation
- Visible focus states
- Properly labeled form controls
- Clear and actionable error messages
- Sufficient color contrast
- No reliance on color alone
- Large touch targets
- Readable typography
- Reduced-motion consideration

---

## 💰 Monetization

UTILZA is planned as a **free utility platform supported by advertising**.

### Web

- Google AdSense
- Ads introduced only after the site meets Google's requirements

### Mobile

- Google AdMob
- Banner ads
- Native ads
- Sparing interstitials
- Optional rewarded ads

### Product Rule

> **Ads should never obstruct a tool, impersonate a button, or appear between a user and their result.**

A future premium tier may provide:

- 🚫 Ad-free experience
- 📦 Higher file limits
- 📚 Batch processing
- ☁️ Cloud synchronization
- 🧰 Advanced tools

---

## 🧪 Testing Strategy

Critical functionality should be tested automatically.

| Area | Coverage |
|---|---|
| ⚙️ **Backend** | Unit tests, services, validation, utilities, routes, database, auth, security, uploads, rate limits |
| 🌐 **Web** | Calculation logic, validation, navigation, search, API integration, accessibility, error states |
| 📱 **Mobile** | Unit tests, widget tests, BLoC/Cubit tests, API integration, accessibility, multi-device checks |

> 🧠 **Critical calculation logic must always have automated tests.**

---

## 🗺️ Roadmap

### Foundation

- [ ] Architecture
- [ ] Design system
- [ ] API conventions
- [ ] Error handling
- [ ] Authentication strategy
- [ ] Tool registry
- [ ] Analytics foundation
- [ ] Testing setup

### MVP

- [ ] Percentage Calculator
- [ ] Discount Calculator
- [ ] Age Calculator
- [ ] Date Difference Calculator
- [ ] Unit Converter
- [ ] Word Counter
- [ ] Character Counter
- [ ] Case Converter
- [ ] Password Generator
- [ ] QR Code Generator

### Platform Growth

- [ ] SEO-focused tool pages
- [ ] Global search
- [ ] Google AdSense integration
- [ ] Flutter mobile app
- [ ] Offline support for basic tools
- [ ] Google AdMob integration
- [ ] Favorites & recent tools
- [ ] Cross-device synchronization
- [ ] Image tools
- [ ] PDF / document tools
- [ ] Premium tier

---

## 🤝 Contributing

Contributions are welcome as the project grows.

Please follow these principles:

1. **Work in small, clearly scoped tasks.** Don't build everything at once.
2. **Inspect existing code first.** Avoid duplicated components and logic.
3. **Keep controllers thin.** Business logic belongs in services.
4. **Keep UI focused on presentation.**
5. **Validate all external input.**
6. **Run formatting, linting, type checking, and relevant tests before opening a PR.**
7. **Keep tool names consistent across platforms.**
8. **Avoid new dependencies unless they are clearly justified.**

Detailed specifications live in [`/docs`](./docs).

---

## 📄 License

A license has not yet been selected.

Once chosen, add the license here and include the corresponding `LICENSE` file in the repository root. **MIT** is one possible option.

---

<p align="center">
  <strong>UTILZA</strong>
  <br />
  Small tools for everyday problems.
  <br /><br />
  <sub>Built with simplicity, privacy, and usefulness in mind.</sub>
</p>
