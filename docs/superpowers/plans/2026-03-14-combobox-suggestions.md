# Combobox Suggestions Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace plain text cuisine/tags inputs with comboboxes that suggest values from hardcoded defaults merged with existing recipe data.

**Architecture:** New `GET /api/suggestions` endpoint queries distinct cuisines/tags from DB, merges with hardcoded defaults from `src/lib/suggestions.ts`. A reusable `ComboboxField` (single-select) and `MultiComboboxField` (multi-select with chips) component built on existing `popover.tsx`. Both recipe form pages swap their inputs for these comboboxes.

**Tech Stack:** Next.js API routes, Prisma, Radix Popover, existing scrapbook CSS classes (`input-cookbook`, `paper-card`, `stamp-badge`, `font-hand`)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/suggestions.ts` | Create | Hardcoded default cuisines and tags arrays |
| `src/app/api/suggestions/route.ts` | Create | API endpoint merging defaults + DB values |
| `src/components/combobox-field.tsx` | Create | `ComboboxField` (single) and `MultiComboboxField` (multi) components |
| `src/app/(app)/recipes/new/page.tsx` | Modify | Swap cuisine/tags inputs, change tags state to `string[]`, fetch suggestions |
| `src/app/(app)/recipes/[id]/edit/page.tsx` | Modify | Same swaps, change tags state to `string[]`, fetch suggestions |

---

### Task 1: Hardcoded Defaults

**Files:**
- Create: `src/lib/suggestions.ts`

- [ ] **Step 1: Create the defaults file**

```ts
// src/lib/suggestions.ts
export const DEFAULT_CUISINES = [
  "American", "Brazilian", "Chinese", "French", "Greek",
  "Indian", "Italian", "Japanese", "Korean", "Mediterranean",
  "Mexican", "Middle Eastern", "Spanish", "Thai", "Vietnamese",
];

export const DEFAULT_TAGS = [
  "quick", "easy", "healthy", "comfort", "spicy",
  "vegetarian", "vegan", "gluten-free", "baking", "grilling",
  "one-pot", "meal-prep", "kid-friendly", "date-night", "budget",
];
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/suggestions.ts
git commit -m "feat: add hardcoded default cuisines and tags"
```

---

### Task 2: Suggestions API Endpoint

**Files:**
- Create: `src/app/api/suggestions/route.ts`

- [ ] **Step 1: Create the endpoint**

```ts
// src/app/api/suggestions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_CUISINES, DEFAULT_TAGS } from "@/lib/suggestions";

