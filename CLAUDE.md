# CLAUDE.md

## Project Overview

Cookbook is a full-stack recipe management web app built with Next.js 16 (App Router), TypeScript, and PostgreSQL. It features AI-powered recipe import (from URLs and images), semantic search, meal planning, shopping list generation, and pantry tracking.

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Production build
pnpm lint             # Run ESLint
npx prisma generate   # Generate Prisma client
npx prisma migrate dev --name <name>  # Create migration
npx prisma studio     # Database GUI
```

## Architecture

- **Framework:** Next.js 16.1.6, React 19, TypeScript
- **Database:** PostgreSQL with Prisma 6 ORM
- **UI:** Tailwind CSS 4, shadcn/ui (Radix UI), Lucide icons
- **Auth:** JWT (jose) with HTTP-only cookies, password-based
- **AI:** Anthropic Claude API (`@anthropic-ai/sdk`) for recipe extraction, search, and ingredient merging

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
│   │   ├── shopping-list/  # Merged ingredient list
│   │   └── pantry/         # CRUD
│   └── login/              # Public login page
├── components/
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── ai.ts               # Claude API integration
│   ├── auth.ts             # JWT token helpers
│   ├── db.ts               # Prisma singleton
│   ├── scraper.ts          # URL scraping with Cheerio
│   └── utils.ts            # cn() helper
└── middleware.ts            # JWT verification on all routes
prisma/
└── schema.prisma            # Database models
```

### Database Models

- **Recipe** - title, description, servings, times, cuisine, mealType, tags, isFavorite
- **Ingredient** - name, quantity, unit, group, sortOrder (belongs to Recipe)
- **Step** - text, sortOrder (belongs to Recipe)
- **MealPlanItem** - date, mealType (belongs to Recipe)
- **PantryItem** - name (unique)

All Recipe relations cascade on delete.

## Environment Variables

```
APP_PASSWORD=           # Login password
JWT_SECRET=             # Random string for JWT signing
POSTGRES_PRISMA_URL=    # PostgreSQL connection (pooling)
POSTGRES_URL_NON_POOLING= # PostgreSQL direct (migrations)
ANTHROPIC_API_KEY=      # Claude API key
```

## Code Conventions

- Path alias: `@/*` maps to `./src/*`
- API routes use Next.js 15+ async `params` pattern (`Promise<{ id: string }>`)
- UI components follow shadcn/ui patterns with CVA variants
- Primary color: `#ea580c` (orange)
- Mobile-first responsive design with sidebar (desktop) and bottom nav (mobile)
