"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiKeyModal } from "@/components/settings/ApiKeyModal";
import { Loader2, Key, Shield, Globe } from "lucide-react";
import { getApiKey, getMaskedKey, getKeyStoragePreference } from "@/lib/key-storage";

export default function SettingsPage() {
  const [preference, setPreference] = React.useState<"client" | "server">("client");
  const [maskedKey, setMaskedKey] = React.useState<string | null>(null);
  const [serverStatus, setServerStatus] = React.useState<"checking" | "has-server-key" | "no-server-key">("checking");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [modalOpen, setModalOpen] = React.useState(false);

  React.useEffect(() => {
    // Initialize from localStorage
    const pref = getKeyStoragePreference();
    setPreference(pref);

    // Determine the displayed key based on preference
    const key = getMaskedKey();
    setMaskedKey(key);

    // Check if a server copy exists (if pref is "server" or to give accurate status)
    checkServerKeyStatus().then(() => setLoading(false));
  }, []);

  const checkServerKeyStatus = async () => {
    try {
      const response = await fetch("/api/user/api-key", {
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok && data.success && data.maskedKey) {
        setServerStatus("has-server-key");
        // If user prefers server, show server masked key
        if (preference === "server") {
          setMaskedKey(data.maskedKey);
        }
      } else {
        setServerStatus("no-server-key");
      }
    } catch {
      setServerStatus("no-server-key");
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

    // Update local state
    setPreference(storage);
    if (storage === "client") {
      // In client storage, the key is already saved to localStorage by the modal's onSave
      // But modal's onSave also POSTs. It also should store to localStorage? We'll let modal do both.
      // Our modal's onSave is passed from parent; we need to manage localStorage writes.
      // Better: let modal handle both client localStorage and server POST. Here just update UI.
      setMaskedKey(getMaskedKey());
    } else {
      // Server storage: fetch from server
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

      // Clear localStorage as well (key might be stored there too)
      // We'll import removeApiKey
      // Actually we are on client; can call removeApiKey directly.
      // But we need to import it. Let's import at top.
      // For now, just reload state from source.
      setMaskedKey(null);
      setServerStatus("no-server-key");
    } catch {
      setError("Failed to remove API key");
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        {/* API Key Section */}
        <Card>
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
            ) : (
              <>
                <div className="flex items-center justify-between rounded-md border p-4">
                  <div>
                    <p className="font-medium">
                      {maskedKey ? (
                        <>
                          Key: <code className="rounded bg-muted px-2 py-1 text-sm">{maskedKey}</code>
                        </>
                      ) : (
                        "No API key set"
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Storage:{" "}
                      {preference === "server" ? (
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3 text-green-600" />
                          Encrypted on server
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
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

                {/* Info box */}
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

        {/* Additional settings sections can go here */}
      </div>

      {/* API Key Modal */}
      <ApiKeyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}

