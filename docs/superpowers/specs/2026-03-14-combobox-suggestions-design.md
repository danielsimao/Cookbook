# Combobox Suggestions for Cuisine & Tags

## Problem

The recipe add/edit forms use plain text inputs for cuisine and tags. Users must type values from memory with no discoverability of what's already in their collection or common options.

## Solution

Replace the cuisine text input with a single-select combobox and the tags comma-separated input with a multi-select combobox with chip display. Both show suggestions from hardcoded defaults merged with the user's existing recipe data.

## Design

### Data Source: `src/lib/suggestions.ts`

Hardcoded default lists:

```ts
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

### API Endpoint: `GET /api/suggestions`

Returns merged list of defaults + distinct values from existing recipes.

```ts
// Response shape
{ cuisines: string[], tags: string[] }
```

Query: two Prisma `findMany` calls with `distinct` on `cuisine` and selecting all `tags` arrays, then flatten, dedupe, merge with defaults, and sort alphabetically.

### Component: `src/components/combobox-field.tsx`

A reusable combobox built on the existing `popover.tsx` from shadcn/ui.

**Props:**
```ts
interface ComboboxFieldProps {
  value: string;                    // For single-select (cuisine)
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  label?: string;
}

interface MultiComboboxFieldProps {
  values: string[];                 // For multi-select (tags)
  onChange: (values: string[]) => void;
  options: string[];
  placeholder?: string;
  label?: string;
}
```

**Single-select (Cuisine):**
- Trigger styled as `input-cookbook` (bottom-border, transparent bg)
- Click opens a `Popover` dropdown with a text filter input at top
- Options rendered in `font-hand` text
- Typing filters the list; if no match, shows "Add [typed value]" option
- Selecting sets the value and closes the popover

**Multi-select (Tags):**
- Selected tags display as `stamp-badge` styled removable chips above the input
- Click opens the same `Popover` dropdown with filter
- Selecting a tag adds it as a chip (doesn't close popover)
- Each chip has an × button to remove
- Typing a new value and pressing Enter creates a custom tag
- Tags not yet selected appear in the dropdown; already-selected ones are hidden

**Scrapbook styling rules:**
- Trigger/input: `input-cookbook` class (bottom-border only, `font-body`)
- Dropdown panel: `paper-card` background with `border` and shadow
- Dropdown items: `font-hand` text, hover shows `bg-secondary`
- Tag chips: `stamp-badge` class (2px border, slight rotation, uppercase, `font-hand`)
- Filter input inside dropdown: `input-cookbook` with placeholder
- "Add new" option: `font-hand text-primary` with + icon

### Form Integration

**New recipe page** (`src/app/(app)/recipes/new/page.tsx`):
- Replace cuisine `<input>` with `<ComboboxField>`
- Replace tags `<input>` with `<MultiComboboxField>`
- Fetch suggestions on mount via `GET /api/suggestions`
- Tags state changes from `string` to `string[]`
- Remove comma-split/join logic on save (tags already an array)

**Edit recipe page** (`src/app/(app)/recipes/[id]/edit/page.tsx`):
- Same changes as new page
- Tags pre-populated from `recipe.tags` array directly (no join needed)

### Files

| File | Action |
|------|--------|
| `src/lib/suggestions.ts` | Create — hardcoded defaults |
| `src/app/api/suggestions/route.ts` | Create — merge defaults + DB values |
| `src/components/combobox-field.tsx` | Create — single + multi combobox |
| `src/app/(app)/recipes/new/page.tsx` | Modify — swap inputs, fetch suggestions |
| `src/app/(app)/recipes/[id]/edit/page.tsx` | Modify — swap inputs, fetch suggestions |

### Verification

1. Open `/recipes/new` — cuisine dropdown shows merged defaults + DB values
2. Type a custom cuisine not in the list — "Add [value]" option appears
3. Select a cuisine — value shows in the input, popover closes
4. Tags — click shows dropdown, select multiple, chips appear with stamp-badge styling
5. Remove a tag chip — tag returns to dropdown options
6. Type a new tag, press Enter — custom tag added as chip
7. Save recipe — cuisine and tags persist correctly
8. Open `/recipes/{id}/edit` — both fields pre-populated from recipe data
9. Mobile — popovers work correctly, chips wrap properly
