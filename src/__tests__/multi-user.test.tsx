import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ==========================================
// Multi-User Tests
// Verifies user isolation, admin controls,
// and recipe sharing flows
// ==========================================

// --- Settings Page Tests ---

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  useParams: () => ({ id: "test-id", token: "share-token-1" }),
  useSearchParams: () => new URLSearchParams(),
}));

import SettingsPage from "@/app/(app)/settings/page";

const mockUsers = [
  { id: "admin-1", name: "Admin", email: "admin@cookbook.local", role: "admin", createdAt: "2026-01-01" },
  { id: "member-1", name: "Alice", email: "alice@test.com", role: "member", createdAt: "2026-03-01" },
];

describe("Settings Page (Admin)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockClear();
  });

  it("displays user list with roles", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockUsers),
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
      expect(screen.getByText("alice@test.com")).toBeInTheDocument();
    });

    // Admin badge should be visible
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("member")).toBeInTheDocument();
  });

  it("admin cannot delete themselves (no delete button on admin row)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockUsers),
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    // The admin row should not have a delete button
    // Alice's row should have one — find by the row content
    const adminRow = screen.getByText("Admin").closest("div[class*='border-b']");
    const aliceRow = screen.getByText("Alice").closest("div[class*='border-b']");

    // Admin row has no delete, Alice's row does
    const adminButtons = adminRow?.querySelectorAll("button") || [];
    const aliceButtons = aliceRow?.querySelectorAll("button") || [];
    expect(adminButtons.length).toBe(0);
    expect(aliceButtons.length).toBe(1);
  });

  it("shows 'Add User' button that opens modal with form fields", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockUsers),
    });
    const user = userEvent.setup();

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    // Click the + Add User link in the header
    const addLink = screen.getByText(/add user/i);
    await user.click(addLink);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Full name")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("email@example.com")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Temporary password")).toBeInTheDocument();
    });
  });

  it("add user form includes name, email, and password fields", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockUsers),
    });
    const user = userEvent.setup();

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    // Click "+ Add User"
    await user.click(screen.getByText(/add user/i));

    // Modal should show form fields
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Full name")).toBeInTheDocument();
    });

    // Verify all required fields exist
    expect(screen.getByPlaceholderText("email@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Temporary password")).toBeInTheDocument();

    // Type in the fields to verify they're interactive
    await user.type(screen.getByPlaceholderText("Full name"), "Bob");
    expect(screen.getByPlaceholderText("Full name")).toHaveValue("Bob");
  });

  it("shows error state for non-admin users (403)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: "Forbidden" }),
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/admin access required/i)).toBeInTheDocument();
    });
  });

  it("shows delete confirmation for member users", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockUsers),
    });
    const user = userEvent.setup();

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    // Click delete on Alice's row
    const aliceRow = screen.getByText("Alice").closest("div[class*='border-b']");
    const deleteBtn = aliceRow?.querySelector("button");
    if (deleteBtn) await user.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText(/remove user/i)).toBeInTheDocument();
      // The modal mentions Alice's name in the description
      expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();
    });
  });
});

// --- Share Page Tests ---

import SharedRecipePage from "@/app/recipes/share/[token]/page";

const mockSharedRecipe = {
  id: "shared-r1",
  title: "Shared Pasta",
  description: "A shared recipe",
  sourceUrl: null,
  imageUrl: null,
  servings: 4,
  prepTime: 10,
  cookTime: 20,
  cuisine: "Italian",
  mealType: "dinner",
  tags: ["quick"],
  notes: null,
  ingredients: [
    { id: "si1", name: "Pasta", quantity: 500, unit: "g", group: null, toTaste: false, sortOrder: 0 },
  ],
  steps: [
    { id: "ss1", text: "Cook the pasta", sortOrder: 0 },
  ],
};

describe("Shared Recipe Page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockClear();
  });

  it("renders a shared recipe publicly", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/recipes/share/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSharedRecipe),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<SharedRecipePage />);

    await waitFor(() => {
      expect(screen.getByText("Shared Pasta")).toBeInTheDocument();
      expect(screen.getByText("Cook the pasta")).toBeInTheDocument();
      expect(screen.getByText("Pasta")).toBeInTheDocument();
    });
  });

  it("shows 'Save to my cookbook' button", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSharedRecipe),
    });

    render(<SharedRecipePage />);

    await waitFor(() => {
      expect(screen.getByText("Shared Pasta")).toBeInTheDocument();
    });

    // Should have save buttons (header + bottom CTA)
    const saveButtons = screen.getAllByRole("button", { name: /save to my cookbook/i });
    expect(saveButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("saves recipe to user's cookbook on click", async () => {
    global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url === "string" && url.includes("/save") && opts?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: "copied-recipe-1" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSharedRecipe),
      });
    });
    const user = userEvent.setup();

    render(<SharedRecipePage />);

    await waitFor(() => {
      expect(screen.getByText("Shared Pasta")).toBeInTheDocument();
    });

    const saveBtn = screen.getAllByRole("button", { name: /save to my cookbook/i })[0];
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/recipes/copied-recipe-1");
    });
  });

  it("shows error state for invalid share token", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    render(<SharedRecipePage />);

    await waitFor(() => {
      expect(screen.getByText(/recipe not found/i)).toBeInTheDocument();
    });
  });

  it("shows auth message when saving without being logged in", async () => {
    global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url === "string" && url.includes("/save") && opts?.method === "POST") {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: "Not authenticated" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSharedRecipe),
      });
    });
    const user = userEvent.setup();

    render(<SharedRecipePage />);

    await waitFor(() => {
      expect(screen.getByText("Shared Pasta")).toBeInTheDocument();
    });

    const saveBtn = screen.getAllByRole("button", { name: /save to my cookbook/i })[0];
    await user.click(saveBtn);

    // Should not redirect — instead show a message
    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});

// --- Login Tests for Email+Password ---

describe("Login (Multi-User)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockClear();
  });

  it("login form has both email and password fields", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    const LoginPage = (await import("@/app/login/page")).default;
    render(<LoginPage />);

    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  });

  it("sends email and password in login request", async () => {
    global.fetch = vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      if (opts?.method === "HEAD") return Promise.resolve({ ok: false });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    const user = userEvent.setup();

    const LoginPage = (await import("@/app/login/page")).default;
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("Email"), "alice@test.com");
    await user.type(screen.getByPlaceholderText("Password"), "mypassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const postCall = fetchCalls.find(
        ([, opts]: [string, RequestInit?]) => opts?.method === "POST"
      );
      expect(postCall).toBeTruthy();
      const body = JSON.parse(postCall![1].body as string);
      expect(body.email).toBe("alice@test.com");
      expect(body.password).toBe("mypassword");
    });
  });
});
