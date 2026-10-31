const REQUIRED_ENV = [
  {
    name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    hint: "Clerk dashboard → API Keys",
  },
  { name: "CLERK_SECRET_KEY", hint: "Clerk dashboard → API Keys" },
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    hint: "Supabase → Project Settings → API",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    hint: "Supabase → Project Settings → API",
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    hint: "Supabase → Project Settings → API",
  },
  { name: "OPENAI_API_KEY", hint: "Text + image generation" },
];

/**
 * Rendered by the root layout when auth isn't configured, so a deploy with
 * missing environment variables shows what to fix instead of a blank page.
 */
export function SetupRequired({ missing }: { missing: string[] }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold">Smart Presentations</h1>
        <p className="mb-6 text-muted-foreground">
          This deployment is missing required configuration. Add these
          environment variables in your hosting provider (Netlify → Site
          configuration → Environment variables) and redeploy.
        </p>
        <ul className="space-y-2">
          {REQUIRED_ENV.map(({ name, hint }) => {
            const isMissing = missing.includes(name);
            return (
              <li
                key={name}
                className="flex items-start justify-between gap-4 rounded-md border border-border px-3 py-2 text-sm"
              >
                <code className="font-mono">{name}</code>
                <span
                  className={
                    isMissing ? "text-destructive" : "text-muted-foreground"
                  }
                >
                  {isMissing ? "missing" : "set"} · {hint}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}

export function getMissingRequiredEnv(): string[] {
  return REQUIRED_ENV.map((v) => v.name).filter((name) => !process.env[name]);
}
