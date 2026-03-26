import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Must mock before importing the component
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

import LoginPage from "@/app/login/page";

function mockFetch(status: number, body?: object) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body ?? {}),
  });
}

describe("Login Page", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
  });

  // L1: Already authenticated → redirect
  it("L1: redirects to / when user is already authenticated", async () => {
    // Auth check on mount returns ok → user is already logged in
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    render(<LoginPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  // L2: Wrong password shows error, input not cleared
  it("L2: shows 'Wrong password' error and preserves input on failed login", async () => {
    global.fetch = vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      if (opts?.method === "HEAD") return Promise.resolve({ ok: false });
      return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) });
    });
    const user = userEvent.setup();

    render(<LoginPage />);

    const input = screen.getByPlaceholderText("Password");
    await user.type(input, "wrongpass");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText("Wrong password")).toBeInTheDocument();
    });

    // Input should NOT be cleared
    expect(input).toHaveValue("wrongpass");
  });

  // L3: Button shows loading state
  it("L3: shows 'Signing in...' and disables button while loading", async () => {
    global.fetch = vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      if (opts?.method === "HEAD") return Promise.resolve({ ok: false });
      return new Promise(() => {}); // Never resolves for POST
    });
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("Password"), "test");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Signing in...");
    expect(button).toBeDisabled();
  });

  // L4: Network error shows descriptive message
  it("L4: shows a descriptive error on network failure (not just 'Something went wrong')", async () => {
    global.fetch = vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      if (opts?.method === "HEAD") return Promise.resolve({ ok: false });
      if (opts?.method === "POST") return Promise.reject(new TypeError("Failed to fetch"));
      return Promise.resolve({ ok: false });
    });
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("Password"), "test");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      const errorEl = screen.getByText(/unable to connect|login failed|try again/i);
      expect(errorEl).toBeInTheDocument();
    });
  });

  // L5: Successful login redirects to home
  it("L5: redirects to / after successful login", async () => {
    global.fetch = vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      if (opts?.method === "HEAD") return Promise.resolve({ ok: false });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    });
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("Password"), "correct");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });
});
