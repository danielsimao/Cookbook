import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPush = vi.fn();
let searchParamsStore = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({}),
  useSearchParams: () => searchParamsStore,
}));

import RecipesPageWrapper from "@/app/(app)/recipes/page";

const mockRecipes = [
  {
    id: "r1",
    title: "Pasta Carbonara",
    description: null,
    imageUrl: null,
    cuisine: "Italian",
    mealType: "dinner",
    tags: ["quick"],
    prepTime: 10,
    cookTime: 20,
    isFavorite: true,
    servings: 4,
  },
  {
    id: "r2",
    title: "Greek Salad",
    description: null,
    imageUrl: null,
    cuisine: "Greek",
    mealType: "lunch",
    tags: ["healthy"],
    prepTime: 5,
    cookTime: 0,
    isFavorite: false,
    servings: 2,
  },
];

describe("Recipes List", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockClear();
    localStorage.clear();
    searchParamsStore = new URLSearchParams();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRecipes),
    });
  });

  // R1: View preference persists
  it("R1: persists view preference (grid/list) across page reloads", async () => {
    // Set list mode in localStorage before rendering
    localStorage.setItem("cookbook-view-mode", "list");

    render(<RecipesPageWrapper />);

    await waitFor(() => {
      expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument();
    });

    // Should be in list view (single column layout)
    const listItems = document.querySelectorAll('[class*="space-y-2"] a');
    expect(listItems.length).toBeGreaterThan(0);
  });

  // R2: Filters reflected in URL
  it("R2: reflects active filters in the URL", async () => {
    const user = userEvent.setup();

    render(<RecipesPageWrapper />);

    await waitFor(() => {
      expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument();
    });

    // Click favorites filter
    await user.click(screen.getByText("Favorites"));

    // URL should be updated with favorite=true
    // Currently filters are local state only — this should FAIL
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("favorite=true")
      );
    });
  });

  // R3: Distinct AI search loading indicator
  it("R3: shows a distinct loading indicator during AI search", async () => {
    const user = userEvent.setup();
    // AI search returns a never-resolving promise
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      callCount++;
      if (callCount === 1) {
        // Initial recipe fetch
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRecipes),
        });
      }
      // AI search — never resolves
      return new Promise(() => {});
    });

    render(<RecipesPageWrapper />);

    await waitFor(() => {
      expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search recipes/i);
    await user.type(searchInput, "something quick");

    // Click AI search button
    const aiButton = screen.getByTitle("AI Smart Search");
    await user.click(aiButton);

    // Should show a distinct loading indicator (not just a spinning icon on the button)
    // Current implementation only adds animate-spin to the button icon — should FAIL
    await waitFor(() => {
      expect(
        screen.getByText(/searching|loading|finding/i)
      ).toBeInTheDocument();
    });
  });

  // R4: No results message with reset action
  it("R4: shows 'No recipes found' with reset action when filters return nothing", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    searchParamsStore = new URLSearchParams("mealType=breakfast");

    render(<RecipesPageWrapper />);

    await waitFor(() => {
      expect(
        screen.getByText(/no recipes match/i)
      ).toBeInTheDocument();
    });

    // Should have a clear/reset filters button
    expect(screen.getByText(/clear/i)).toBeInTheDocument();
  });

  // R5: Error state on fetch failure
  it("R5: shows an error state when recipe fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(<RecipesPageWrapper />);

    await waitFor(() => {
      expect(
        screen.getByText(/failed to load/i)
      ).toBeInTheDocument();
    });
  });

  // R6: Search query persists via URL
  it("R6: persists search query in the input across page reloads (via URL state)", async () => {
    searchParamsStore = new URLSearchParams("search=pasta");

    render(<RecipesPageWrapper />);

    await waitFor(() => {
      const input = screen.getByPlaceholderText(/search recipes/i);
      // Input should be pre-filled with "pasta" from URL — currently not read from URL
      expect(input).toHaveValue("pasta");
    });
  });
});
