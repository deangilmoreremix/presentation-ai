"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="h-screen w-screen grid place-items-center px-4">
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h2>
        <p className="text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground/70 font-mono">
            Error ID: {error.digest}
          </p>
        ) : null}
        <Button onClick={reset} variant="default">
          Try again
        </Button>
      </div>
    </div>
  );
}