import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ApiKeyModal } from "@/components/settings/ApiKeyModal";

// Mock fetch globally
global.fetch = vi.fn();

describe("ApiKeyModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when open is true", () => {
    render(<ApiKeyModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);
    expect(screen.getByText("Enter your OpenAI API key")).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(<ApiKeyModal open={false} onClose={mockOnClose} onSave={mockOnSave} />);
    expect(screen.queryByText("Enter your OpenAI API key")).not.toBeInTheDocument();
  });

  it("shows input field and user can type", async () => {
    render(<ApiKeyModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const input = screen.getByPlaceholderText("sk-...");
    fireEvent.change(input, { target: { value: "sk-test123" } });
    expect(input).toHaveValue("sk-test123");
  });

  it("shows validation error for invalid format", async () => {
    render(<ApiKeyModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const input = screen.getByPlaceholderText("sk-...");
    fireEvent.change(input, { target: { value: "invalid-key" } });
    expect(await screen.findByText(/Invalid format/)).toBeInTheDocument();
  });

  it("enables Test button only when key format is valid", async () => {
    render(<ApiKeyModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const input = screen.getByPlaceholderText("sk-...");

    // Initially disabled because format not met
    let testBtn = screen.getByRole("button", { name: /test key/i });
    expect(testBtn).toBeDisabled();

    // Enter valid format (sk- + enough chars)
    fireEvent.change(input, { target: { value: "sk-" + "a".repeat(32) } });
    await waitFor(() => {
      testBtn = screen.getByRole("button", { name: /test key/i });
      expect(testBtn).not.toBeDisabled();
    });
  });

  it("calls validation endpoint when Test clicked", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true }),
    });

    render(<ApiKeyModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const input = screen.getByPlaceholderText("sk-...");
    fireEvent.change(input, { target: { value: "sk-validkey1234567890abcdefghijklmnopqrstuvwxyz" } });

    const testBtn = screen.getByRole("button", { name: /test key/i });
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/user/api-key/validate", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ key: "sk-validkey1234567890abcdefghijklmnopqrstuvwxyz" }),
      }));
    });
  });

  it("shows valid indicator after successful validation", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true }),
    });

    render(<ApiKeyModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const input = screen.getByPlaceholderText("sk-...");
    fireEvent.change(input, { target: { value: "sk-validkey1234567890abcdefghijklmnopqrstuvwxyz" } });

    fireEvent.click(screen.getByRole("button", { name: /test key/i }));

    await waitFor(() => {
      expect(screen.getByText("Valid")).toBeInTheDocument();
    });
  });

  it("shows invalid indicator and error after failed validation", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ valid: false, error: "Invalid API key" }),
    });

    render(<ApiKeyModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const input = screen.getByPlaceholderText("sk-...");
    fireEvent.change(input, { target: { value: "sk-badkey" } });
    fireEvent.click(screen.getByRole("button", { name: /test key/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid API key")).toBeInTheDocument();
    });
  });

  it("Save button disabled until key valid", async () => {
    render(<ApiKeyModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn).toBeDisabled();

    const input = screen.getByPlaceholderText("sk-...");
    fireEvent.change(input, { target: { value: "sk-" + "a".repeat(32) } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).not.toBeDisabled();
    });
  });

  it("calls onSave with key and storage when Save clicked", async () => {
    render(<ApiKeyModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const input = screen.getByPlaceholderText("sk-...");
    fireEvent.change(input, { target: { value: "sk-savetest1234567890abcdefghijklmnopqrstuvwxyz" } });

    // Ensure key becomes valid (format only)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).not.toBeDisabled();
    });

    const saveBtn = screen.getByRole("button", { name: /save/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        "sk-savetest1234567890abcdefghijklmnopqrstuvwxyz",
        "server" // default preferServerStorage = true
      );
    });
  });

  it("calls onClose after successful save", async () => {
    render(<ApiKeyModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const input = screen.getByPlaceholderText("sk-...");
    fireEvent.change(input, { target: { value: "sk-savetest1234567890abcdefghijklmnopqrstuvwxyz" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("shows error when save fails", async () => {
    mockOnSave.mockRejectedValueOnce(new Error("Network error"));
    render(<ApiKeyModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const input = screen.getByPlaceholderText("sk-...");
    fireEvent.change(input, { target: { value: "sk-savetest1234567890abcdefghijklmnopqrstuvwxyz" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("server storage checkbox is checked by default", () => {
    render(<ApiKeyModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const checkbox = screen.getByRole("checkbox", { name: /save encrypted on server/i });
    expect(checkbox).toBeChecked();
  });

  it("unchecking server storage still allows save if format valid", async () => {
    render(<ApiKeyModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const input = screen.getByPlaceholderText("sk-...");
    fireEvent.change(input, { target: { value: "sk-savetest1234567890abcdefghijklmnopqrstuvwxyz" } });

    // Uncheck server storage
    const checkbox = screen.getByRole("checkbox", { name: /save encrypted on server/i });
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        "sk-savetest1234567890abcdefghijklmnopqrstuvwxyz",
        "client"
      );
    });
  });

  it("renders description", () => {
    render(<ApiKeyModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);
    expect(screen.getByText(/Your API key powers AI text and image generation/)).toBeInTheDocument();
  });
});
