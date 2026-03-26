import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

import DashboardPage from "@/app/(app)/page";

const mockRecipes = Array.from({ length: 8 }, (_, i) => ({
  id: `r${i + 1}`,
  title: `Recipe ${i + 1}`,
  imageUrl: null,
  cuisine: "Italian",
  mealType: "dinner",
  prepTime: 10,
  cookTime: 20,
  isFavorite: i < 5, // 5 favorites
  createdAt: new Date(2025, 0, i + 1).toISOString(),
}));

function mockFetch(data: unknown, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(data),
  });
}

describe("Home Page (Dashboard)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // H1: Error state shown on fetch failure
  it("H1: displays an error message when recipe fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(<DashboardPage />);

    // Currently the page silently catches the error and just hides loading.
    // It should show an error message to the user.
    await waitFor(() => {
      expect(
        screen.getByText(/failed|error|couldn't load/i)
      ).toBeInTheDocument();
    });
  });

  // H2: Empty state with CTA
  it("H2: shows empty state with CTA when no recipes exist", async () => {
    mockFetch([]);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/your cookbook is empty/i)).toBeInTheDocument();
      // Multiple "Add Recipe" links exist (quick actions + empty state) — just verify the empty state one exists
      const addLinks = screen.getAllByRole("link", { name: /add recipe/i });
      expect(addLinks.some((l) => l.getAttribute("href") === "/recipes/new")).toBe(true);
    });
  });

  // H3: Favorites section visibility
  it("H3: shows Favorites section when favorites exist, hides when none", async () => {
    mockFetch(mockRecipes);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Favorites")).toBeInTheDocument();
    });
  });

  it("H3: hides Favorites section when no favorites exist", async () => {
    const noFavs = mockRecipes.map((r) => ({ ...r, isFavorite: false }));
    mockFetch(noFavs);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/recent recipes/i)).toBeInTheDocument();
    });
    expect(screen.queryByText("Favorites")).not.toBeInTheDocument();
  });

  // H4: "View all" for recent recipes when >6 exist
  it("H4: shows 'View all' link for recent recipes that navigates to /recipes", async () => {
    mockFetch(mockRecipes);

    render(<DashboardPage />);

    await waitFor(() => {
      const viewAllLinks = screen.getAllByText("View all");
      // At least one "View all" should link to /recipes
      const recipesLink = viewAllLinks.find(
        (el) => el.closest("a")?.getAttribute("href") === "/recipes"
      );
      expect(recipesLink).toBeInTheDocument();
    });
  });

  // H5: "View all" for favorites when >4 exist
  it("H5: shows 'View all' link for favorites that navigates to /recipes?favorite=true", async () => {
    mockFetch(mockRecipes);

    render(<DashboardPage />);

    await waitFor(() => {
      const viewAllLinks = screen.getAllByText("View all");
      const favLink = viewAllLinks.find(
        (el) =>
          el.closest("a")?.getAttribute("href") === "/recipes?favorite=true"
      );
      expect(favLink).toBeInTheDocument();
    });
  });

  // H6: Skeleton loaders match layout
  it("H6: shows skeleton loaders while loading that match content layout", () => {
    // Never-resolving fetch to keep loading state
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    render(<DashboardPage />);

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
