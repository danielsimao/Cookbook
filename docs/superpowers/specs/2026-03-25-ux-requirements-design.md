# UX Requirements — Cookbook App

> Each requirement is a testable behavior statement that maps to a `describe`/`it` block.
> Focus: core functionality gaps — features that exist but behave poorly or incompletely.

---

## Login Page

| # | Requirement |
|---|-------------|
| L1 | When the user is already authenticated and visits `/login`, they are redirected to `/` |
| L2 | When the user submits an incorrect password, the error message "Wrong password" is displayed and the input is not cleared |
| L3 | When the user submits the form, the button shows "Signing in..." and is disabled until the response arrives |
| L4 | When a network error occurs during login, a descriptive error is shown (not just "Something went wrong") |
| L5 | After successful login, the user is redirected to the home page |

---

## Home Page (Dashboard)

| # | Requirement |
|---|-------------|
| H1 | When the recipe fetch fails, an error message is displayed to the user (not a silent failure) |
| H2 | When the user has no recipes, an empty state with a CTA to add a recipe is shown |
| H3 | When the user has favorites, the Favorites section is visible; when they have none, the section is hidden with no jarring layout shift |
| H4 | When more than 6 recent recipes exist, a "View all" link navigates to the recipes page |
| H5 | When more than 4 favorite recipes exist, a "View all" link navigates to the recipes page filtered by favorites |
| H6 | Skeleton loaders match the layout of the loaded content (no content jump on load) |

---

## Recipes List

| # | Requirement |
|---|-------------|
| R1 | The user's view preference (grid/list) persists across page reloads |
| R2 | Active filters (meal type, favorites) are reflected in the URL so the state survives reload and is shareable |
| R3 | When AI search is in progress, a distinct loading indicator is shown (not just the button spinner) |
| R4 | When search or filters return no results, a "No recipes found" message is displayed with a clear action to reset filters |
| R5 | When the recipe fetch fails, an error state is shown (not just an empty grid) |
| R6 | The search query persists in the input across page reloads (driven by URL state) |

---

## Recipe Add/Import (New)

| # | Requirement |
|---|-------------|
| N1 | When URL import fails, the error message indicates *why* (invalid URL, unreachable site, parsing failure) — not just "Failed to import" |
| N2 | When photo import fails, the user is told why and can retry without re-selecting the file |
| N3 | The image upload field displays the max file size (4.5 MB) to the user before they attempt upload |
| N4 | Clicking "to taste" replaces the quantity/unit fields with a stamp badge; clicking the stamp toggles back to quantity mode (mutually exclusive, no content shift) |
| N5 | When a duplicate recipe is detected during URL import, the message explains what "Import Again" will do (create a second copy) |
| N6 | Required fields are clearly marked, and submitting with missing required fields shows inline error messages (not just a disabled button) |
| N7 | After successful import (URL or photo), the user sees a success confirmation before or during redirect |

---

## Manual Recipe Entry

| # | Requirement |
|---|-------------|
| MR1 | Adding a new ingredient row places focus on the new ingredient's name field |
| MR2 | Empty ingredient rows (no name filled) are silently excluded on save — the user is not forced to delete them manually |
| MR3 | The form starts with one empty ingredient row and one empty step; both sections have an "Add" button |
| MR4 | When the user removes the last ingredient or step, the section remains with one empty row (never zero rows) |
| MR5 | Numeric fields (servings, prep time, cook time) reject non-numeric input and show inline feedback for invalid values (e.g., negative numbers) |
| MR6 | The cuisine combobox and tags multi-combobox load suggestions on mount; if suggestions fail to load, the fields still work as free-text input |
| MR7 | Steps can be reordered via drag-and-drop, and the new order is reflected immediately in the step numbers |
| MR8 | When save fails, the form retains all entered data — nothing is cleared |
| MR9 | The save button is disabled and shows a loading spinner while the save request is in flight |
| MR10 | After a successful save, the user is redirected to the new recipe's detail page with a success toast |
| MR11 | Ingredient group field is hidden by default behind a "+ group" link; clicking reveals an input; set groups display as washi-tape labels; groups are preserved on save |

---

## Recipe Detail

