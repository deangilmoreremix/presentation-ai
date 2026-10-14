import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";

// Mock Clerk
vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn(() => ({
    user: null,
    isLoaded: true,
    isSignedIn: false,
  })),
  useSignIn: vi.fn(() => ({ isLoaded: true, signIn: { create: vi.fn() } })),
  useSignUp: vi.fn(() => ({ isLoaded: true, signUp: { create: vi.fn() } })),
  UserButton: () => <div>User Button</div>,
  SignInButton: () => <div>Sign In</div>,
  SignUpButton: () => <div>Sign Up</div>,
  ClerkProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

import SettingsPage from "@/app/settings/page";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
});

function mockProviders(providers: unknown[]) {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ success: true, providers }),
  });
}

const OPENAI_PROVIDERS = [
  { provider: "openai", configured: true, lastValidatedAt: "2026-01-01T00:00:00.000Z" },
  { provider: "muapi", configured: false, lastValidatedAt: null },
];

describe("SettingsPage (BYOK)", () => {
  it("renders both AI providers", async () => {
    mockProviders(OPENAI_PROVIDERS);
    render(<SettingsPage />);

    expect(await screen.findByText(/AI Providers/i)).toBeInTheDocument();
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("MuAPI")).toBeInTheDocument();
  });

  it("shows connected status without ever displaying key material", async () => {
    mockProviders(OPENAI_PROVIDERS);
    const { container } = render(<SettingsPage />);

    await screen.findByText(/AI Providers/i);

    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Not connected")).toBeInTheDocument();
    // No key strings, masked or otherwise, are ever rendered.
    expect(container.textContent).not.toContain("sk-");
    expect(container.textContent).not.toMatch(/sk-\.\.\./);
  });

  it("does not offer a client-side (localStorage) storage option", async () => {
    mockProviders(OPENAI_PROVIDERS);
    const { container } = render(<SettingsPage />);

    await screen.findByText(/AI Providers/i);

    expect(container.textContent).not.toMatch(/local browser storage/i);
    expect(container.textContent).not.toMatch(/client storage/i);
    // Server-side encrypted storage is the only model.
    expect(container.textContent).toMatch(/encrypted/i);
  });

  it("opens the API key modal for a specific provider", async () => {
    mockProviders([
      { provider: "openai", configured: false },
      { provider: "muapi", configured: false },
    ]);
    render(<SettingsPage />);

    await screen.findByText(/AI Providers/i);
    const buttons = screen.getAllByRole("button", { name: /connect/i });
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(
        screen.getAllByText(/Connect Your AI Providers/i)[0],
      ).toBeInTheDocument();
    });
    // Modal subtitle states the BYOK model.
    expect(
      screen.getAllByText(/your provider bills you directly/i).length,
    ).toBeGreaterThan(0);
  });

  it("warns the user when no provider is connected", async () => {
    mockProviders([
      { provider: "openai", configured: false },
      { provider: "muapi", configured: false },
    ]);
    render(<SettingsPage />);

    expect(
      await screen.findByText(/Bring your own AI key/i),
    ).toBeInTheDocument();
  });
});
