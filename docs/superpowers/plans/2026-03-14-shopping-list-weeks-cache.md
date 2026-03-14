# Shopping List Week Navigation + Cache Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add week navigation to the shopping list page and cache AI-merged results so the AI only runs when the meal plan changes.

**Architecture:** New `ShoppingListCache` Prisma model stores merged ingredients keyed by `weekStart` + a hash of meal plan item IDs. The API checks the hash on each request — cache hit skips AI, cache miss runs AI and upserts. Frontend adds prev/next/today week navigation using the same `date-fns` pattern as the meal plan page.

**Tech Stack:** Prisma (PostgreSQL JSON column), date-fns, Next.js API routes, existing scrapbook CSS

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `prisma/schema.prisma` | Modify | Add `ShoppingListCache` model |
| `src/app/api/shopping-list/route.ts` | Modify | Add hash computation, cache read/write |
| `src/app/(app)/shopping-list/page.tsx` | Modify | Add week navigation UI |

---

### Task 1: Add ShoppingListCache Model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the model to schema**

Append after the `PantryItem` model:

```prisma
model ShoppingListCache {
  id           String   @id @default(cuid())
  weekStart    DateTime @unique
  mealPlanHash String
  items        Json
  createdAt    DateTime @default(now())
}
```

- [ ] **Step 2: Create migration**

Run: `npx prisma migrate dev --name add-shopping-list-cache`
Expected: Migration created and applied successfully.

- [ ] **Step 3: Commit**

```bash
git add prisma/
git commit -m "feat: add ShoppingListCache model for AI result caching"
```

---

### Task 2: Add Cache Logic to Shopping List API

**Files:**
- Modify: `src/app/api/shopping-list/route.ts`

- [ ] **Step 1: Rewrite the API route with cache logic**

Replace the entire file content:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mergeIngredients } from "@/lib/ai";
import { startOfWeek } from "date-fns";
import { createHash } from "crypto";

function computeHash(ids: string[]): string {
  return createHash("md5").update(ids.sort().join(",")).digest("hex");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const weekStart = startOfWeek(start, { weekStartsOn: 1 });

    // Fetch meal plan items for this date range
    const mealPlanItems = await prisma.mealPlanItem.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      include: {
        recipe: {
          include: { ingredients: true },
        },
      },
    });

    // Empty week — no items, no cache needed
    if (mealPlanItems.length === 0) {
      return NextResponse.json({ ingredients: [], pantryItems: [], cached: false });
    }

    // Compute hash of current meal plan state
    const mealPlanHash = computeHash(mealPlanItems.map((item) => item.id));

    // Check cache
    const cached = await prisma.shoppingListCache.findUnique({
      where: { weekStart },
    });

    let merged: { name: string; quantity: string; category: string }[];

    if (cached && cached.mealPlanHash === mealPlanHash) {
      // Cache hit — skip AI
      merged = cached.items as typeof merged;
    } else {
      // Cache miss — run AI merge
      type MealPlanWithRecipe = (typeof mealPlanItems)[number];
      type IngredientRecord = MealPlanWithRecipe["recipe"]["ingredients"][number];

      const allIngredients = mealPlanItems.flatMap((item: MealPlanWithRecipe) =>
        item.recipe.ingredients.map((ing: IngredientRecord) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          toTaste: ing.toTaste,
        }))
      );

      merged = await mergeIngredients(allIngredients);

      // Upsert cache
      await prisma.shoppingListCache.upsert({
        where: { weekStart },
        update: { mealPlanHash, items: merged as unknown as Record<string, unknown>[] },
        create: { weekStart, mealPlanHash, items: merged as unknown as Record<string, unknown>[] },
      });
    }

    // Pantry check — always fresh
    const pantryItems = await prisma.pantryItem.findMany();
    type PantryRecord = (typeof pantryItems)[number];
    const pantryNames = pantryItems.map((p: PantryRecord) => p.name.toLowerCase());

    const ingredients = merged.map((ing) => ({
      ...ing,
      checked: pantryNames.some(
        (p: string) => ing.name.toLowerCase().includes(p) || p.includes(ing.name.toLowerCase())
      ),
    }));

    return NextResponse.json({
      ingredients,
      pantryItems: pantryItems.map((p: PantryRecord) => p.name),
      cached: !!(cached && cached.mealPlanHash === mealPlanHash),
    });
  } catch (error) {
    console.error("Failed to generate shopping list:", error);
    return NextResponse.json(
      { error: "Failed to generate shopping list" },
      { status: 500 }
    );
  }
}
```

Key changes from the original:
- Added `computeHash()` using Node.js `crypto`
- Added cache lookup before AI call
- Upsert cache after AI runs
- Added `cached` boolean to response (for debugging/UI)
- Added error logging in catch block

- [ ] **Step 2: Verify build**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/shopping-list/route.ts
git commit -m "feat: add meal plan hash caching to shopping list API"
```