export async function GET() {
  try {
    const [cuisineRows, tagRows] = await Promise.all([
      prisma.recipe.findMany({
        where: { cuisine: { not: null } },
        select: { cuisine: true },
        distinct: ["cuisine"],
      }),
      prisma.recipe.findMany({
        select: { tags: true },
      }),
    ]);

    const dbCuisines = cuisineRows
      .map((r) => r.cuisine!)
      .filter(Boolean);

    const dbTags = tagRows.flatMap((r) => r.tags);

    const cuisines = [...new Set([...DEFAULT_CUISINES, ...dbCuisines])].sort(
      (a, b) => a.localeCompare(b)
    );
    const tags = [...new Set([...DEFAULT_TAGS, ...dbTags])].sort(
      (a, b) => a.localeCompare(b)
    );

    return NextResponse.json({ cuisines, tags });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds, `/api/suggestions` listed as a route.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/suggestions/route.ts
git commit -m "feat: add suggestions API endpoint for cuisines and tags"
```

---

### Task 3: Combobox Components

**Files:**
- Create: `src/components/combobox-field.tsx`

This is the largest task. The component uses the existing `Popover` from `src/components/ui/popover.tsx` and scrapbook CSS classes.

- [ ] **Step 1: Create the combobox component file**

```tsx
// src/components/combobox-field.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ─── Single-select combobox (Cuisine) ───

interface ComboboxFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

export function ComboboxField({
  value,
  onChange,
  options,
  placeholder = "Select...",
}: ComboboxFieldProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(filter.toLowerCase())
  );
  const showAdd = filter.trim() && !options.some(
    (o) => o.toLowerCase() === filter.trim().toLowerCase()
  );

  useEffect(() => {
    if (open) {
      setFilter("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  function select(val: string) {
    onChange(val);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "input-cookbook w-full mt-1 text-left flex items-center justify-between gap-2",
            !value && "text-muted-foreground opacity-60"
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="paper-card p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
        sideOffset={4}
      >
        <div className="p-2 border-b border-border">
          <input
            ref={inputRef}
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Type to search..."
            className="input-cookbook w-full !border-b-0 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && showAdd) {
                select(filter.trim());
              }
            }}
          />
        </div>
        <div className="max-h-48 overflow-y-auto p-1">
          {filtered.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => select(option)}
              className={cn(
                "w-full text-left px-3 py-1.5 font-hand text-base rounded hover:bg-secondary transition-colors",
                value === option && "text-primary font-bold"
              )}
            >
              {option}
            </button>
          ))}
          {showAdd && (
            <button
              type="button"
              onClick={() => select(filter.trim())}
              className="w-full text-left px-3 py-1.5 font-hand text-base text-primary rounded hover:bg-secondary transition-colors flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add &ldquo;{filter.trim()}&rdquo;
            </button>
          )}
          {filtered.length === 0 && !showAdd && (
            <p className="px-3 py-2 text-sm text-muted-foreground font-hand">
              No matches
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Multi-select combobox (Tags) ───

interface MultiComboboxFieldProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
  placeholder?: string;
}

export function MultiComboboxField({
  values,
  onChange,
  options,
  placeholder = "Add tags...",
}: MultiComboboxFieldProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const available = options.filter(
    (o) =>
      !values.includes(o) &&
      o.toLowerCase().includes(filter.toLowerCase())
  );
  const showAdd = filter.trim() && !options.some(
    (o) => o.toLowerCase() === filter.trim().toLowerCase()
  ) && !values.some(
    (v) => v.toLowerCase() === filter.trim().toLowerCase()
  );

  useEffect(() => {
    if (open) {
      setFilter("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  function addTag(tag: string) {
    onChange([...values, tag]);
    setFilter("");
  }

  function removeTag(tag: string) {
    onChange(values.filter((v) => v !== tag));
  }

  return (
    <div>
      {/* Tag chips */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {values.map((tag, i) => (
            <span
              key={tag}
              className="stamp-badge flex items-center gap-1 !transform-none"
              style={{
                transform: `rotate(${i % 2 === 0 ? "-2deg" : "1.5deg"})`,
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="input-cookbook w-full mt-1 text-left flex items-center justify-between gap-2 text-muted-foreground opacity-60"
          >
            <span>{placeholder}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="paper-card p-0 w-[var(--radix-popover-trigger-width)]"
          align="start"
          sideOffset={4}
        >
          <div className="p-2 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Type to search or add..."
              className="input-cookbook w-full !border-b-0 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && filter.trim()) {
                  if (showAdd) {
                    addTag(filter.trim());
                  } else if (available.length > 0) {
                    addTag(available[0]);
                  }
                }
              }}
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {available.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => addTag(option)}
                className="w-full text-left px-3 py-1.5 font-hand text-base rounded hover:bg-secondary transition-colors"
              >
                {option}
              </button>
            ))}
            {showAdd && (
              <button
                type="button"
                onClick={() => addTag(filter.trim())}
                className="w-full text-left px-3 py-1.5 font-hand text-base text-primary rounded hover:bg-secondary transition-colors flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add &ldquo;{filter.trim()}&rdquo;
              </button>
            )}
            {available.length === 0 && !showAdd && (
              <p className="px-3 py-2 text-sm text-muted-foreground font-hand">
                {values.length === options.length ? "All tags selected" : "No matches"}
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/combobox-field.tsx
git commit -m "feat: add ComboboxField and MultiComboboxField components"
```

---

### Task 4: Integrate into New Recipe Page

**Files:**
- Modify: `src/app/(app)/recipes/new/page.tsx`

Changes:
1. Add imports for `ComboboxField`, `MultiComboboxField`
2. Add `useEffect` import, add suggestions state and fetch
3. Change `tags` state from `string` to `string[]`
4. Replace cuisine `<input>` with `<ComboboxField>`
5. Replace tags `<input>` with `<MultiComboboxField>`
6. Remove comma-split logic in `handleSave` — tags is already `string[]`

- [ ] **Step 1: Add imports (line 1-19)**

Add to imports:
```tsx
import { useEffect } from "react"; // add useEffect to the existing import from "react"
import { ComboboxField, MultiComboboxField } from "@/components/combobox-field";
```

The `useState` import on line 1 becomes `useState, useEffect`.

- [ ] **Step 2: Add suggestions state and fetch**

After line 66 (`const [saving, setSaving] = useState(false);`), add:

```tsx
const [cuisineOptions, setCuisineOptions] = useState<string[]>([]);
const [tagOptions, setTagOptions] = useState<string[]>([]);

useEffect(() => {
  fetch("/api/suggestions")
    .then((r) => r.json())
    .then((data) => {
      setCuisineOptions(data.cuisines);
      setTagOptions(data.tags);
    })
    .catch(() => {});
}, []);
```

- [ ] **Step 3: Change tags state type**

Change line 60 from:
```tsx
const [tags, setTags] = useState("");
```
to:
```tsx
const [tags, setTags] = useState<string[]>([]);
```

- [ ] **Step 4: Update handleSave — remove comma-split for tags**

In `handleSave`, change lines 129-132 from:
```tsx
tags: tags
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean),
```
to:
```tsx
tags,
```

- [ ] **Step 5: Replace cuisine input (lines 368-380)**

Replace the cuisine `<div>` block:
```tsx
<div>
  <label className="text-sm font-medium text-muted-foreground">
    Cuisine
  </label>
  <ComboboxField
    value={cuisine}
    onChange={setCuisine}
    options={cuisineOptions}
    placeholder="Select cuisine..."
  />
</div>
```

- [ ] **Step 6: Replace tags input (lines 381-392)**

Replace the tags `<div>` block:
```tsx
<div>
  <label className="text-sm font-medium text-muted-foreground">
    Tags
  </label>
  <MultiComboboxField
    values={tags}
    onChange={setTags}
    options={tagOptions}
    placeholder="Add tags..."
  />
</div>
```

- [ ] **Step 7: Verify build**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/recipes/new/page.tsx"
git commit -m "feat: use combobox for cuisine and tags on new recipe page"
```

---

### Task 5: Integrate into Edit Recipe Page

**Files:**
- Modify: `src/app/(app)/recipes/[id]/edit/page.tsx`

Same pattern as Task 4.

- [ ] **Step 1: Add imports**

Add to line 1 (already has `useEffect`):
```tsx
import { ComboboxField, MultiComboboxField } from "@/components/combobox-field";
```

- [ ] **Step 2: Change tags state type**

Change line 37 from:
```tsx
const [tags, setTags] = useState("");
```
to:
```tsx
const [tags, setTags] = useState<string[]>([]);
```

- [ ] **Step 3: Add suggestions state and fetch**

After line 41 (`const [steps, setSteps] = useState<string[]>([]);`), add:

```tsx
const [cuisineOptions, setCuisineOptions] = useState<string[]>([]);
const [tagOptions, setTagOptions] = useState<string[]>([]);
```

Inside the existing `useEffect` that fetches the recipe (line 43), after the `setSteps(...)` call (line 72), add:

```tsx
fetch("/api/suggestions")
  .then((r) => r.json())
  .then((data) => {
    setCuisineOptions(data.cuisines);
    setTagOptions(data.tags);
  })
  .catch(() => {});
```

- [ ] **Step 4: Fix recipe loading — tags no longer joined**

Change line 55 from:
```tsx
setTags(recipe.tags.join(", "));
```
to:
```tsx
setTags(recipe.tags);
```

- [ ] **Step 5: Update handleSave — remove comma-split for tags**

Change lines 101-104 from:
```tsx
tags: tags
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean),
```
to:
```tsx
tags,
```

- [ ] **Step 6: Replace cuisine input (line 197)**

Replace the cuisine `<div>`:
```tsx
<div>
  <label className="text-sm font-medium text-muted-foreground">Cuisine</label>
  <ComboboxField
    value={cuisine}
    onChange={setCuisine}
    options={cuisineOptions}
    placeholder="Select cuisine..."
  />
</div>
```

- [ ] **Step 7: Replace tags input (lines 199-202)**

Replace the tags `<div>`:
```tsx
<div>
  <label className="text-sm font-medium text-muted-foreground">Tags</label>
  <MultiComboboxField
    values={tags}
    onChange={setTags}
    options={tagOptions}
    placeholder="Add tags..."
  />
</div>
```

- [ ] **Step 8: Verify build**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 9: Commit**

```bash
git add "src/app/(app)/recipes/[id]/edit/page.tsx"
git commit -m "feat: use combobox for cuisine and tags on edit recipe page"
```

---

### Task 6: Manual Verification

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`

- [ ] **Step 2: Test new recipe page**

Open `http://localhost:3000/recipes/new`:
- Click cuisine field — dropdown shows alphabetically sorted defaults
- Type "Braz" — filters to "Brazilian"
- Type "Peruvian" — shows "Add Peruvian" option
- Select it — popover closes, value shows
- Click tags field — dropdown shows defaults
- Select "quick" — chip appears with stamp-badge styling
- Select "healthy" — second chip appears, popover stays open
- Click × on a chip — tag removed, reappears in dropdown
- Type "keto" + Enter — custom tag added as chip
- Save recipe — verify cuisine and tags persist

- [ ] **Step 3: Test edit recipe page**

Open an existing recipe's edit page:
- Cuisine pre-populated from recipe data
- Tags pre-populated as chips
- Same combobox behavior as new page
- Save — values persist correctly

- [ ] **Step 4: Test mobile**

Resize to mobile width:
- Popovers open correctly, not cut off
- Tag chips wrap properly
- Dropdown scrollable

- [ ] **Step 5: Final commit if any fixes needed**
