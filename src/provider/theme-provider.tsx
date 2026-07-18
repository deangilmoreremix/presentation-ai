"use client";

import { Moon, Sun } from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
  systemTheme: "light" | "dark";
  forcedTheme: undefined;
  themes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }

  return "system";
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const computeSystemTheme = (): "light" | "dark" =>
      mediaQuery.matches ? "dark" : "light";
    const next = theme === "system" ? computeSystemTheme() : theme;

    root.classList.remove("light", "dark");
    root.classList.add(next);
    root.style.colorScheme = next;

    setResolvedTheme(next);
    setSystemTheme(computeSystemTheme());

    try {
      window.localStorage.setItem("theme", theme);
    } catch {
      // Ignore localStorage errors.
    }

    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === "system") {
        const sysTheme = e.matches ? "dark" : "light";
        root.classList.remove("light", "dark");
        root.classList.add(sysTheme);
        root.style.colorScheme = sysTheme;
        setResolvedTheme(sysTheme);
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        resolvedTheme,
        systemTheme,
        forcedTheme: undefined,
        themes: ["light", "dark", "system"],
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within a ThemeProvider");
  }

  return {
    theme: context.theme,
    setTheme: context.setTheme,
    resolvedTheme: context.resolvedTheme,
    forcedTheme: context.forcedTheme,
    themes: context.themes,
    systemTheme: context.systemTheme,
  };
}

export function ThemeToggle() {
  const context = useContext(ThemeContext);
  const currentTheme = context?.theme ?? "light";
  const setTheme = context?.setTheme ?? (() => {});

  const toggleTheme = () => {
    setTheme(currentTheme === "light" ? "dark" : "light");
  };

  return (
    <Button
      variant="outline"
      className="flex w-full items-center justify-between gap-2 text-primary"
      onClick={toggleTheme}
    >
      <span>Change Theme</span>
      <div className="flex items-center">
        <Sun className="h-4 w-4 rotate-0 transition-all dark:hidden" />
        <Moon className="hidden h-4 w-4 rotate-0 transition-all dark:block" />
        <Switch
          checked={currentTheme === "dark"}
          onCheckedChange={toggleTheme}
          className="ml-2"
        />
      </div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
