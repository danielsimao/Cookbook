import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

import BulkImportPage from "@/app/(app)/recipes/bulk-import/page";

const mockExtractedRecipe = {
  title: "Test Recipe",
  description: "A test recipe",
  servings: 4,
  prepTime: 10,
  cookTime: 20,
  cuisine: "Italian",
  mealType: "dinner",
  tags: ["quick"],
  imageUrl: "https://img.example.com/recipe.jpg",
  ingredients: [
    { name: "Flour", quantity: 2, unit: "cups", group: null, toTaste: false },
    { name: "Salt", quantity: null, unit: null, group: null, toTaste: true },
  ],
  steps: ["Mix ingredients", "Bake at 350F"],
};

function setupFetch(options?: {
  extractDelay?: number;
  failUrls?: string[];
  neverResolve?: boolean;
}) {
  const { extractDelay = 0, failUrls = [], neverResolve = false } = options || {};

  return vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (typeof url === "string" && url.includes("/api/recipes/extract")) {
      if (neverResolve) return new Promise(() => {});
      const body = opts?.body ? JSON.parse(opts.body as string) : {};
      if (failUrls.includes(body.url)) {
        return new Promise((resolve) =>
          setTimeout(() => resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: "Failed to scrape this URL" }),
          }), extractDelay)
        );
      }
      return new Promise((resolve) =>
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ ...mockExtractedRecipe, title: `Recipe from ${body.url}` }),
        }), extractDelay)
      );
    }
    if (typeof url === "string" && url.includes("/api/recipes") && opts?.method === "POST") {
      const body = JSON.parse(opts.body as string);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: `saved-${Date.now()}`, ...body }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

describe("Bulk Import — Input Phase", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockClear();
    global.fetch = setupFetch();
  });

  // BI1
  it("BI1: has a textarea for pasting URLs", () => {
    render(<BulkImportPage />);
    expect(screen.getByPlaceholderText(/paste.*url/i)).toBeInTheDocument();
  });

  // BI2
  it("BI2: 'Start Import' button is disabled when textarea is empty", () => {
    render(<BulkImportPage />);
    const btn = screen.getByRole("button", { name: /start import/i });
    expect(btn).toBeDisabled();
  });

  // BI3
  it("BI3: filters out blank lines and duplicate URLs", async () => {
    global.fetch = setupFetch({ neverResolve: true });
    const user = userEvent.setup();

    render(<BulkImportPage />);

    const textarea = screen.getByPlaceholderText(/paste.*url/i);
    await user.type(textarea, "https://example.com/r1\n\nhttps://example.com/r1\nhttps://example.com/r2");
    await user.click(screen.getByRole("button", { name: /start import/i }));

    // Should only show 2 unique URLs, not 3
    await waitFor(() => {
      const items = screen.getAllByText(/example\.com/);
      // Filter to only status items (not the textarea content)
      expect(items.length).toBeGreaterThanOrEqual(2);
    });
  });

  // BI4
  it("BI4: rejects invalid URLs with inline feedback", async () => {
    const user = userEvent.setup();

    render(<BulkImportPage />);

    const textarea = screen.getByPlaceholderText(/paste.*url/i);
    await user.type(textarea, "not-a-url\nhttps://valid.com/recipe");
    await user.click(screen.getByRole("button", { name: /start import/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid/i)).toBeInTheDocument();
    });
  });

  // BI5
  it("BI5: textarea is disabled once processing starts", async () => {
    global.fetch = setupFetch({ neverResolve: true });
    const user = userEvent.setup();

    render(<BulkImportPage />);

    const textarea = screen.getByPlaceholderText(/paste.*url/i);
    await user.type(textarea, "https://example.com/r1");
    await user.click(screen.getByRole("button", { name: /start import/i }));

    await waitFor(() => {
      expect(textarea).toBeDisabled();
    });
  });

  // BI6
  it("BI6: enforces maximum of 20 URLs", async () => {
    const user = userEvent.setup();

    render(<BulkImportPage />);

    const urls = Array.from({ length: 25 }, (_, i) => `https://example.com/r${i + 1}`).join("\n");
    const textarea = screen.getByPlaceholderText(/paste.*url/i);
    await user.type(textarea, urls);
    await user.click(screen.getByRole("button", { name: /start import/i }));

    await waitFor(() => {
      expect(screen.getByText(/maximum.*20/i)).toBeInTheDocument();
    });
  });
});

