import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: "cook-recipe" }),
  useSearchParams: () => new URLSearchParams(),
}));

import CookingModePage from "@/app/(app)/recipes/[id]/cook/page";

const mockRecipe = {
  id: "cook-recipe",
  title: "Pasta Carbonara",
  servings: 4,
  ingredients: [
    { id: "i1", name: "Spaghetti", quantity: 0.5, unit: "kg", toTaste: false },
    { id: "i2", name: "Eggs", quantity: 4, unit: null, toTaste: false },
    { id: "i3", name: "Pecorino", quantity: 100, unit: "g", toTaste: false },
    { id: "i4", name: "Salt", quantity: null, unit: null, toTaste: true },
  ],
  steps: [
    { id: "s1", text: "Boil water and cook pasta", sortOrder: 0 },
    { id: "s2", text: "Mix eggs with cheese", sortOrder: 1 },
    { id: "s3", text: "Combine and serve", sortOrder: 2 },
  ],
};

describe("Cooking Mode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockClear();
    sessionStorage.clear();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRecipe),
    });

    // Reset wakeLock mock
    Object.defineProperty(navigator, "wakeLock", {
      value: {
        request: vi.fn().mockResolvedValue({ release: vi.fn() }),
      },
      writable: true,
    });
  });

  // C1: Checked ingredients persist between views
  it("C1: checked ingredients persist when navigating between ingredients and steps", async () => {
    const user = userEvent.setup();

    render(<CookingModePage />);

    await waitFor(() => {
      expect(screen.getByText("Gather your ingredients")).toBeInTheDocument();
    });

    // Check first ingredient
    await user.click(screen.getByText("Spaghetti"));

    // Navigate to step 1
    await user.click(screen.getByText("Start Cooking"));

    // Go back to ingredients
    await user.click(screen.getByText("Ingredients"));

    // Spaghetti should still be checked
    const spaghetti = screen.getByText("Spaghetti");
    expect(spaghetti.closest("li")).toHaveClass(/bg-accent/);
  });

  // C2: Current step preserved on return
  it("C2: preserves current step when navigating away and returning", async () => {
    const user = userEvent.setup();

    const { unmount } = render(<CookingModePage />);

    await waitFor(() => {
      expect(screen.getByText("Gather your ingredients")).toBeInTheDocument();
    });

    // Go to step 2
    await user.click(screen.getByText("Start Cooking"));
    await user.click(screen.getByText("Next"));

    // Should be on step 2
    expect(screen.getByText("Mix eggs with cheese")).toBeInTheDocument();

    // Verify sessionStorage was written
    expect(sessionStorage.getItem("cookbook-cook-step-cook-recipe")).toBe("1");

    unmount();

    // Remount — should resume at step 2
    render(<CookingModePage />);

    await waitFor(() => {
      expect(screen.getByText("Mix eggs with cheese")).toBeInTheDocument();
    });
  });

  // C3: Tap step indicator to jump
  it("C3: allows jumping to a specific step by tapping the progress indicator", async () => {
    const user = userEvent.setup();

    render(<CookingModePage />);

    await waitFor(() => {
      expect(screen.getByText("Gather your ingredients")).toBeInTheDocument();
    });

    // Navigate to step 1 first
    await user.click(screen.getByText("Start Cooking"));
    expect(screen.getByText("Boil water and cook pasta")).toBeInTheDocument();

    // Find the step indicator for step 3 (aria-label="Step 3")
    const step3Btn = screen.getByRole("button", { name: "Step 3" });
    await user.click(step3Btn);

    // Should jump to step 3
    expect(screen.getByText("Combine and serve")).toBeInTheDocument();
  });

  // C4: Arrow key navigation
  it("C4: supports arrow key navigation between steps", async () => {
    const user = userEvent.setup();

    render(<CookingModePage />);

    await waitFor(() => {
      expect(screen.getByText("Gather your ingredients")).toBeInTheDocument();
    });

    // Go to step 1
    await user.click(screen.getByText("Start Cooking"));
    expect(screen.getByText("Boil water and cook pasta")).toBeInTheDocument();

    // Press ArrowRight to go to next step
    await user.keyboard("{ArrowRight}");

    // Should advance to step 2 — currently no keyboard handler — should FAIL
    expect(screen.getByText("Mix eggs with cheese")).toBeInTheDocument();
  });

  // C5: Ingredient checked count
  it("C5: shows count of checked ingredients (e.g., '2 of 4 ingredients ready')", async () => {
    const user = userEvent.setup();

    render(<CookingModePage />);

    await waitFor(() => {
      expect(screen.getByText("Gather your ingredients")).toBeInTheDocument();
    });

    // Initially shows 0 of 4
    expect(screen.getByText(/0 of 4/i)).toBeInTheDocument();

    // Check two ingredients
    await user.click(screen.getByText("Spaghetti"));
    await user.click(screen.getByText("Eggs"));

    expect(screen.getByText(/2 of 4/i)).toBeInTheDocument();
  });

  // C6: "All done" marks recipe as cooked
  it("C6: marks recipe as 'cooked' when reaching the done screen", async () => {
    const user = userEvent.setup();

    render(<CookingModePage />);

    await waitFor(() => {
      expect(screen.getByText("Gather your ingredients")).toBeInTheDocument();
    });

    // Navigate through all steps
    await user.click(screen.getByText("Start Cooking"));
    await user.click(screen.getByText("Next"));
    await user.click(screen.getByText("Next"));
    await user.click(screen.getByText("Finish"));

    expect(screen.getByText("All done!")).toBeInTheDocument();

    // Should have made a call to mark recipe as cooked
    await waitFor(() => {
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const cookedCall = fetchCalls.find(
        ([url, opts]: [string, RequestInit?]) =>
          typeof url === "string" && url.includes("cook") && opts?.method === "POST"
      );
      expect(cookedCall).toBeTruthy();
    });
  });

  // C7: Wake lock failure notice
  it("C7: shows notice when screen wake lock fails to acquire", async () => {
    // Override the mock to make wakeLock fail
    Object.defineProperty(navigator, "wakeLock", {
      value: {
        request: vi.fn().mockRejectedValue(new Error("Not supported")),
      },
      writable: true,
    });

    render(<CookingModePage />);

    await waitFor(() => {
      expect(screen.getByText("Gather your ingredients")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.getByText(/keep your screen on|screen may turn off/i)
      ).toBeInTheDocument();
    });
  });
});
