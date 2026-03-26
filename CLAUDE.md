# CLAUDE.md

## Project Overview

Cookbook is a full-stack recipe management web app built with Next.js (App Router), TypeScript, and PostgreSQL. It features AI-powered recipe import (from URLs and images), semantic search, meal planning, shopping list generation, and pantry tracking. Single-user app with password-based auth.

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Production build
pnpm lint             # Run ESLint
pnpm test             # Run Vitest test suite
pnpm test:watch       # Run tests in watch mode
npx prisma generate   # Generate Prisma client
npx prisma db push    # Push schema changes (preferred over migrate for this project)
npx prisma studio     # Database GUI
```

## Architecture

- **Framework:** Next.js (App Router), React, TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Testing:** Vitest + React Testing Library + jsdom
- **UI:** Tailwind CSS, shadcn/ui (Radix UI), Lucide icons
- **Auth:** JWT (jose) with HTTP-only cookies, single password
- **AI:** Anthropic Claude API (`@anthropic-ai/sdk`) for recipe extraction, search, and ingredient merging
- **Fonts:** Libre Baskerville (display), Caveat (handwritten), Lora (body)

### Directory Structure

```
src/
├── app/
│   ├── (app)/              # Protected routes with NavBar layout
│   │   ├── recipes/        # Recipe list, create, detail, edit, cook mode
│   │   ├── meal-plan/      # Calendar-based meal planning
│   │   ├── shopping-list/  # Smart shopping list generation
│   │   └── pantry/         # Pantry inventory
│   ├── api/                # API routes
│   │   ├── auth/           # login, logout
│   │   ├── recipes/        # CRUD, import, import-image, search
│   │   ├── meal-plan/      # CRUD, random, clear
│   │   ├── shopping-list/  # Merged ingredient list + custom items CRUD
│   │   └── pantry/         # CRUD
│   └── login/              # Public login page
├── __tests__/              # Vitest integration tests (one file per page)
├── components/
│   ├── ui/                 # shadcn/ui components
│   └── scrapbook/          # Scrapbook-themed components (taped-photo, section-header, stamp-badge)
├── lib/
│   ├── ai.ts               # Claude API integration
│   ├── auth.ts             # JWT token helpers
│   ├── db.ts               # Prisma singleton
│   ├── format.ts           # Quantity formatting (fractions)
│   ├── recipe-form.ts      # Shared types (IngredientInput, MEAL_TYPES)
│   ├── scraper.ts          # URL scraping with Cheerio
│   ├── units.ts            # Unit groups for ingredient selects
│   └── utils.ts            # cn() helper
└── middleware.ts            # JWT verification on all routes
prisma/
└── schema.prisma            # Database models (see `npx prisma studio` for current schema)
```

## Testing

- Tests live in `src/__tests__/*.test.tsx` — one file per page
- Run `pnpm test` before committing — all tests must pass
- Tests use Vitest + React Testing Library with jsdom environment
- Test setup in `src/__tests__/setup.ts` mocks `next/navigation` and `next/link`
- Each test file mocks `global.fetch` to control API responses
- Requirements spec at `docs/superpowers/specs/2026-03-25-ux-requirements-design.md` — test IDs (L1, H1, R1, etc.) map to requirement IDs
- When changing page behavior, update both the test AND the requirement spec

## Code Conventions

- Path alias: `@/*` maps to `./src/*`
- API routes use Next.js async `params` pattern (`Promise<{ id: string }>`)
- UI components follow shadcn/ui patterns with CVA variants
- Primary color: `#c2410c` (burnt orange); scrapbook aesthetic with hand-drawn elements
- Mobile-first responsive design with sidebar (desktop) and bottom nav (mobile)

### Error Handling

- All `fetch` calls must check `res.ok` before calling `res.json()` — prevents silent data corruption
- All `localStorage`/`sessionStorage` access must be wrapped in `try-catch` — Safari private browsing throws
- Error states on pages must show a Retry button, not just a toast
- Confirmation dialogs required for destructive actions (delete, clear, remove)
- Optimistic UI updates must have rollback on failure

### State Persistence Patterns

- **localStorage** — ephemeral per-device state: view mode preference, recipe ingredient check marks, servings scale
- **sessionStorage** — session-scoped state: cooking mode step progress, checked ingredients
- **Database (API)** — cross-device persistent state: custom shopping list items, all CRUD data
- Never use localStorage for data that should sync across devices

### Scrapbook Design System

- `.input-cookbook` — bottom-border-only inputs (CSS `width: 100%` means Tailwind width classes need `style={{ width: N }}` override)
- `.paper-card` — card container with subtle shadow
- `.stamp-badge` — rotated stamp-style label (used for tags, "to taste" toggle)
- `.washi-tape` — colored tape labels (pink, blue, green, yellow variants)
- `.hand-check` — organic rounded checkbox
- `.section-header` — handwritten heading with orange underline
- `.lined-paper` — horizontal ruled lines background
- Ingredient cards use orange left border (`border-l-primary`) with numbered index

### Ingredient Input Design

- Each ingredient is a numbered card with name as hero field on top
- Qty and unit are mutually exclusive with "to taste" — they occupy the same row, toggle replaces qty/unit with stamp
- "To taste" stamp stays right-aligned (no content shift) with `min-h-[36px]` on the amount row
- Group field is hidden by default behind "+ group" link; set groups display as washi-tape labels

## Environment Variables

```
APP_PASSWORD=           # Login password
JWT_SECRET=             # Random string for JWT signing
POSTGRES_PRISMA_URL=    # PostgreSQL connection (pooling)
POSTGRES_URL_NON_POOLING= # PostgreSQL direct (migrations)
ANTHROPIC_API_KEY=      # Claude API key
```
