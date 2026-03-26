import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    replace: vi.fn(),
  }),
  useParams: () => ({ id: "test-id" }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link as a simple anchor
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) => {
    const { createElement } = require("react");
    return createElement("a", { href, ...props }, children);
  },
}));

// Stub navigator.wakeLock
Object.defineProperty(navigator, "wakeLock", {
  value: {
    request: vi.fn().mockResolvedValue({
      release: vi.fn(),
    }),
  },
  writable: true,
});
