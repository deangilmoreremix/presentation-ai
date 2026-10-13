"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ApiKeyModal,
  BYOK_PROVIDERS,
  type ByokProvider,
  type ProviderStatus,
} from "@/components/settings/ApiKeyModal";
import {
  Loader2,
  Key,
  ShieldCheck,
  User,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";

function getInitials(email: string | null): string {
  if (!email || email === "anonymous@local") return "?";
  const local = (email.split("@")[0] ?? "").trim();
  const parts = local.split(/[._-]/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  const combined = (first + second).toUpperCase();
  return combined || local.slice(0, 2).toUpperCase();
}

const EMPTY_STATUSES: Record<ByokProvider, ProviderStatus | undefined> = {
  openai: undefined,
  muapi: undefined,
};

export default function SettingsPage() {
  const { user, isLoaded } = useUser();

  const [statuses, setStatuses] = useState<
    Record<ByokProvider, ProviderStatus | undefined>
  >(EMPTY_STATUSES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [highlightProvider, setHighlightProvider] =
    useState<ByokProvider | null>(null);

  const isAuthenticated = isLoaded && !!user;

  const loadStatuses = React.useCallback(async () => {
    try {
      const response = await fetch("/api/user/api-key", {
        credentials: "include",
      });
      if (!response.ok) {
        setStatuses(EMPTY_STATUSES);
        return;
      }
      const data = await response.json();
      const next: Record<ByokProvider, ProviderStatus | undefined> = {
        openai: undefined,
        muapi: undefined,
      };
      for (const entry of data.providers ?? []) {
        next[entry.provider as ByokProvider] = entry as ProviderStatus;
      }
      setStatuses(next);
    } catch {
      setStatuses(EMPTY_STATUSES);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  const handleSave = async (provider: ByokProvider, key: string) => {
    const response = await fetch("/api/user/api-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ provider, key }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Failed to save API key");
    }

    await loadStatuses();
    setError(null);
    setSuccess(
      `${BYOK_PROVIDERS.find((p) => p.id === provider)?.name ?? "Provider"} key saved.`,
    );
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleRemove = async (provider: ByokProvider) => {
    const response = await fetch(
      `/api/user/api-key?provider=${encodeURIComponent(provider)}`,
      { method: "DELETE", credentials: "include" },
    );

    if (!response.ok) throw new Error("Failed to remove API key");

    await loadStatuses();
    setError(null);
    setSuccess(
      `${BYOK_PROVIDERS.find((p) => p.id === provider)?.name ?? "Provider"} key removed.`,
    );
    setTimeout(() => setSuccess(null), 3000);
  };

  const anyConfigured = BYOK_PROVIDERS.some(
    (p) => statuses[p.id]?.configured,
  );

  const displayName = user?.emailAddresses[0]?.emailAddress
    ? user.emailAddresses[0].emailAddress.split("@")[0]
    : "Anonymous Visitor";

  return (
    <div className="container mx-auto py-6 md:py-8 px-4 md:px-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Settings</h1>

      {!anyConfigured && !loading && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <strong>Bring your own AI key:</strong> Presentation AI uses your own
          provider credentials. Connect OpenAI to enable outlines, presentations,
          slides, and AI images. MuAPI credentials can also be stored here.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Account */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>Your profile and session status.</CardDescription>
          </CardHeader>
          <CardContent>
            {!isLoaded ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading account info...
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="text-sm font-medium bg-muted">
                    {getInitials(user?.emailAddresses[0]?.emailAddress ?? null)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm md:text-base truncate">
                    {displayName}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {user?.emailAddresses[0]?.emailAddress ?? ""}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        isAuthenticated
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}
                    >
                      {isAuthenticated ? (
                        <>
                          <Wifi className="h-3 w-3" /> Authenticated
                        </>
                      ) : (
                        <>
                          <WifiOff className="h-3 w-3" /> Anonymous Session
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI providers */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              AI Providers
            </CardTitle>
            <CardDescription>
              Connect your own provider keys. Keys are encrypted before they are
              stored, scoped to your account, and never shown back to you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading provider status...
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : (
              <>
                {success && (
                  <p className="text-sm text-green-600">{success}</p>
                )}

                <div className="space-y-2">
                  {BYOK_PROVIDERS.map((provider) => {
                    const status = statuses[provider.id];
                    const configured = Boolean(status?.configured);
                    return (
                      <div
                        key={provider.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border p-4"
                      >
                        <div className="min-w-0">
                          <p className="font-medium flex items-center gap-2">
                            {provider.name}
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                configured
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {configured && (
                                <ShieldCheck className="h-3 w-3" />
                              )}
                              {configured ? "Connected" : "Not connected"}
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {provider.description}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setHighlightProvider(provider.id);
                              setModalOpen(true);
                            }}
                          >
                            {configured ? "Manage key" : "Connect"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  This app runs on bring-your-own-key: your provider bills you
                  directly for usage, and no platform-owned key is ever used for
                  your requests.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <ApiKeyModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setHighlightProvider(null);
        }}
        onSave={handleSave}
        statuses={statuses}
        highlightProvider={highlightProvider}
        onRemove={handleRemove}
      />
    </div>
  );
}
