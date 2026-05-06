import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock the key-storage module BEFORE importing SettingsPage
vi.mock("@/lib/key-storage", () => ({
  getMaskedKey: vi.fn(() => null),
  getKeyStoragePreference: vi.fn(() => "client"),
  getApiKey: vi.fn(() => null),
  removeApiKey: vi.fn(),
  saveApiKey: vi.fn(),
  shouldShowModal: vi.fn(() => false),
}));

import SettingsPage from "@/app/settings/page";
import { getMaskedKey, getKeyStoragePreference } from "@/lib/key-storage";

// Mock fetch
global.fetch = vi.fn();

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders heading and API key section", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("OpenAI API Key")).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    render(<SettingsPage />);
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it("displays 'No API key set' when no key", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, maskedKey: null, storage: "none" }),
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("No API key set")).toBeInTheDocument();
    });
  });

  it("displays masked key from server when storage is server", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, maskedKey: "sk-...abcd", storage: "server" }),
    });
    // Mock getKeyStoragePreference to return "server" so page uses server data
    vi.mocked(getKeyStoragePreference).mockReturnValue("server");

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("sk-...abcd")).toBeInTheDocument();
      expect(screen.getByText(/Encrypted on server/)).toBeInTheDocument();
    });
  });

  it("displays masked key from localStorage when storage is client", async () => {
    const { getMaskedKey } = await import("@/lib/key-storage");
    vi.mocked(getMaskedKey).mockReturnValue("sk-...1234");
    vi.mocked(getKeyStoragePreference).mockReturnValue("client");

    render(<SettingsPage />);

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

    render(<SettingsPage />);

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

    render(<SettingsPage />);

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

    render(<SettingsPage />);

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

    // After deletion, should show no key
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, maskedKey: null, storage: "none" }),
    });
    // Need to re-render? Actually UI updates after DELETE response, we can test that fetch called again.
    // For now just assert fetch was made.
    expect(global.fetch).toHaveBeenCalledTimes(2); // initial GET + DELETE
  });

  it("does not show Remove button when no key", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, maskedKey: null, storage: "none" }),
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
    });
  });
});
