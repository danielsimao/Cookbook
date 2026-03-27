# Multi-User Support — Design Spec

## Context

The Cookbook app is currently single-user with a shared password. This spec adds multi-user support for small groups (family, roommates) with separate cookbooks per user and recipe sharing via copy links. Not designed for a large audience — admin creates accounts, no public signup.

## Data Model Changes

### New: `User`
```prisma
model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         String   @default("member") // "admin" | "member"
  createdAt    DateTime @default(now())
}
```

### Add `userId` to all data models
- Recipe — `userId String` + relation + index
- MealPlanItem — `userId String` + relation + index
- PantryItem — drop `@@unique(name)`, add `@@unique([userId, name])`
- ShoppingListCache — drop `@@unique(weekStart)`, add `@@unique([userId, weekStart])`
- CustomShoppingItem — drop `@@unique([weekStart, name])`, add `@@unique([userId, weekStart, name])`

### New: `SharedRecipe`
```prisma
model SharedRecipe {
  id        String   @id @default(cuid())
  token     String   @unique @default(cuid())
  recipeId  String
  recipe    Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  createdBy String
  createdAt DateTime @default(now())
}
```

### Migration strategy
1. Create User table
2. Seed current account as admin (use existing APP_PASSWORD hash, email from env or hardcoded)
3. Add nullable userId columns to all tables
4. Backfill all rows with admin userId
5. Make userId non-nullable, add foreign keys
6. Remove APP_PASSWORD env var

## Auth Changes

### Login
- Email + password form (replaces single password field)
- `POST /api/auth/login` accepts `{ email, password }`, validates with bcrypt, returns JWT with `{ userId, role }`
- JWT stored in `cookbook-auth` cookie (same as now, 30-day expiry)

### Helper: `getUserId()`
```typescript
// src/lib/auth.ts
export async function getUserId(): Promise<string> {
  const token = cookies().get("cookbook-auth")?.value;
  if (!token) throw new Error("Not authenticated");
  const { payload } = await jwtVerify(token, secret);
  return payload.userId as string;
}
```
Every API route calls `getUserId()` and uses the returned ID to scope all queries.

### Middleware
Same JWT check, no changes needed — it already redirects unauthenticated users to `/login`. The JWT payload just carries more data now.

## API Route Changes

Every API route that reads or writes data adds `userId` filtering:

```typescript
// Before
const recipes = await prisma.recipe.findMany();

// After
const userId = await getUserId();
const recipes = await prisma.recipe.findMany({ where: { userId } });
```

Routes affected (~15 files):
- `/api/recipes` — CRUD, import, import-image, search
- `/api/meal-plan` — CRUD, random, clear
- `/api/shopping-list` — GET (merged list), custom CRUD
- `/api/pantry` — CRUD
- `/api/suggestions` — scope by user's recipes

## Admin Settings

### Page: `/settings` (admin-only)
- List existing users (name, email, role)
- "Add user" form: name, email, temporary password
- Remove user (with confirmation — deletes all their data)
- Admin check: redirect non-admin users away

### API: `/api/users`
- `GET` — list all users (admin only)
- `POST` — create user (admin only)
- `DELETE` — remove user and cascade all data (admin only)

## Recipe Sharing

### Share button
On recipe detail page, a "Share" button (next to edit/cook/delete actions).

### API
- `POST /api/recipes/[id]/share` — creates SharedRecipe with random token, returns URL
- `GET /api/recipes/share/[token]` — **public** (no auth), returns recipe with ingredients and steps
- `POST /api/recipes/share/[token]/save` — **authenticated**, copies recipe into caller's cookbook

### Share page: `/recipes/share/[token]`
- Public page (excluded from middleware auth check)
- Read-only recipe view (same layout as detail page, no edit/delete/cook actions)
- If logged in: "Save to my cookbook" button
- If not logged in: just the recipe (sharable with non-users)

### Copy behavior
Copies: title, description, imageUrl, servings, prepTime, cookTime, cuisine, mealType, tags, notes, all ingredients, all steps. Sets `sourceUrl` to the share link. Does NOT copy: isFavorite, mealPlanItems, pantry state.

## Implementation Phases

### Phase 1 — User model + auth (~3-4 hours)
- Add User model to schema
- Update `auth.ts` with `getUserId()` helper
- Update login page (email + password)
- Update JWT creation/verification
- Seed admin user in migration
- Backfill existing data

### Phase 2 — Scope all data by userId (~2-3 hours)
- Add userId FK to all models
- Update all ~15 API route files
- Update middleware public paths

### Phase 3 — Admin settings (~1-2 hours)
- Settings page with user list
- Add/remove user API + UI

### Phase 4 — Recipe sharing (~2-3 hours)
- Share button + API
- Public share page
- "Save to my cookbook" flow

### Phase 5 — Tests (~2-3 hours)
- Update 76 existing tests (mock userId)
- Add multi-user isolation tests
- Add share flow tests

## What stays the same
- localStorage for view preferences, ingredient checks, servings scale (per-device, not per-user)
- sessionStorage for cooking mode (per-session)
- Scrapbook UI/design system
- AI features (import, search, merge) — just scoped by userId
- All existing UX patterns and components
