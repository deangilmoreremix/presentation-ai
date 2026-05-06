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
import { Loader2, CheckCircle, XCircle } from "lucide-react";

interface ApiKeyModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (key: string, storage: "client" | "server") => Promise<void>;
}

/**
 * Modal for entering and validating OpenAI API key.
 * Appears when an authenticated user attempts to generate without a key.
 */
export function ApiKeyModal({ open, onClose, onSave }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [preferServerStorage, setPreferServerStorage] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<"idle" | "valid" | "invalid">("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!open) {
      setApiKey("");
      setTestResult("idle");
      setTestError(null);
      setSaveError(null);
      setIsTesting(false);
      setIsSaving(false);
    }
  }, [open]);

  const isValidFormat = apiKey.length > 0 && apiKey.startsWith("sk-") && apiKey.length >= 10;

  const handleTest = async () => {
    if (!isValidFormat) return;

    setIsTesting(true);
    setTestResult("idle");
    setTestError(null);

    try {
      const response = await fetch("/api/user/api-key/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: apiKey }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setTestResult("valid");
      } else {
        setTestResult("invalid");
        setTestError(data.error || "Invalid API key");
      }
    } catch (error) {
      setTestResult("invalid");
      setTestError("Network error while validating key");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!isValidFormat) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      await onSave(apiKey, preferServerStorage ? "server" : "client");
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save API key");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter your OpenAI API key</DialogTitle>
          <DialogDescription>
            Your API key powers AI text and image generation. It&apos;s stored securely (optionally encrypted on our servers) and used only for your requests.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* API Key Input */}
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <ApiKeyInputField
              value={apiKey}
              onChange={setApiKey}
              showToggle={true}
              placeholder="sk-..."
            />
            {!isValidFormat && apiKey.length > 0 && (
              <p className="text-sm text-destructive">
                Invalid format. OpenAI keys start with sk- and contain at least 32 alphanumeric characters.
              </p>
            )}
          </div>

          {/* Test Button */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={!isValidFormat || isTesting}
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Key"
              )}
            </Button>
            {testResult === "valid" && (
              <span className="flex items-center text-sm text-green-600">
                <CheckCircle className="mr-1 h-4 w-4" />
                Valid
              </span>
            )}
            {testResult === "invalid" && testError && (
              <span className="flex items-center text-sm text-destructive">
                <XCircle className="mr-1 h-4 w-4" />
                {testError}
              </span>
            )}
          </div>

          {/* Server Storage Toggle */}
          <div className="flex items-center space-x-2 rounded-md border p-3">
            <input
              type="checkbox"
              id="server-storage"
              checked={preferServerStorage}
              onChange={(e) => setPreferServerStorage(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="server-storage" className="flex-1 cursor-pointer text-sm">
              Save encrypted on server (recommended)
            </Label>
          </div>
          {!preferServerStorage && (
            <p className="text-xs text-muted-foreground">
              Warning: Client-only storage means the key is stored in your browser and will be lost if you clear browser data. It also won&apos;t sync across devices.
            </p>
          )}

          {/* Error display for save failures */}
          {saveError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {saveError}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!isValidFormat || isSaving || testResult === "invalid"}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
