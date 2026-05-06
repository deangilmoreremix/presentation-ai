"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ApiKeyInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  showToggle?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Reusable input field for OpenAI API keys.
 * Features:
 * - Show/hide password toggle
 * - Real-time format validation (visual feedback via parent)
 * - Consistent styling
 */
export function ApiKeyInputField({
  value,
  onChange,
  showToggle = true,
  disabled = false,
  placeholder = "sk-...",
}: ApiKeyInputFieldProps) {
  const [showKey, setShowKey] = React.useState(false);

  const toggleShow = () => {
    if (showToggle) setShowKey((prev) => !prev);
  };

  return (
    <div className="relative flex items-center gap-2">
      <Input
        type={showKey ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 pr-10"
        autoComplete="off"
        spellCheck={false}
      />
      {showToggle && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleShow}
          disabled={disabled}
          className="absolute right-0 h-full px-3 py-2"
          aria-label={showKey ? "Hide API key" : "Show API key"}
        >
          {showKey ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