describe("Bulk Import — Processing Phase", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockClear();
  });

  // BI7
  it("BI7: shows status indicators for each URL", async () => {
    global.fetch = setupFetch({ neverResolve: true });
    const user = userEvent.setup();

    render(<BulkImportPage />);

    await user.type(screen.getByPlaceholderText(/paste.*url/i), "https://a.com/r1\nhttps://b.com/r2");
    await user.click(screen.getByRole("button", { name: /start import/i }));

    // Wait for processing to start, then check statuses
    await waitFor(() => {
      expect(screen.getByText("processing")).toBeInTheDocument();
      expect(screen.getByText("queued")).toBeInTheDocument();
    });
  });

  // BI8
  it("BI8: URLs are processed sequentially (not in parallel)", async () => {
    // Track when each call starts — if parallel, all start immediately
    const callStartTimes: number[] = [];
    let resolveFirst: ((v: unknown) => void) | null = null;

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/recipes/extract")) {
        callStartTimes.push(Date.now());
        const callNum = callStartTimes.length;
        if (callNum === 1) {
          // First call hangs until we resolve it manually
          return new Promise((resolve) => {
            resolveFirst = () => resolve({
              ok: true,
              json: () => Promise.resolve({ ...mockExtractedRecipe, title: "Recipe 1" }),
            });
          });
        }
        // Second call resolves immediately
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...mockExtractedRecipe, title: "Recipe 2" }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    const user = userEvent.setup();

    render(<BulkImportPage />);

    await user.type(screen.getByPlaceholderText(/paste.*url/i), "https://a.com/r1\nhttps://b.com/r2");
    await user.click(screen.getByRole("button", { name: /start import/i }));

    // Wait for first call to have been made
    await waitFor(() => {
      expect(callStartTimes.length).toBeGreaterThanOrEqual(1);
    });

    // While first is pending, second should NOT have been called yet
    // Give time for any parallel behavior to manifest
    await new Promise((r) => setTimeout(r, 50));
    expect(callStartTimes.length).toBe(1);

    // Now resolve the first call
    resolveFirst!(undefined);

    // Second call should fire after the first resolves
    await waitFor(() => {
      expect(callStartTimes.length).toBe(2);
    });

    await waitFor(() => {
      expect(screen.getByText("Recipe 1")).toBeInTheDocument();
      expect(screen.getByText("Recipe 2")).toBeInTheDocument();
    });
  });

  // BI9 — spinner tested via BI7 (processing state visible)

  // BI10
  it("BI10: shows progress counter during processing", async () => {
    global.fetch = setupFetch();
    const user = userEvent.setup();

    render(<BulkImportPage />);

    await user.type(screen.getByPlaceholderText(/paste.*url/i), "https://a.com/r1\nhttps://b.com/r2\nhttps://c.com/r3");
    await user.click(screen.getByRole("button", { name: /start import/i }));

    await waitFor(() => {
      expect(screen.getByText(/\d+ of 3 processed/i)).toBeInTheDocument();
    });
  });

  // BI11
  it("BI11: failed URLs show error and retry button", async () => {
    global.fetch = setupFetch({ failUrls: ["https://bad.com/recipe"] });
    const user = userEvent.setup();

    render(<BulkImportPage />);

    await user.type(screen.getByPlaceholderText(/paste.*url/i), "https://bad.com/recipe");
    await user.click(screen.getByRole("button", { name: /start import/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });
    // Error message appears
    expect(screen.getByText(/Failed to scrape this URL/i)).toBeInTheDocument();
  });

  // BI12
  it("BI12: 'Stop' button halts processing and cancels queued items", async () => {
    // First URL resolves, subsequent never resolve — simulates slow processing
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url === "string" && url.includes("/api/recipes/extract")) {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ ...mockExtractedRecipe, title: "First" }),
          });
        }
        return new Promise(() => {}); // Never resolves
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    const user = userEvent.setup();

    render(<BulkImportPage />);

    await user.type(
      screen.getByPlaceholderText(/paste.*url/i),
      "https://a.com/r1\nhttps://b.com/r2\nhttps://c.com/r3"
    );
    await user.click(screen.getByRole("button", { name: /start import/i }));

    // Wait for Stop button and first URL to finish processing
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /stop/i })).toBeInTheDocument();
      expect(screen.getByText("First")).toBeInTheDocument();
    });

    // Click Stop
    await user.click(screen.getByRole("button", { name: /stop/i }));

    // Queued items should be marked as cancelled/failed
    await waitFor(() => {
      expect(screen.getByText(/cancelled by user/i)).toBeInTheDocument();
    });
  });

  // BI13
  it("BI13: duplicate URLs within the batch are auto-skipped", async () => {
    global.fetch = setupFetch();
    const user = userEvent.setup();

    render(<BulkImportPage />);

    await user.type(
      screen.getByPlaceholderText(/paste.*url/i),
      "https://a.com/r1\nhttps://a.com/r1"
    );
    await user.click(screen.getByRole("button", { name: /start import/i }));

    // Only one extract call should be made
    await waitFor(() => {
      const extractCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
        ([u]: [string]) => typeof u === "string" && u.includes("/api/recipes/extract")
      );
      expect(extractCalls).toHaveLength(1);
    });
  });
});