---

### Task 3: Add Week Navigation to Shopping List Page

**Files:**
- Modify: `src/app/(app)/shopping-list/page.tsx`

- [ ] **Step 1: Add week navigation imports and state**

Add `addWeeks`, `subWeeks` to the `date-fns` import:

```ts
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  isThisWeek,
} from "date-fns";
```

Add `ChevronLeft`, `ChevronRight` to the lucide import:

```ts
import {
  ArrowLeft,
  Check,
  ShoppingCart,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
```

Add `useRouter` import:

```ts
import { useSearchParams, useRouter } from "next/navigation";
```

- [ ] **Step 2: Add week navigation logic**

Inside `ShoppingListPage`, after the `searchParams` lines, replace the date computation and add navigation:

```ts
const router = useRouter();

const now = new Date();
const weekBase = searchParams.get("startDate")
  ? new Date(searchParams.get("startDate")!)
  : now;
const weekStart = startOfWeek(weekBase, { weekStartsOn: 1 });
const weekEnd = endOfWeek(weekBase, { weekStartsOn: 1 });
const startDate = weekStart.toISOString();
const endDate = weekEnd.toISOString();

function navigateWeek(date: Date) {
  const ws = startOfWeek(date, { weekStartsOn: 1 });
  const we = endOfWeek(date, { weekStartsOn: 1 });
  router.push(`/shopping-list?startDate=${ws.toISOString()}&endDate=${we.toISOString()}`);
}
```

- [ ] **Step 3: Add week navigation UI**

Replace the header section (the `<div className="flex items-center gap-3">` block) with:

```tsx
<div className="flex items-center gap-3">
  <Link
    href="/meal-plan"
    className="p-2 rounded-lg hover:bg-secondary transition-colors"
  >
    <ArrowLeft className="h-4 w-4" />
  </Link>
  <div className="flex-1">
    <h1 className="font-display text-2xl font-bold hand-underline">Shopping List</h1>
  </div>
  <button
    onClick={fetchList}
    className="p-2 rounded-lg hover:bg-secondary"
    title="Refresh"
  >
    <RefreshCw className="h-4 w-4" />
  </button>
</div>

{/* Week navigation */}
<div className="flex items-center justify-between">
  <button
    onClick={() => navigateWeek(subWeeks(weekStart, 1))}
    className="p-2 rounded-lg hover:bg-secondary transition-colors"
  >
    <ChevronLeft className="h-5 w-5" />
  </button>
  <div className="text-center">
    <p className="font-hand text-lg font-bold">
      {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
    </p>
    {!isThisWeek(weekStart, { weekStartsOn: 1 }) && (
      <button
        onClick={() => navigateWeek(new Date())}
        className="font-hand text-sm text-primary hover:underline"
      >
        Back to this week
      </button>
    )}
  </div>
  <button
    onClick={() => navigateWeek(addWeeks(weekStart, 1))}
    className="p-2 rounded-lg hover:bg-secondary transition-colors"
  >
    <ChevronRight className="h-5 w-5" />
  </button>
</div>
```

- [ ] **Step 4: Verify build**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/shopping-list/page.tsx"
git commit -m "feat: add week navigation to shopping list page"
```

---

### Task 4: Manual Verification

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`

- [ ] **Step 2: Test week navigation**

Open `http://localhost:3000/shopping-list`:
- Page loads with current week's date range
- Click left chevron → shows previous week
- Click right chevron → shows next week
- "Back to this week" link appears when not on current week
- URL updates with `startDate` and `endDate` params

- [ ] **Step 3: Test caching**

With meals in the current week's plan:
- First visit → loading spinner shows, AI runs, list appears
- Refresh → should load faster (cached, no AI call)
- Check DB: `npx prisma studio` → `ShoppingListCache` table has an entry
- Add a meal to the plan for this week → revisit shopping list → AI re-runs (hash changed)

- [ ] **Step 4: Test edge cases**

- Empty week (no meals) → shows "No items to buy" + link to meal plan
- Pantry items still highlighted correctly on cached results
- Mobile: week nav fits on small screens

- [ ] **Step 5: Final commit if any fixes needed**
