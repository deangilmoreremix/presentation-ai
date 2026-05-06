"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Settings } from "lucide-react";

export function Navigation() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">ALLWEONE®</span>
          </Link>

          <div className="flex items-center space-x-4">
            <Link href="/settings">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}