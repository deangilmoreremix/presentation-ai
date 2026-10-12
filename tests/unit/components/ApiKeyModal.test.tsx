import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ApiKeyModal } from "@/components/settings/ApiKeyModal";

const fetchMock = vi.fn();
global.fetch = fetchMock as unknown as typeof fetch;

describe("ApiKeyModal (BYOK, OpenAI + MuAPI)", () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn().mockResolvedValue(undefined);
  const mockOnRemove = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
  });

  it("uses the required title and BYOK subtitle", () => {
    render(
      <ApiKeyModal open onClose={mockOnClose} onSave={mockOnSave} />,
    );
    expect(
      screen.getByText("Connect Your AI Providers"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Use your own API keys to generate presentations/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Your provider bills you directly for usage/i),
    ).toBeInTheDocument();
  });

  it("renders a card for each supported provider with a dashboard link", () => {
    render(
      <ApiKeyModal open onClose={mockOnClose} onSave={mockOnSave} />,
    );
    expect(screen.getByLabelText("OpenAI API key")).toBeInTheDocument();
    expect(screen.getByLabelText("MuAPI API key")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /OpenAI API key dashboard/i }),
    ).toHaveAttribute("href", "https://platform.openai.com/api-keys");
    expect(
      screen.getByRole("link", { name: /MuAPI key management/i }),
    ).toHaveAttribute("href", "https://muapi.ai/dashboard/api-keys");
  });

  it("shows connected status for configured providers only", () => {
    render(
      <ApiKeyModal
        open
        onClose={mockOnClose}
        onSave={mockOnSave}
        statuses={{
          openai: { provider: "openai", configured: true, lastValidatedAt: "2026-01-01T00:00:00.000Z" },
          muapi: { provider: "muapi", configured: false },
        }}
      />,
    );
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Not connected")).toBeInTheDocument();
    // Metadata only.
    expect(screen.getByText(/Last validated:/i)).toBeInTheDocument();
  });

  it("highlights the provider a blocked workflow requires", () => {
    render(
      <ApiKeyModal
        open
        onClose={mockOnClose}
        onSave={mockOnSave}
        highlightProvider="muapi"
      />,
    );
    const section = screen.getByLabelText("MuAPI API key");
    expect(section.className).toContain("ring-1");
    const openaiSection = screen.getByLabelText("OpenAI API key");
    expect(openaiSection.className).not.toContain("ring-1");
  });

  it("masks input and can reveal a newly entered credential", () => {
    render(
      <ApiKeyModal open onClose={mockOnClose} onSave={mockOnSave} />,
    );
    const input = screen.getByPlaceholderText("sk-...") as HTMLInputElement;
    expect(input.type).toBe("password");
    fireEvent.click(screen.getAllByRole("button", { name: /show api key/i })[0]);
    expect(input.type).toBe("text");
  });

  it("validates a connection with a per-provider payload", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ valid: true }),
    });

    render(
      <ApiKeyModal open onClose={mockOnClose} onSave={mockOnSave} />,
    );

    const input = screen.getByPlaceholderText("sk-...");
    fireEvent.change(input, {
      target: { value: "sk-abcdefghijklmnopqrstuvwxyz012345" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /validate connection/i })[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/user/api-key/validate",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body).toEqual({
      provider: "openai",
      key: "sk-abcdefghijklmnopqrstuvwxyz012345",
    });
    expect(await screen.findByText("Valid")).toBeInTheDocument();
  });

  it("shows a provider-specific validation error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ valid: false, error: "Incorrect API key provided" }),
    });

    render(
      <ApiKeyModal open onClose={mockOnClose} onSave={mockOnSave} />,
    );

    const input = screen.getByPlaceholderText("sk-...");
    fireEvent.change(input, {
      target: { value: "sk-abcdefghijklmnopqrstuvwxyz012345" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /validate connection/i })[0]);

    expect(
      await screen.findByText("Incorrect API key provided"),
    ).toBeInTheDocument();
  });

  it("rejects an OpenAI key with the wrong prefix", async () => {
    render(
      <ApiKeyModal open onClose={mockOnClose} onSave={mockOnSave} />,
    );
    const input = screen.getByPlaceholderText("sk-...");
    fireEvent.change(input, {
      target: { value: "muapilibary-long-token-value-123" },
    });
    expect(await screen.findByText(/Invalid format/i)).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /save key/i })[0],
    ).toBeDisabled();
  });

  it("sends the provider id when saving", async () => {
    render(
      <ApiKeyModal open onClose={mockOnClose} onSave={mockOnSave} />,
    );

    const input = screen.getByPlaceholderText("sk-...");
    fireEvent.change(input, {
      target: { value: "sk-abcdefghijklmnopqrstuvwxyz012345" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /save key/i })[0]);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        "openai",
        "sk-abcdefghijklmnopqrstuvwxyz012345",
      );
    });
  });

  it("offers replace and remove actions for a configured provider", () => {
    render(
      <ApiKeyModal
        open
        onClose={mockOnClose}
        onSave={mockOnSave}
        onRemove={mockOnRemove}
        statuses={{
          openai: { provider: "openai", configured: true },
          muapi: { provider: "muapi", configured: false },
        }}
      />,
    );
    expect(
      screen.getAllByRole("button", { name: /replace key/i })[0],
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /^remove$/i })[0],
    ).toBeInTheDocument();
  });

  it("calls onRemove with the correct provider", async () => {
    render(
      <ApiKeyModal
        open
        onClose={mockOnClose}
        onSave={mockOnSave}
        onRemove={mockOnRemove}
        statuses={{
          openai: { provider: "openai", configured: true },
          muapi: { provider: "muapi", configured: false },
        }}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /^remove$/i })[0]);
    await waitFor(() => {
      expect(mockOnRemove).toHaveBeenCalledWith("openai");
    });
  });

  it("never renders a stored credential", async () => {
    // Even when a key is configured, nothing resembling it may appear.
    render(
      <ApiKeyModal
        open
        onClose={mockOnClose}
        onSave={mockOnSave}
        statuses={{
          openai: { provider: "openai", configured: true },
          muapi: { provider: "muapi", configured: false },
        }}
      />,
    );
    // The prefilled input stays empty: the server never sends the key back.
    const input = screen.getByPlaceholderText("sk-...") as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("does not attempt to fetch a plaintext key from the server", () => {
    render(
      <ApiKeyModal open onClose={mockOnClose} onSave={mockOnSave} />,
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("raw=true"),
      expect.anything(),
    );
  });
});

describe("BYOK status shape", () => {
  it("exposes only provider, configured, and lastValidatedAt", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(
      "src/app/api/user/api-key/route.ts",
      "utf8",
    );
    expect(source).not.toContain("rawKey");
    expect(source).not.toContain("maskedKey");
    expect(source).not.toContain("decryptApiKey");
  });
});
