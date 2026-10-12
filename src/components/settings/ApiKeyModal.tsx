"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ApiKeyInputField } from "./ApiKeyInputField";
import {
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

export type ByokProvider = "openai" | "muapi";

interface ProviderMeta {
  id: ByokProvider;
  name: string;
  description: string;
  keyLabel: string;
  placeholder: string;
  docUrl: string;
  docLabel: string;
  placeholderHint: string;
}

export const BYOK_PROVIDERS: ProviderMeta[] = [
  {
    id: "openai",
    name: "OpenAI",
    description:
      "Required for outline generation, full presentations, individual slides, AI image generation, image editing, and the presentation agent.",
    keyLabel: "OpenAI API key",
    placeholder: "sk-...",
    docUrl: "https://platform.openai.com/api-keys",
    docLabel: "OpenAI API key dashboard",
    placeholderHint:
      "Keys start with sk- and are at least 32 characters.",
  },
  {
    id: "muapi",
    name: "MuAPI",
    description:
      "Stored securely so a MuAPI-powered workflow can use your own key. No MuAPI generation feature is currently enabled in this app.",
    keyLabel: "MuAPI API key",
    placeholder: "Paste your MuAPI key",
    docUrl: "https://muapi.ai/dashboard/api-keys",
    docLabel: "MuAPI key management",
    placeholderHint: "Opaque token, at least 16 characters.",
  },
];

export interface ProviderStatus {
  provider: ByokProvider;
  configured: boolean;
  lastValidatedAt?: string | null;
}

interface ApiKeyModalProps {
  open: boolean;
  onClose: () => void;
  /** Persists the key server-side (encrypted). Must resolve on success. */
  onSave: (provider: ByokProvider, key: string) => Promise<void>;
  /** Existing connection status per provider, keyed by provider id. */
  statuses?: Record<ByokProvider, ProviderStatus | undefined>;
  /** The provider a blocked workflow needs, focused on open. */
  highlightProvider?: ByokProvider | null;
  /** Removes the user's stored credential for a provider. */
  onRemove?: (provider: ByokProvider) => Promise<void>;
}

function formatValidatedAt(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

/**
 * BYOK API key management modal.
 *
 * Shows the user's encrypted credential status per provider and lets them
 * add, validate, replace, or remove their own key. Stored credentials are
 * never fetched back into this component: the modal works from the
 * non-sensitive status metadata supplied by the server.
 */
export function ApiKeyModal({
  open,
  onClose,
  onSave,
  statuses,
  highlightProvider = null,
  onRemove,
}: ApiKeyModalProps) {
  const [keys, setKeys] = useState<Record<ByokProvider, string>>({
    openai: "",
    muapi: "",
  });
  const [testing, setTesting] = useState<Record<ByokProvider, boolean>>({
    openai: false,
    muapi: false,
  });
  const [saving, setSaving] = useState<Record<ByokProvider, boolean>>({
    openai: false,
    muapi: false,
  });
  const [removing, setRemoving] = useState<Record<ByokProvider, boolean>>({
    openai: false,
    muapi: false,
  });
  const [testResult, setTestResult] = useState<
    Record<ByokProvider, "idle" | "valid" | "invalid">
  >({ openai: "idle", muapi: "idle" });
  const [testError, setTestError] = useState<Record<ByokProvider, string | null>>(
    { openai: null, muapi: null },
  );
  const [saveError, setSaveError] = useState<Record<ByokProvider, string | null>>(
    { openai: null, muapi: null },
  );

  // Reset transient state whenever the modal is closed.
  React.useEffect(() => {
    if (!open) {
      setKeys({ openai: "", muapi: "" });
      setTesting({ openai: false, muapi: false });
      setSaving({ openai: false, muapi: false });
      setRemoving({ openai: false, muapi: false });
      setTestResult({ openai: "idle", muapi: "idle" });
      setTestError({ openai: null, muapi: null });
      setSaveError({ openai: null, muapi: null });
    }
  }, [open]);

  const isFormatValid = (provider: ByokProvider) => {
    const key = keys[provider].trim();
    if (!key) return false;
    if (provider === "openai") return /^sk-[A-Za-z0-9_-]{32,}$/.test(key);
    return key.length >= 16 && !/\s/.test(key);
  };

  const handleTest = async (provider: ByokProvider) => {
    if (!isFormatValid(provider)) return;

    setTesting((p) => ({ ...p, [provider]: true }));
    setTestResult((r) => ({ ...r, [provider]: "idle" }));
    setTestError((e) => ({ ...e, [provider]: null }));

    try {
      const response = await fetch("/api/user/api-key/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider, key: keys[provider].trim() }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setTestResult((r) => ({ ...r, [provider]: "valid" }));
      } else {
        setTestResult((r) => ({ ...r, [provider]: "invalid" }));
        setTestError((e) => ({
          ...e,
          [provider]: data.error || "Invalid API key",
        }));
      }
    } catch {
      setTestResult((r) => ({ ...r, [provider]: "invalid" }));
      setTestError((e) => ({ ...e, [provider]: "Network error while validating key" }));
    } finally {
      setTesting((p) => ({ ...p, [provider]: false }));
    }
  };

  const handleSave = async (provider: ByokProvider) => {
    if (!isFormatValid(provider)) return;

    setSaving((p) => ({ ...p, [provider]: true }));
    setSaveError((e) => ({ ...e, [provider]: null }));

    try {
      await onSave(provider, keys[provider].trim());
      onClose();
    } catch (error) {
      setSaveError((e) => ({
        ...e,
        [provider]: error instanceof Error ? error.message : "Failed to save API key",
      }));
    } finally {
      setSaving((p) => ({ ...p, [provider]: false }));
    }
  };

  const handleRemove = async (provider: ByokProvider) => {
    if (!onRemove) return;

    setRemoving((p) => ({ ...p, [provider]: true }));
    setSaveError((e) => ({ ...e, [provider]: null }));

    try {
      await onRemove(provider);
    } catch (error) {
      setSaveError((e) => ({
        ...e,
        [provider]: error instanceof Error ? error.message : "Failed to remove API key",
      }));
    } finally {
      setRemoving((p) => ({ ...p, [provider]: false }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect Your AI Providers</DialogTitle>
          <DialogDescription>
            Use your own API keys to generate presentations, images, and AI
            content. Your provider bills you directly for usage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {BYOK_PROVIDERS.map((provider) => {
            const status = statuses?.[provider.id];
            const configured = Boolean(status?.configured);
            const validatedAt = formatValidatedAt(status?.lastValidatedAt);
            const missing = keys[provider.id].trim().length === 0;

            return (
              <section
                key={provider.id}
                className={`rounded-lg border p-4 space-y-3 ${
                  highlightProvider === provider.id && !configured
                    ? "border-primary ring-1 ring-primary"
                    : "border-border"
                }`}
                aria-label={`${provider.name} API key`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <KeyRound className="h-4 w-4 text-muted-foreground" />
                      {provider.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {provider.description}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      configured
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {configured ? (
                      <>
                        <ShieldCheck className="h-3 w-3" /> Connected
                      </>
                    ) : (
                      "Not connected"
                    )}
                  </span>
                </div>

                {configured && validatedAt && (
                  <p className="text-xs text-muted-foreground">
                    Last validated: {validatedAt}
                  </p>
                )}

                <div className="space-y-2">
                  <Label htmlFor={`api-key-${provider.id}`}>
                    {configured ? "Replace key" : provider.keyLabel}
                  </Label>
                  <ApiKeyInputField
                    value={keys[provider.id]}
                    onChange={(value) => {
                      setKeys((k) => ({ ...k, [provider.id]: value }));
                      setTestResult((r) => ({ ...r, [provider.id]: "idle" }));
                    }}
                    showToggle
                    placeholder={provider.placeholder}
                  />
                  <p className="text-xs text-muted-foreground">
                    {provider.placeholderHint}
                  </p>

                  {!missing && !isFormatValid(provider.id) && (
                    <p className="text-sm text-destructive">
                      Invalid format. {provider.placeholderHint}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(provider.id)}
                    disabled={!isFormatValid(provider.id) || testing[provider.id]}
                  >
                    {testing[provider.id] ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      "Validate connection"
                    )}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSave(provider.id)}
                    disabled={
                      !isFormatValid(provider.id) ||
                      saving[provider.id] ||
                      testResult[provider.id] === "invalid"
                    }
                  >
                    {saving[provider.id] ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : configured ? (
                      "Replace key"
                    ) : (
                      "Save key"
                    )}
                  </Button>

                  {configured && onRemove && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemove(provider.id)}
                      disabled={removing[provider.id]}
                    >
                      {removing[provider.id] ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Removing...
                        </>
                      ) : (
                        "Remove"
                      )}
                    </Button>
                  )}

                  {testResult[provider.id] === "valid" && (
                    <span className="flex items-center text-sm text-green-600">
                      <CheckCircle className="mr-1 h-4 w-4" />
                      Valid
                    </span>
                  )}
                  {testResult[provider.id] === "invalid" && testError[provider.id] && (
                    <span className="flex items-center text-sm text-destructive">
                      <XCircle className="mr-1 h-4 w-4" />
                      {testError[provider.id]}
                    </span>
                  )}
                </div>

                <a
                  href={provider.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Get a key from {provider.docLabel}
                  <ExternalLink className="h-3 w-3" />
                </a>

                {saveError[provider.id] && (
                  <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                    {saveError[provider.id]}
                  </p>
                )}
              </section>
            );
          })}

          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            Keys are encrypted with AES-256-GCM before they are stored, scoped
            to your account, and never shown back to you once saved. Removing a
            key stops every feature that depends on it.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
