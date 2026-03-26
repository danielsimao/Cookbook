import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

import PantryPage from "@/app/(app)/pantry/page";

const mockPantryItems = [
  { id: "p1", name: "Salt" },
  { id: "p2", name: "Olive Oil" },
  { id: "p3", name: "Garlic" },
  { id: "p4", name: "Onion" },
  { id: "p5", name: "Pepper" },
];

const mockSuggestions = {
  ingredients: ["Salt", "Sugar", "Flour", "Butter", "Milk", "Eggs"],
  cuisines: [],
  tags: [],
};

describe("Pantry", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url === "string" && url.includes("/api/pantry") && opts?.method === "POST") {
        const body = JSON.parse(opts.body as string);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: `p-new-${Date.now()}`, name: body.name }),
        });
      }
      if (typeof url === "string" && url.includes("/api/pantry") && opts?.method === "DELETE") {
        return Promise.resolve({ ok: true });
      }
      if (typeof url === "string" && url.includes("/api/pantry")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPantryItems),
        });
      }
      if (typeof url === "string" && url.includes("/api/suggestions")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSuggestions),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  // P1: Remove button accessible on mobile (no hover required)
  it("P1: remove button is visible without hover (accessible on mobile)", async () => {
    render(<PantryPage />);

    await waitFor(() => {
      expect(screen.getByText("Salt")).toBeInTheDocument();
    });

    // Find the remove button for an item
    const itemRow = screen.getByText("Salt").closest("div");
    const removeBtn = itemRow?.querySelector("button");

    // Currently opacity-0 until group-hover — should FAIL on mobile
    expect(removeBtn).toBeTruthy();
    expect(removeBtn?.className).not.toContain("opacity-0");
  });

  // P2: Total item count prominently displayed
  it("P2: displays total pantry item count prominently", async () => {
    render(<PantryPage />);

    await waitFor(() => {
      expect(screen.getByText("Salt")).toBeInTheDocument();
    });

    // Count should be prominently displayed (in header area, not just small text at bottom)
    const header = document.querySelector("h1");
    expect(header?.textContent).toContain("5");
  });

  // P3: Search always visible
  it("P3: search is always visible regardless of item count", async () => {
    // Only 3 items (below the >10 threshold)
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/pantry")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: "p1", name: "Salt" }, { id: "p2", name: "Pepper" }]),
        });
      }
      if (typeof url === "string" && url.includes("/api/suggestions")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSuggestions),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<PantryPage />);

    await waitFor(() => {
      expect(screen.getByText("Salt")).toBeInTheDocument();
    });

    // Search should be visible even with only 2 items
    // Currently hidden when items.length <= 10 — should FAIL
    expect(screen.getByPlaceholderText(/filter pantry/i)).toBeInTheDocument();
  });

  // P4: Duplicate item highlights existing
  it("P4: highlights existing item when adding a duplicate (case-insensitive)", async () => {
    const user = userEvent.setup();

    render(<PantryPage />);

    await waitFor(() => {
      expect(screen.getByText("Salt")).toBeInTheDocument();
    });

    // Try to add "salt" (lowercase duplicate)
    const input = screen.getByPlaceholderText(/add ingredient/i);
    await user.type(input, "salt");
    await user.keyboard("{Enter}");

    // Should highlight the existing "Salt" item — currently just rejects silently — should FAIL
    await waitFor(() => {
      const saltItem = screen.getByText("Salt").closest("div");
      expect(saltItem?.className).toMatch(/highlight|flash|ring|animate/);
    });
  });

  // P5: Error state with retry
  it("P5: shows error state with retry when pantry fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(<PantryPage />);

    // Currently shows toast but no inline error — should FAIL
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /retry/i })
      ).toBeInTheDocument();
    });
  });

  // P6: Input cleared and refocused after adding
  it("P6: clears input and returns focus to it after adding an item", async () => {
    const user = userEvent.setup();

    render(<PantryPage />);

    await waitFor(() => {
      expect(screen.getByText("Salt")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/add ingredient/i);
    await user.type(input, "Butter");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(input).toHaveValue("");
      // Focus should return to the input for rapid entry
      expect(input).toHaveFocus();
    });
  });

  // P7: Undo on remove
  it("P7: shows undo option after removing an item", async () => {
    const user = userEvent.setup();

    render(<PantryPage />);

    await waitFor(() => {
      expect(screen.getByText("Salt")).toBeInTheDocument();
    });

    // Find and click remove button for Salt
    const saltRow = screen.getByText("Salt").closest("div");
    const removeBtn = saltRow?.querySelector("button");
    if (removeBtn) await user.click(removeBtn);

    // Should show an undo option (e.g., toast with "Undo" button)
    // Currently deletes permanently with no undo — should FAIL
    await waitFor(() => {
      expect(screen.getByText(/undo/i)).toBeInTheDocument();
    });
  });
});
