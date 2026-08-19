"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Sparkles, MessageSquare, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppTheme } from "@/provider/theme-provider";

interface WelcomeOverlayProps {
  onClose: () => void;
}

export function WelcomeOverlay({ onClose }: WelcomeOverlayProps) {
  const { user } = useUser();
  const router = useRouter();
  const { resolvedTheme } = useAppTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const firstName = user?.firstName?.trim();
  const greeting = firstName ? `Hi, ${firstName}!` : "Welcome!";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
        className={`relative z-10 w-full max-w-lg mx-4 rounded-2xl border shadow-2xl ${
          isDark
            ? "border-slate-700 bg-slate-900"
            : "border-border bg-background"
        }`}
      >
        {/* Skip link */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ${
            isDark ? "text-slate-400 hover:text-slate-200" : ""
          }`}
        >
          Skip tour
          <X className="h-3 w-3" />
        </button>

        <div className="p-8 text-center">
          {/* Logo */}
          <div
            className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${
              isDark ? "bg-indigo-500/20" : "bg-indigo-100"
            }`}
          >
            <Sparkles
              className={`h-8 w-8 ${
                isDark ? "text-indigo-400" : "text-indigo-600"
              }`}
            />
          </div>

          {/* Heading */}
          <h2
            className={`text-2xl font-bold tracking-tight ${
              isDark ? "text-slate-100" : "text-foreground"
            }`}
          >
            {greeting}
          </h2>
          <p
            className={`mt-2 text-lg ${
              isDark ? "text-slate-300" : "text-muted-foreground"
            }`}
          >
            Welcome to{" "}
            <span className="font-semibold text-foreground">
              Smart Presentations
            </span>
            <br />
            Your AI-powered presentation assistant.
          </p>

          {/* Bullet points */}
          <div className="mt-8 space-y-3 text-left">
            {[
              {
                icon: Sparkles,
                text: "Describe a topic → AI generates your outline and slides",
              },
              {
                icon: MessageSquare,
                text: "Edit with natural language using the AI Agent",
              },
              {
                icon: Download,
                text: "Export to PowerPoint or PDF, or present live",
              },
            ].map((item) => (
              <div
                key={item.text}
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  isDark
                    ? "border-slate-700 bg-slate-800/50"
                    : "border-border bg-muted/50"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    isDark ? "bg-indigo-500/20" : "bg-indigo-100"
                  }`}
                >
                  <item.icon
                    className={`h-4 w-4 ${
                      isDark ? "text-indigo-400" : "text-indigo-600"
                    }`}
                  />
                </div>
                <p
                  className={`text-sm ${
                    isDark ? "text-slate-200" : "text-foreground"
                  }`}
                >
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => router.push("/presentation/create")}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Create Your First Presentation
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={onClose}
            >
              Explore the Dashboard
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
