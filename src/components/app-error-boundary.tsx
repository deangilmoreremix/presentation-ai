"use client";

import * as Sentry from "@sentry/nextjs";

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

function formatError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  if (typeof error === "string") {
    return { message: error };
  }
  return { message: "Unknown error" };
}

export function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => {
        const { message, stack } = formatError(error);

        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md w-full p-6">
              <h1 className="text-2xl font-bold text-center mb-2">
                Something went wrong
              </h1>
              <p className="text-muted-foreground text-center mb-6">
                We encountered an unexpected error. Please try refreshing the page.
              </p>
              {process.env.NODE_ENV === "development" && (
                <details className="mb-6">
                  <summary className="cursor-pointer text-sm font-medium mb-2">
                    Error Details (Development)
                  </summary>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-32">
                    {message}
                    {stack && `\n\n${stack}`}
                  </pre>
                </details>
              )}
              <div className="flex gap-2">
                <button
                  onClick={resetError}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 px-4 py-2 border border-input bg-background hover:bg-accent rounded-md"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        );
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
