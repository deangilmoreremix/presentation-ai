"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          backgroundColor: "#0a0a0a",
          color: "#fafafa",
          padding: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
            maxWidth: "28rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#a1a1aa", margin: 0 }}>
            {error.message || "An unexpected error occurred."}
          </p>
          {error.digest ? (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#71717a",
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                margin: 0,
              }}
            >
              Error ID: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              border: "1px solid #27272a",
              backgroundColor: "#18181b",
              color: "#fafafa",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}