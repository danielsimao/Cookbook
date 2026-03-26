import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: "test-recipe" }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/scrapbook/taped-photo", () => ({
  TapedPhoto: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} data-testid="taped-photo" />
  ),
}));
vi.mock("@/components/scrapbook/section-header", () => ({
  SectionHeader: ({ children, ...props }: { children: React.ReactNode }) => (
    <h2 {...props}>{children}</h2>
  ),
}));
vi.mock("@/components/scrapbook/stamp-badge", () => ({
  StampBadge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="stamp-badge">{children}</span>
  ),
}));

import RecipeDetailPage from "@/app/(app)/recipes/[id]/page";

const mockRecipe = {
  id: "test-recipe",
  title: "Pasta Carbonara",
  description: "Creamy Italian classic",
  sourceUrl: "https://example.com/carbonara",
  imageUrl: "https://img.example.com/pasta.jpg",
  servings: 4,
  prepTime: 10,
  cookTime: 20,
  cuisine: "Italian",
  mealType: "dinner",
  tags: ["quick", "comfort"],
  isFavorite: false,
  notes: "Use guanciale if possible",
  ingredients: [
    { id: "i1", name: "Spaghetti", quantity: 0.5, unit: "kg", group: null, toTaste: false, sortOrder: 0 },
    { id: "i2", name: "Eggs", quantity: 4, unit: null, group: null, toTaste: false, sortOrder: 1 },
    { id: "i3", name: "Salt", quantity: null, unit: null, group: null, toTaste: true, sortOrder: 2 },
  ],
  steps: [
    { id: "s1", text: "Boil water and cook pasta", sortOrder: 0 },
    { id: "s2", text: "Mix eggs with cheese", sortOrder: 1 },
    { id: "s3", text: "Combine and serve", sortOrder: 2 },
  ],
};

function setupFetch(recipe = mockRecipe) {
  global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (opts?.method === "PUT") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(recipe) });
    }
    if (opts?.method === "DELETE") {
      return Promise.resolve({ ok: true });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(recipe),
    });
  });
}

describe("Recipe Detail", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockClear();
    localStorage.clear();
    setupFetch();
  });

  // D1: Scaled servings persist across reloads
  it("D1: persists scaled servings across page reloads", async () => {
    const user = userEvent.setup();

    const { unmount } = render(<RecipeDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument();
    });

    // Find the + button in the scaling section (paper-card)
    const paperCard = document.querySelector('[class*="paper-card"]');
    const incrementBtn = paperCard?.querySelectorAll("button")[1]; // second button is +

    if (incrementBtn) {
      await user.click(incrementBtn);
    }

    // Verify localStorage was written
    expect(localStorage.getItem("cookbook-scale-test-recipe")).toBe("1.25");

    unmount();

    // Remount — servings should still be scaled
    render(<RecipeDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument();
    });

    expect(screen.getByText("1.25x")).toBeInTheDocument();
  });

  // D2: Base serving size displayed when scaled
  it("D2: displays the base serving size alongside scaling controls when scaled", async () => {
    // Set scale to 1.5 via localStorage to see the "original" label
    localStorage.setItem("cookbook-scale-test-recipe", "1.5");

    render(<RecipeDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument();
    });

    expect(screen.getByText(/original: 4/i)).toBeInTheDocument();

    localStorage.removeItem("cookbook-scale-test-recipe");
  });

  // D3: Error state with retry
  it("D3: shows error state with retry action when fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });

    render(<RecipeDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
      expect(screen.getByText(/recipe not found/i)).toBeInTheDocument();
    });
  });

  // D4: Favorite button has accessible label
  it("D4: favorite toggle button has accessible aria-label", async () => {
    render(<RecipeDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument();
    });

    // Find the heart button
    const buttons = screen.getAllByRole("button");
    const heartButton = buttons.find(
      (b) => b.querySelector('[class*="Heart"], [class*="heart"]')
    );

    // Should have aria-label — currently has none — should FAIL
    expect(heartButton).toHaveAttribute("aria-label");
    expect(heartButton?.getAttribute("aria-label")).toMatch(
      /add to favorites|remove from favorites/i
    );
  });

  // D5: Delete confirmation states permanence
  it("D5: delete confirmation dialog clearly states the action is permanent", async () => {
    const user = userEvent.setup();

    render(<RecipeDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument();
    });

    // Click delete button (Trash2 icon)
    const buttons = screen.getAllByRole("button");
    const deleteBtn = buttons.find((b) =>
      b.querySelector('[class*="Trash"]')
    );
    if (deleteBtn) await user.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();
    });
  });

  // D6: Optimistic favorite toggle with rollback
  it("D6: updates heart icon immediately on favorite toggle (optimistic UI)", async () => {
    const user = userEvent.setup();

    render(<RecipeDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument();
    });

    // Find the heart button and click it
    const buttons = screen.getAllByRole("button");
    const heartButton = buttons.find(
      (b) => b.querySelector("svg")?.classList.toString().includes("text-muted")
    );
    if (heartButton) await user.click(heartButton);

    // Heart should immediately change to filled (optimistic)
    await waitFor(() => {
      const svgs = document.querySelectorAll("svg");
      const filledHeart = Array.from(svgs).find(
        (svg) => svg.classList.toString().includes("fill-red")
      );
      expect(filledHeart).toBeTruthy();
    });
  });
});