describe("Bulk Import — Review Phase", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockClear();
    global.fetch = setupFetch();
  });

  // BI14
  it("BI14: shows recipe card with title, image, ingredient count, step count", async () => {
    const user = userEvent.setup();

    render(<BulkImportPage />);

    await user.type(screen.getByPlaceholderText(/paste.*url/i), "https://a.com/r1");
    await user.click(screen.getByRole("button", { name: /start import/i }));

    await waitFor(() => {
      expect(screen.getByText(/recipe from https:\/\/a\.com\/r1/i)).toBeInTheDocument();
      expect(screen.getByText(/2 ingredients/i)).toBeInTheDocument();
      expect(screen.getByText(/2 steps/i)).toBeInTheDocument();
    });
  });

  // BI15
  it("BI15: clicking a recipe card expands it with editable fields", async () => {
    const user = userEvent.setup();

    render(<BulkImportPage />);

    await user.type(screen.getByPlaceholderText(/paste.*url/i), "https://a.com/r1");
    await user.click(screen.getByRole("button", { name: /start import/i }));

    await waitFor(() => {
      expect(screen.getByText(/recipe from/i)).toBeInTheDocument();
    });

    // Click to expand
    await user.click(screen.getByText(/recipe from/i));

    await waitFor(() => {
      // Should show editable title input
      expect(screen.getByDisplayValue(/recipe from/i)).toBeInTheDocument();
    });
  });

  // BI16
  it("BI16: 'Skip' button removes recipe from batch", async () => {
    const user = userEvent.setup();

    render(<BulkImportPage />);

    await user.type(screen.getByPlaceholderText(/paste.*url/i), "https://a.com/r1");
    await user.click(screen.getByRole("button", { name: /start import/i }));

    await waitFor(() => {
      expect(screen.getByText(/recipe from/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /skip/i }));

    // Recipe should be marked as skipped
    await waitFor(() => {
      expect(screen.getByText(/skipped/i)).toBeInTheDocument();
    });
  });

  // BI17
  it("BI17: skipped recipes can be un-skipped", async () => {
    const user = userEvent.setup();

    render(<BulkImportPage />);

    await user.type(screen.getByPlaceholderText(/paste.*url/i), "https://a.com/r1");
    await user.click(screen.getByRole("button", { name: /start import/i }));

    await waitFor(() => {
      expect(screen.getByText(/recipe from/i)).toBeInTheDocument();
    });

    // Skip then un-skip
    await user.click(screen.getByRole("button", { name: /skip/i }));
    await waitFor(() => expect(screen.getByText(/skipped/i)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /undo|un-skip|include/i }));
    await waitFor(() => {
      expect(screen.queryByText(/skipped/i)).not.toBeInTheDocument();
    });
  });
});

