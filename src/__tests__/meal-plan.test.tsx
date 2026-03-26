import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { format, startOfWeek, endOfWeek } from "date-fns";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

import MealPlanPage from "@/app/(app)/meal-plan/page";

const today = new Date();
const weekStart = startOfWeek(today, { weekStartsOn: 1 });

const mockItems = [
  {
    id: "mp1",
    date: today.toISOString(), // Use today so it shows on the selected day
    mealType: "dinner",
    recipe: {
      id: "r1",
      title: "Pasta Carbonara",
      imageUrl: null,
      prepTime: 10,
      cookTime: 20,
    },
  },
];

const mockRecipes = [
  { id: "r1", title: "Pasta Carbonara", imageUrl: null, mealType: "dinner" },
  { id: "r2", title: "Greek Salad", imageUrl: null, mealType: "lunch" },
];

describe("Meal Plan", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockClear();

    global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url === "string" && url.includes("/api/meal-plan/random")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (typeof url === "string" && url.includes("/api/meal-plan/clear")) {
        return Promise.resolve({ ok: true });
      }
      if (typeof url === "string" && url.includes("/api/meal-plan") && opts?.method === "DELETE") {
        return Promise.resolve({ ok: true });
      }
      if (typeof url === "string" && url.includes("/api/meal-plan") && opts?.method === "POST") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      if (typeof url === "string" && url.includes("/api/recipes")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockRecipes) });
      }
      if (typeof url === "string" && url.includes("/api/meal-plan")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockItems) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  });

  // M1: Meal removal requires confirmation
  it("M1: requires confirmation before removing a meal from the plan", async () => {
    const user = userEvent.setup();

    render(<MealPlanPage />);

    await waitFor(() => {
      expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument();
    });

    // Find the remove button (X icon) on the meal item
    const paperCards = document.querySelectorAll('[class*="paper-card"]');
    let removeBtn: HTMLElement | null = null;
    paperCards.forEach((card) => {
      const btn = card.querySelector("button");
      if (btn) removeBtn = btn as HTMLElement;
    });

    if (removeBtn) await user.click(removeBtn);

    // Should show a confirmation
    await waitFor(() => {
      expect(screen.getByText(/remove this meal/i)).toBeInTheDocument();
    });

    // Meal should still be visible until confirmed
    expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument();
  });

  // M2: Fill week shows preview/confirmation
  it("M2: 'Fill week' shows a confirmation before filling", async () => {
    const user = userEvent.setup();

    render(<MealPlanPage />);

    await waitFor(() => {
      expect(screen.getByText("Meal Plan")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(document.querySelector(".animate-pulse")).toBeFalsy();
    });

    const fillButton = screen.getByTitle("Fill week with random recipes");
    await user.click(fillButton);

    await waitFor(() => {
      expect(screen.getByText("Fill week with random recipes?")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    });
  });

  // M3: Empty day shows explicit state
  it("M3: displays explicit empty state for days with no meals", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<MealPlanPage />);

    await waitFor(() => {
      expect(screen.queryByText("Meal Plan")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(document.querySelector(".animate-pulse")).toBeFalsy();
    });

    // Should show "No meals planned" for each meal slot
    const emptyTexts = screen.getAllByText(/no meals planned/i);
    expect(emptyTexts.length).toBeGreaterThan(0);
  });

  // M4: Add recipe modal loading skeleton
  it("M4: shows loading skeleton in add recipe modal while recipes are fetching", async () => {
    let resolveRecipes: (value: unknown) => void;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/recipes")) {
        return new Promise((resolve) => {
          resolveRecipes = () =>
            resolve({ ok: true, json: () => Promise.resolve(mockRecipes) });
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockItems) });
    });

    const user = userEvent.setup();

    render(<MealPlanPage />);

    await waitFor(() => {
      expect(screen.getByText("Meal Plan")).toBeInTheDocument();
    });

    // Wait for meal plan to load, then click "Add dinner"
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const addButtons = screen.getAllByText(/add breakfast|add lunch|add dinner/i);
    if (addButtons.length > 0) await user.click(addButtons[0]);

    // Modal should show loading skeleton while recipes are fetching
    // Currently shows no loading indicator — should FAIL
    expect(document.querySelector(".animate-pulse")).toBeTruthy();

    // Resolve the recipes fetch
    resolveRecipes!(undefined);
  });

  // M5: Meal type indicators have accessible labels
  it("M5: meal type indicators have accessible labels, not just emoji", async () => {
    render(<MealPlanPage />);

    await waitFor(() => {
      expect(screen.getByText("Meal Plan")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(document.querySelector(".animate-pulse")).toBeFalsy();
    });

    // Check that meal type sections have accessible text labels and heading role
    expect(screen.getByText("Breakfast")).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
    expect(screen.getByText("Dinner")).toBeInTheDocument();

    const headings = screen.getAllByRole("heading");
    const mealHeadings = headings.filter((h) =>
      /breakfast|lunch|dinner/i.test(h.textContent || "")
    );
    expect(mealHeadings.length).toBe(3);
  });

  // M6: Week persisted in URL
  it("M6: selected week persists in the URL", async () => {
    const user = userEvent.setup();

    render(<MealPlanPage />);

    await waitFor(() => {
      expect(screen.getByText("Meal Plan")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(document.querySelector(".animate-pulse")).toBeFalsy();
    });

    // Navigate to next week — find all buttons, the week nav chevrons contain SVGs with ChevronRight/ChevronLeft
    // The buttons are siblings to the week display div
    const allBtns = screen.getAllByRole("button");
    // The next-week button contains a ChevronRight SVG — find it by checking the SVG class
    const nextButton = allBtns.find((b) => {
      const svg = b.querySelector("svg");
      const cls = svg?.getAttribute("class") || "";
      return cls.includes("h-5 w-5") && !cls.includes("h-4") && b.parentElement?.className.includes("justify-between") && b === b.parentElement?.lastElementChild;
    });
    if (nextButton) await user.click(nextButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("startDate")
      );
    });
  });

  // M7: Error state with retry
  it("M7: shows error state with retry when meal plan fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(<MealPlanPage />);

    // Currently shows toast but no inline error — should FAIL
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /retry/i })
      ).toBeInTheDocument();
    });
  });
});
