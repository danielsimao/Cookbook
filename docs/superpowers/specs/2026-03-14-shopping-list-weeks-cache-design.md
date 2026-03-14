# Shopping List: Week Navigation + AI Cache

## Problem

The shopping list has no week navigation — it only works when linked from the meal plan page with date params. Every visit runs the AI ingredient merge even if nothing changed, wasting API calls.

## Solution

Add standalone week navigation to the shopping list page and cache AI-merged results keyed by week + meal plan hash.

## Design

### Week Navigation (Frontend)

Add prev/next/today buttons to `shopping-list/page.tsx` using the same `startOfWeek`/`endOfWeek` pattern as the meal plan (Monday start). If URL has `startDate`/`endDate` params, use those; otherwise default to current week. Week changes update the URL params and re-fetch.

### Cache Model

New Prisma model:

```prisma
model ShoppingListCache {
  id           String   @id @default(cuid())
  weekStart    DateTime @unique
  mealPlanHash String
  items        Json
  createdAt    DateTime @default(now())
}
```

- `weekStart`: Monday of the week (unique key for lookup)
- `mealPlanHash`: Hash of sorted meal plan item IDs for that week. When any item is added/removed/changed, the hash changes.
- `items`: The AI-merged ingredient array stored as JSON

### API Flow (`GET /api/shopping-list`)

1. Parse `startDate`/`endDate` from query params
2. Fetch `MealPlanItem` records for that date range (with recipe ingredients)
3. If no items → return empty list (no cache needed)
4. Compute hash: sort meal plan item IDs, join, hash with a simple string hash
5. Look up `ShoppingListCache` where `weekStart` = start of week
6. **Cache hit** (hash matches) → use cached `items`, skip AI
7. **Cache miss** (no record or hash mismatch) → run `mergeIngredients()`, upsert cache record
8. Run pantry check against the (cached or fresh) items — always fresh since pantry can change independently
9. Return items with pantry flags

### Cache Invalidation

No explicit invalidation needed. The hash naturally changes when meal plan items change for that week. Old cache entries with stale hashes are overwritten on the next request via upsert.

### Files

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add `ShoppingListCache` model |
| `src/app/api/shopping-list/route.ts` | Add hash computation, cache read/write, skip AI on hit |
| `src/app/(app)/shopping-list/page.tsx` | Add week navigation (prev/next/today) |

### Verification

1. Open `/shopping-list` — defaults to current week, shows week navigation
2. Click next/prev — URL updates, list refreshes
3. First visit for a week — AI runs, result cached (check DB)
4. Refresh same week — cached result returned (no AI call, faster response)
5. Add a meal to that week's plan → revisit shopping list — hash mismatch, AI re-runs
6. Remove a meal → same behavior
7. Pantry changes reflect immediately without cache bust