| # | Requirement |
|---|-------------|
| D1 | When the user scales servings, the scaled value persists across page reloads for that recipe |
| D2 | The base serving size is displayed alongside the scaling controls (e.g., "4 servings (original)") |
| D3 | When the recipe fetch fails, an error state is shown with a retry action (not just a toast + fallback text) |
| D4 | The favorite toggle button has an accessible label (aria-label) that reflects current state ("Add to favorites" / "Remove from favorites") |
| D5 | When the user deletes a recipe, the confirmation dialog clearly states the action is permanent |
| D6 | After toggling favorite, the heart icon updates immediately (optimistic UI) with rollback on failure |

---

## Recipe Edit

| # | Requirement |
|---|-------------|
| E1 | When the user has unsaved changes and attempts to navigate away, a confirmation dialog warns them |
| E2 | The cancel button triggers the unsaved changes warning if modifications exist |
| E3 | After a successful save, a success toast is shown before or during the redirect |
| E4 | When the save fails, the form remains intact with all entered data preserved and an error message is shown |
| E5 | Required fields show inline validation errors on submit (same behavior as Recipe New) |

---

## Cooking Mode

| # | Requirement |
|---|-------------|
| C1 | Checked ingredients persist for the duration of the cooking session — navigating between ingredients and steps does not reset them |
| C2 | The user's current step is preserved if they navigate away from cooking mode and return (within the same session) |
| C3 | The user can tap on any step indicator in the progress bar to jump directly to that step |
| C4 | Arrow key navigation (left/right) moves between steps on desktop |
| C5 | The ingredient checklist shows a count of checked items (e.g., "3 of 8 ingredients ready") |
| C6 | When the user completes all steps and reaches the "All done" screen, the recipe is visually marked in recent history as "cooked" |
| C7 | If the screen wake lock fails to acquire, a subtle notice informs the user to keep their screen on manually |

---

## Meal Plan

| # | Requirement |
|---|-------------|
| M1 | Removing a meal from the plan requires a confirmation tap (e.g., swipe-to-reveal delete, or a confirm prompt) — not a single-tap permanent delete |
| M2 | "Fill week" shows a preview of the randomly chosen recipes before confirming |
| M3 | When a day has no meals, it displays an explicit empty state (e.g., "No meals planned") — not just blank space |
| M4 | The "Add recipe" modal shows a loading skeleton while recipes are being fetched |
| M5 | Meal type indicators (breakfast/lunch/dinner) have accessible labels, not just emoji |
| M6 | The selected week persists in the URL so the state survives reload and sharing |
| M7 | When the meal plan fetch fails, an error state is shown with a retry action |

---

## Shopping List

| # | Requirement |
|---|-------------|
| S1 | Checked items persist across page reloads (within the same week) |
| S2 | The user can uncheck all items at once, with a confirmation if more than 3 items are checked |
| S3 | The refresh/regenerate button shows a loading state and explains it will regenerate the list (not just an icon) |
| S4 | When regenerating the shopping list, previously checked items are reconciled — items that still exist remain checked |
| S5 | Custom items persist server-side (database) and sync across devices within the same week; auto-cleaned after 2 weeks |
| S6 | When adding a custom item that already exists (case-insensitive), the duplicate is highlighted instead of showing only an error |
| S7 | The progress bar displays a percentage label (e.g., "5 of 12 items") |
| S8 | When the shopping list is empty because there's no meal plan, the empty state links directly to the meal plan page |

---

## Pantry

| # | Requirement |
|---|-------------|
| P1 | The remove button is accessible on mobile (visible without hover — e.g., swipe-to-delete or always-visible icon) |
| P2 | The total pantry item count is prominently displayed (e.g., in the section header) |
| P3 | Search is always visible (not hidden behind a threshold of >10 items) |
| P4 | When adding an item that already exists (case-insensitive), the existing item is highlighted/scrolled-to instead of only showing an error |
| P5 | When the pantry fetch fails, an error state is shown with a retry action |
| P6 | After adding an item, the input is cleared and focus returns to the input for rapid entry |
| P7 | When removing an item, a brief undo option is available (e.g., toast with "Undo" action) |
