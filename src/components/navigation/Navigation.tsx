"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles, Settings, Image as ImageIcon, Presentation, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";

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
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 mr-8">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">ALLWEONE®</span>
          </Link>

          <div className="flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
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
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="User profile">
              <User className="h-4 w-4" />
              <span className="sr-only">User profile</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}