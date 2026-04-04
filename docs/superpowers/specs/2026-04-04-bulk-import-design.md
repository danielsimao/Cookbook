# Bulk Recipe Import — Design Spec

## Context

Users want to import multiple recipes at once from URLs (e.g., migrating from another app, saving a list from a message thread). The current single-URL import works but requires importing one at a time. This feature adds a bulk import page with progressive processing and a review step before saving.

## Flow

1. User pastes multiple URLs (one per line) into a textarea (max 20)
2. Clicks "Start Import" — URLs are processed sequentially
3. As each URL completes, the extracted recipe appears in a review list
4. User can edit, skip, retry failed, or stop processing
5. "Save All" saves all non-skipped recipes to the cookbook

## API

### New: `POST /api/recipes/extract`

Dedicated endpoint that scrapes + AI extracts but does NOT save to DB. Returns parsed recipe data for review.

- Request: `{ url: string }`
- Response: `{ title, description, servings, ingredients[], steps[], imageUrl, ... }` (same shape as `ParsedRecipe` from `ai.ts`)
- Errors: 400 (no URL), 500 (scrape/extract failure with message)

The existing `POST /api/recipes` endpoint is used to save each reviewed recipe.

## Testable Requirements

### Input Phase

| # | Requirement |
|---|-------------|
| BI1 | The bulk import page has a textarea for pasting URLs (one per line) |
| BI2 | The "Start Import" button is disabled when the textarea is empty |
| BI3 | Blank lines and duplicate URLs are filtered out before processing |
| BI4 | Invalid URLs (not starting with http/https) are rejected with inline feedback |
| BI5 | The textarea is disabled once processing starts |
| BI6 | A maximum of 20 URLs is enforced — error shown if exceeded |

### Processing Phase

| # | Requirement |
|---|-------------|
| BI7 | Each URL shows a status indicator: queued, processing, done, or failed |
| BI8 | URLs are processed sequentially (one at a time), not in parallel |
| BI9 | The currently processing URL shows a loading spinner |
| BI10 | A progress counter shows "3 of 7 processed" as processing advances |
| BI11 | Failed URLs show the error reason and a "Retry" button |
| BI12 | A "Stop" button halts processing of remaining queued URLs |
| BI13 | URLs that duplicate an existing recipe or another URL in the batch are auto-skipped |

### Review Phase

| # | Requirement |
|---|-------------|
| BI14 | Each successfully extracted recipe shows a card with: title, image thumbnail (if any), ingredient count, step count |
| BI15 | Clicking a recipe card expands it to show inline editable fields (title, servings, cuisine, mealType) |
| BI16 | Each recipe card has a "Skip" button that removes it from the batch |
| BI17 | Skipped recipes can be un-skipped (action is reversible) |

### Save Phase

| # | Requirement |
|---|-------------|
| BI18 | "Save All" button shows the count of recipes to be saved (e.g., "Save 5 Recipes") |
| BI19 | "Save All" is disabled when no recipes are ready (all skipped or all failed) |
| BI20 | After saving, the user is redirected to the recipes list page with a success toast |
| BI21 | Each recipe is saved via POST /api/recipes with the full recipe data |

## Design Decisions

- **No `dryRun` flag** — dedicated `/api/recipes/extract` endpoint instead (clean separation)
- **Client-side orchestration** — recipes held in component state until "Save All"
- **No server-side persistence of partial state** — closing the tab loses progress (acceptable for occasional-use feature)
- **Max 20 URLs** — sequential processing beyond that is unreasonably slow
- **Inline editing only** — title, servings, cuisine, mealType. Not the full recipe form.
- **`beforeunload` warning** during processing to prevent accidental tab close
- **Duplicate detection** — against both existing DB recipes and other URLs in the same batch

## Implementation

### Files to create
- `src/app/api/recipes/extract/route.ts` — scrape + AI extract, no save
- `src/app/(app)/recipes/bulk-import/page.tsx` — bulk import page
- `src/__tests__/bulk-import.test.tsx` — tests for all 21 requirements

### Files to modify
- `src/app/(app)/recipes/new/page.tsx` — add link to bulk import
