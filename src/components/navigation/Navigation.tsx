"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Settings, Image as ImageIcon, Presentation, Plus, Hash, Play, Users, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/react";
import { KeyboardShortcutsModal } from "@/components/onboarding/KeyboardShortcutsModal";
import { ProgressiveTip } from "@/components/onboarding/ProgressiveTip";

const anchorNavLinks = [
  {
    href: "/#features",
    label: "Features",
    icon: Hash,
  },
  {
    href: "/#demo",
    label: "Demo",
    icon: Play,
  },
  {
    href: "/#community",
    label: "Community",
    icon: Users,
  },
];

const navLinks = [
  {
    href: "/image-studio",
    label: "Image Studio",
    icon: ImageIcon,
  },
  {
    href: "/presentation",
    label: "Presentations",
    icon: Presentation,
  },
  {
    href: "/templates",
    label: "Templates",
    icon: LayoutGrid,
  },
];

export function Navigation() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [hasSeenShortcuts, setHasSeenShortcuts] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem(
      "smart-presentations-onboarding-shortcuts-seen",
    );
    if (hasSeen === "true") {
      setHasSeenShortcuts(true);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "?") return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      setShortcutsOpen(true);
      localStorage.setItem(
        "smart-presentations-onboarding-shortcuts-seen",
        "true",
      );
      setHasSeenShortcuts(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleOpenShortcuts = () => {
    setShortcutsOpen(true);
    localStorage.setItem(
      "smart-presentations-onboarding-shortcuts-seen",
      "true",
    );
    setHasSeenShortcuts(true);
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 mr-8">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">Smart Presentations</span>
          </Link>

          <div className="flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Button
                key={link.href}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                asChild
                className={cn(
                  "gap-2",
                  isActive && "bg-primary/10 text-primary"
                )}
              >
                <Link href={link.href}>
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              </Button>
              );
            })}

            {pathname === "/" &&
              anchorNavLinks.map((link) => (
                <Button
                  key={link.href}
                  variant="ghost"
                  size="sm"
                  asChild
                  className="gap-2"
                >
                  <Link href={link.href}>
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                </Button>
              ))}

              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenShortcuts()}
                  className="size-8 rounded-full p-0 text-sm font-semibold"
                  aria-label="Keyboard shortcuts"
                >
                  ?
                </Button>
                {!hasSeenShortcuts && (
                  <ProgressiveTip
                    id="keyboard-shortcuts"
                    message="Press ? for keyboard shortcuts"
                    onDismiss={() => {
                      localStorage.setItem(
                        "smart-presentations-onboarding-shortcuts-seen",
                        "true",
                      );
                      setHasSeenShortcuts(true);
                    }}
                  />
                )}
              </div>

              <Button
                variant={pathname === "/settings" ? "secondary" : "ghost"}
                size="sm"
                asChild
                className={cn(
                  "gap-2",
                  pathname === "/settings" && "bg-primary/10 text-primary"
                )}
              >
                <Link href="/settings">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </Button>
          </div>

          <div className="flex items-center gap-2">
              <Button size="sm" className="gap-2" asChild>
                <Link href="/presentation/create">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Presentation</span>
                </Link>
              </Button>
            {isSignedIn ? (
              <UserButton />
            ) : (
              <div className="flex items-center gap-2">
                <SignInButton mode="modal">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button size="sm">Sign Up</Button>
                </SignUpButton>
              </div>
            )}
          </div>
        </div>
      </div>

      <KeyboardShortcutsModal
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </nav>
  );
}