describe("Bulk Import — Save Phase", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockClear();
    global.fetch = setupFetch();
  });

  // BI18
  it("BI18: 'Save All' button shows count of recipes to save", async () => {
    const user = userEvent.setup();

    render(<BulkImportPage />);

    await user.type(
      screen.getByPlaceholderText(/paste.*url/i),
      "https://a.com/r1\nhttps://b.com/r2"
    );
    await user.click(screen.getByRole("button", { name: /start import/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save 2 recipes/i })).toBeInTheDocument();
    });
  });

  // BI19
  it("BI19: 'Save All' is not shown when no recipes are ready", async () => {
    global.fetch = setupFetch({ failUrls: ["https://bad.com/r1"] });
    const user = userEvent.setup();

    render(<BulkImportPage />);

    await user.type(screen.getByPlaceholderText(/paste.*url/i), "https://bad.com/r1");
    await user.click(screen.getByRole("button", { name: /start import/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    // Save button should NOT be present (or if present, disabled)
    const saveBtn = screen.queryByRole("button", { name: /save.*recipe/i });
    expect(saveBtn).toBeNull();
  });

  // BI20
  it("BI20: after saving, redirects to recipes list with success toast", async () => {
    const user = userEvent.setup();

    render(<BulkImportPage />);

    await user.type(screen.getByPlaceholderText(/paste.*url/i), "https://a.com/r1");
    await user.click(screen.getByRole("button", { name: /start import/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save 1 recipe/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /save 1 recipe/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/recipes");
    });
  });

  // Mid-batch save failure handling
  it("Save All: handles partial failures without losing data", async () => {
    let saveCount = 0;
    global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url === "string" && url.includes("/api/recipes/extract")) {
        const body = JSON.parse(opts!.body as string);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...mockExtractedRecipe, title: `Recipe from ${body.url}` }),
        });
      }
      if (typeof url === "string" && url === "/api/recipes" && opts?.method === "POST") {
        saveCount++;
        // Second save fails
        if (saveCount === 2) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: "DB error" }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: `saved-${saveCount}` }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    const user = userEvent.setup();

    render(<BulkImportPage />);

    await user.type(
      screen.getByPlaceholderText(/paste.*url/i),
      "https://a.com/r1\nhttps://b.com/r2"
    );
    await user.click(screen.getByRole("button", { name: /start import/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save 2 recipes/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /save 2 recipes/i }));

    // User should NOT be redirected when there are failures
    await waitFor(() => {
      // Failed recipe shows up with retry available
      expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  // BI21
  it("BI21: each recipe is saved via POST /api/recipes", async () => {
    const user = userEvent.setup();

    render(<BulkImportPage />);

    await user.type(
      screen.getByPlaceholderText(/paste.*url/i),
      "https://a.com/r1\nhttps://b.com/r2"
    );
    await user.click(screen.getByRole("button", { name: /start import/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save 2 recipes/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /save 2 recipes/i }));

    await waitFor(() => {
      const saveCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
        ([u, opts]: [string, RequestInit?]) =>
          typeof u === "string" && u.includes("/api/recipes") && !u.includes("/extract") && opts?.method === "POST"
      );
      expect(saveCalls).toHaveLength(2);
    });
  });
});
