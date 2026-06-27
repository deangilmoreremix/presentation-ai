"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Settings,
  Image as ImageIcon,
  FileText,
  Menu,
  X
} from "lucide-react";

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50"
      aria-label="Primary"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center space-x-2"
            aria-label="ALLWEONE home"
          >
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
            </div>
            <span className="text-xl font-bold">ALLWEONE®</span>
          </Link>

          <div className="hidden md:flex items-center space-x-2">
            <Link href="/presentation">
              <Button variant="ghost" size="sm">
                <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                Presentations
              </Button>
            </Link>
            <Link href="/image-studio">
              <Button variant="ghost" size="sm">
                <ImageIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                Image Studio
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                Settings
              </Button>
            </Link>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
        </div>

        {mobileOpen && (
          <div
            id="mobile-nav-menu"
            className="md:hidden mt-3 flex flex-col gap-2 pb-2"
          >
            <Link href="/presentation" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                Presentations
              </Button>
            </Link>
            <Link href="/image-studio" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <ImageIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                Image Studio
              </Button>
            </Link>
            <Link href="/settings" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                Settings
              </Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}