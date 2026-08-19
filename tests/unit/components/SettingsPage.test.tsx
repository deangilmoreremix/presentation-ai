import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock Clerk
vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn(() => ({
    user: null,
    isLoaded: true,
    isSignedIn: false,
  })),
  useSignIn: vi.fn(() => ({
    isLoaded: true,
    signIn: {
      create: vi.fn(),
    },
  })),
  useSignUp: vi.fn(() => ({
    isLoaded: true,
    signUp: {
      create: vi.fn(),
    },
  })),
  UserButton: () => <div>User Button</div>,
  SignInButton: () => <div>Sign In</div>,
  SignUpButton: () => <div>Sign Up</div>,
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the key-storage module BEFORE importing SettingsPage
vi.mock("@/lib/key-storage", () => ({
  getMaskedKey: vi.fn(() => null),
  getKeyStoragePreference: vi.fn(() => "client"),
  getApiKey: vi.fn(() => null),
  removeApiKey: vi.fn(),
  saveApiKey: vi.fn(),
  shouldShowModal: vi.fn(() => false),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

// Mock ClerkProvider is already mocked above

import SettingsPage from "@/app/settings/page";
import {
  getApiKey,
  getMaskedKey,
  getKeyStoragePreference,
} from "@/lib/key-storage";

// Mock fetch
global.fetch = vi.fn();

// Get mocked ClerkProvider from the mock
const { ClerkProvider } = await import("@clerk/nextjs");

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ClerkProvider>{children}</ClerkProvider>
);

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMaskedKey).mockReturnValue(null);
    vi.mocked(getKeyStoragePreference).mockReturnValue("client");
    vi.mocked(getApiKey).mockReturnValue(null);
    global.fetch = vi.fn();
  });

  it("renders heading and API key section", () => {
    render(<SettingsPage />, { wrapper });
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("OpenAI API Key")).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    render(<SettingsPage />, { wrapper });
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it("displays 'No API key set' when no key", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, maskedKey: null, storage: "none" }),
    });

    render(<SettingsPage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("No API key set")).toBeInTheDocument();
    });
  });

  it("displays masked key from server when storage is server", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, maskedKey: "sk-...abcd", storage: "server" }),
    });
    vi.mocked(getKeyStoragePreference).mockReturnValue("server");

    render(<SettingsPage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("sk-...abcd")).toBeInTheDocument();
      expect(screen.getByText(/Encrypted on server/)).toBeInTheDocument();
    });
  });

  it("displays masked key from localStorage when storage is client", async () => {
    const { getMaskedKey } = await import("@/lib/key-storage");
    vi.mocked(getMaskedKey).mockReturnValue("sk-...1234");
    vi.mocked(getKeyStoragePreference).mockReturnValue("client");

    render(<SettingsPage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("sk-...1234")).toBeInTheDocument();
      expect(screen.getByText(/Local browser storage/)).toBeInTheDocument();
    });
  });

  it("opens modal when Add Key button clicked", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, maskedKey: null, storage: "none" }),
    });

    render(<SettingsPage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("No API key set")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add key/i }));
    expect(await screen.findByText("Enter your OpenAI API key")).toBeInTheDocument();
  });

  it("opens modal when Change Key button clicked", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, maskedKey: "sk-...abcd", storage: "server" }),
    });

    render(<SettingsPage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("sk-...abcd")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /change key/i }));
    expect(await screen.findByText("Enter your OpenAI API key")).toBeInTheDocument();
  });

  it("removes key when Remove button clicked and confirmed", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, maskedKey: "sk-...wxyz", storage: "server" }),
    });

    // Mock window.confirm
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<SettingsPage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("sk-...wxyz")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /remove/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/user/api-key", expect.objectContaining({
        method: "DELETE",
        credentials: "include",
      }));
    });

    vi.restoreAllMocks();
  });

  it("does not show Remove button when no key", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, maskedKey: null, storage: "none" }),
    });

    render(<SettingsPage />, { wrapper });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
    });
  });
});
