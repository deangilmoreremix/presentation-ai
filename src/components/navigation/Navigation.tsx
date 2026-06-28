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
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "gap-2",
                      isActive && "bg-primary/10 text-primary"
                    )}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Button>
                </Link>
              );
            })}

            <Link href="/settings">
              <Button
                variant={pathname === "/settings" ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "gap-2",
                  pathname === "/settings" && "bg-primary/10 text-primary"
                )}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/presentation/create">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Presentation</span>
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}