import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

import ShoppingListPageWrapper from "@/app/(app)/shopping-list/page";

const mockShoppingList = {
  ingredients: [
    { name: "Spaghetti", quantity: "500g", category: "Pasta & Grains" },
    { name: "Eggs", quantity: "4", category: "Dairy & Eggs" },
    { name: "Pecorino", quantity: "100g", category: "Dairy & Eggs" },
    { name: "Chicken", quantity: "500g", category: "Meat" },
  ],
  pantryItems: ["Salt", "Olive Oil"],
};

describe("Shopping List", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockClear();
    localStorage.clear();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockShoppingList),
    });
  });

  // S1: Checked items persist across reloads
  it("S1: checked items persist across page reloads", async () => {
    const user = userEvent.setup();

    const { unmount } = render(<ShoppingListPageWrapper />);

    await waitFor(() => {
      expect(screen.getByText("Spaghetti")).toBeInTheDocument();
    });

    // Check an item
    await user.click(screen.getByText("Spaghetti"));

    // Verify localStorage was written
    const keys = Object.keys(localStorage);
    const checkedKey = keys.find((k) => k.startsWith("cookbook-shopping-checked-"));
    expect(checkedKey).toBeTruthy();

    unmount();

    // Remount — checked state should persist from localStorage
    render(<ShoppingListPageWrapper />);

    await waitFor(() => {
      expect(screen.getByText("Spaghetti")).toBeInTheDocument();
    });

    const spaghetti = screen.getByText("Spaghetti");
    expect(spaghetti).toHaveClass("line-through");
  });

  // S2: Uncheck all with confirmation
  it("S2: confirms before unchecking all when more than 3 items are checked", async () => {
    const user = userEvent.setup();

    render(<ShoppingListPageWrapper />);

    await waitFor(() => {
      expect(screen.getByText("Spaghetti")).toBeInTheDocument();
    });

    // Check 4 items
    await user.click(screen.getByText("Spaghetti"));
    await user.click(screen.getByText("Eggs"));
    await user.click(screen.getByText("Pecorino"));
    await user.click(screen.getByText("Chicken"));

    const clearBtn = screen.getByRole("button", { name: /clear all/i });
    await user.click(clearBtn);

    expect(
      screen.getByText(/are you sure/i)
    ).toBeInTheDocument();
  });

  // S3: Refresh button shows loading and explains
  it("S3: refresh button shows loading state and explains regeneration", async () => {
    const user = userEvent.setup();

    render(<ShoppingListPageWrapper />);

    await waitFor(() => {
      expect(screen.getByText("Spaghetti")).toBeInTheDocument();
    });

    // Make refresh never-resolving
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    const refreshBtn = screen.getByTitle("Refresh");
    await user.click(refreshBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/regenerating/i)
      ).toBeInTheDocument();
    });
  });

  // S4: Regeneration preserves checked items
  it("S4: reconciles checked items after regeneration — items that still exist remain checked", async () => {
    const user = userEvent.setup();

    render(<ShoppingListPageWrapper />);

    await waitFor(() => {
      expect(screen.getByText("Spaghetti")).toBeInTheDocument();
    });

    // Check Spaghetti
    await user.click(screen.getByText("Spaghetti"));

    // Regenerate with same data
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockShoppingList),
    });

    const refreshBtn = screen.getByTitle("Refresh");
    await user.click(refreshBtn);

    await waitFor(() => {
      const spaghetti = screen.getByText("Spaghetti");
      // Should still be checked after regeneration — currently resets — should FAIL
      expect(spaghetti).toHaveClass("line-through");
    });
  });

  // S5: Custom items persist across reloads
  it("S5: custom items persist across page reloads", async () => {
    const user = userEvent.setup();

    const { unmount } = render(<ShoppingListPageWrapper />);

    await waitFor(() => {
      expect(screen.getByText("Spaghetti")).toBeInTheDocument();
    });

    // Add a custom item
    const customInput = screen.getByPlaceholderText("Add an item...");
    await user.type(customInput, "Bread");
    await user.keyboard("{Enter}");

    expect(screen.getByText("Bread")).toBeInTheDocument();

    // Verify localStorage was written
    const keys = Object.keys(localStorage);
    const customKey = keys.find((k) => k.startsWith("cookbook-shopping-custom-"));
    expect(customKey).toBeTruthy();

    unmount();

    // Remount — custom item should persist from localStorage
    render(<ShoppingListPageWrapper />);

    await waitFor(() => {
      expect(screen.getByText("Spaghetti")).toBeInTheDocument();
    });

    expect(screen.getByText("Bread")).toBeInTheDocument();
  });

  // S6: Duplicate custom item highlights existing
  it("S6: highlights existing item instead of just showing error when adding duplicate", async () => {
    const user = userEvent.setup();

    render(<ShoppingListPageWrapper />);

    await waitFor(() => {
      expect(screen.getByText("Spaghetti")).toBeInTheDocument();
    });

    // Try to add "Spaghetti" as custom item (already in shopping list)
    const customInput = screen.getByPlaceholderText("Add an item...");
    await user.type(customInput, "Spaghetti");
    await user.keyboard("{Enter}");

    // Should highlight the existing item
    await waitFor(() => {
      const buttons = document.querySelectorAll("button");
      const highlighted = Array.from(buttons).find((b) =>
        b.className.includes("ring") && b.textContent?.includes("Spaghetti")
      );
      expect(highlighted).toBeTruthy();
    });
  });

  // S7: Progress bar shows count
  it("S7: progress bar displays a count label (e.g., '2 of 4 items')", async () => {
    const user = userEvent.setup();

    render(<ShoppingListPageWrapper />);

    await waitFor(() => {
      expect(screen.getByText("Spaghetti")).toBeInTheDocument();
    });

    // Check 2 items
    await user.click(screen.getByText("Spaghetti"));
    await user.click(screen.getByText("Eggs"));

    // Should show "2 of 4 items" — currently shows "2 of 4 items" and percentage
    // This should PASS since the implementation already has this
    expect(screen.getByText(/2 of 4/)).toBeInTheDocument();
  });

  // S8: Empty state links to meal plan
  it("S8: empty state links to meal plan page", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ingredients: [], pantryItems: [] }),
    });

    render(<ShoppingListPageWrapper />);

    await waitFor(() => {
      expect(screen.getByText(/no items/i)).toBeInTheDocument();
    });

    const mealPlanLink = screen.getByRole("link", { name: /meal plan/i });
    expect(mealPlanLink).toHaveAttribute("href", "/meal-plan");
  });
});
