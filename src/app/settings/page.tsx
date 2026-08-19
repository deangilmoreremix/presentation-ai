"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ApiKeyModal } from "@/components/settings/ApiKeyModal";
import { Loader2, Key, Shield, Globe, Eye, EyeOff, User, Wifi, WifiOff } from "lucide-react";
import { getApiKey, getMaskedKey, getKeyStoragePreference, removeApiKey, saveApiKey } from "@/lib/key-storage";
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

export default function SettingsPage() {
  const { user, isLoaded } = useUser();

  const [preference, setPreference] = React.useState<"client" | "server">(() => getKeyStoragePreference());
  const [maskedKey, setMaskedKey] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [showFullKey, setShowFullKey] = React.useState(false);
  const [serverStorageSupported, setServerStorageSupported] = React.useState(false);

  const isAuthenticated = isLoaded && !!user;

  React.useEffect(() => {
    const pref = getKeyStoragePreference();
    setPreference(pref);
    setMaskedKey(getMaskedKey());
    checkServerKeyStatus().then(() => setLoading(false));
  }, []);

  const checkServerKeyStatus = async () => {
    try {
      const response = await fetch("/api/user/api-key", { credentials: "include" });
      if (response.status === 401) {
        setServerStorageSupported(false);
        return;
      }
      const data = await response.json();
      if (response.ok && data.success && data.maskedKey) {
        setServerStorageSupported(true);
        setMaskedKey(data.maskedKey);
      } else {
        setServerStorageSupported(true);
      }
    } catch {
      // noop
    }
  };

  const handleSave = async (key: string, storage: "client" | "server") => {
    const response = await fetch("/api/user/api-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ key, storage }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to save API key");
    }

    setPreference(storage);
    if (storage === "client") {
      saveApiKey(key, "client");
      setMaskedKey(getMaskedKey());
    } else {
      const resp = await fetch("/api/user/api-key", { credentials: "include" });
      const data = await resp.json();
      if (resp.ok && data.maskedKey) {
        setMaskedKey(data.maskedKey);
      }
    }
  };

  const handleRemove = async () => {
    if (!confirm("Are you sure you want to remove your API key? AI generation will stop working.")) {
      return;
    }

    try {
      const response = await fetch("/api/user/api-key", {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to remove");

      removeApiKey();
      setMaskedKey(null);
      setPreference("client");
      setError(null);
      setSuccess("API key removed successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Failed to remove API key");
      setSuccess(null);
    }
  };

  const displayName = user?.emailAddresses[0]?.emailAddress
    ? user.emailAddresses[0].emailAddress.split("@")[0]
    : "Anonymous Visitor";

  return (
    <div className="container mx-auto py-6 md:py-8 px-4 md:px-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Settings</h1>

      {!maskedKey && !loading && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <strong>API key required:</strong> You need an OpenAI API key to use AI generation features. Add one below to continue.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* User Profile Section */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>
              Your profile and session status.
            </CardDescription>
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
                  <p className="font-medium text-sm md:text-base truncate">{displayName}</p>
                  <p className="text-sm text-muted-foreground truncate">{user?.emailAddresses[0]?.emailAddress ?? ""}</p>
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

        {/* API Key Section */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              OpenAI API Key
            </CardTitle>
            <CardDescription>
              Your personal OpenAI API key powers text and image generation. You can manage it here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : success ? (
              <p className="text-sm text-green-600">{success}</p>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-md border p-4 gap-4">
                  <div className="min-w-0">
                    <p className="font-medium flex items-center gap-2 flex-wrap">
                      {maskedKey ? (
                        <>
                          Key:{" "}
                          <code className="rounded bg-muted px-2 py-1 text-sm flex items-center gap-1">
                            {showFullKey && preference === "client" ? getApiKey() : maskedKey}
                            {preference === "client" && maskedKey && (
                              <button
                                type="button"
                                onClick={() => setShowFullKey(!showFullKey)}
                                className="ml-1 text-muted-foreground hover:text-foreground"
                                aria-label={showFullKey ? "Hide key" : "Show key"}
                              >
                                {showFullKey ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </code>
                        </>
                      ) : (
                        "No API key set"
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Storage:{" "}
                      {preference === "server" ? (
                        <span className="inline-flex items-center gap-1">
                          <Shield className="h-3 w-3 text-green-600" />
                          Encrypted on server
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          Local browser storage
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setModalOpen(true)}>
                      {maskedKey ? "Change Key" : "Add Key"}
                    </Button>
                    {maskedKey && (
                      <Button variant="destructive" onClick={handleRemove}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  {preference === "server" ? (
                    <p>
                      Your key is encrypted and stored securely on our servers. It will be available on any device you sign in with.
                    </p>
                  ) : (
                    <p>
                      Your key is stored only in this browser&apos;s local storage. It won&apos;t be available on other devices or after clearing browser data.
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* API Key Modal */}
      <ApiKeyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        serverStorageSupported={serverStorageSupported}
      />
    </div>
  );
}
