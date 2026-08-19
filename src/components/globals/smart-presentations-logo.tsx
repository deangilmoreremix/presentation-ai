import { cn } from "@/lib/utils";
import LocalFont from "next/font/local";
import type React from "react";
const AmericanTypewritter = LocalFont({
  src: "../../fonts/American_Typewriter.woff",
});

export default function SmartPresentationsLogo(
  props: React.ButtonHTMLAttributes<HTMLDivElement> & { className?: string },
) {
  return (
    <div className={cn("h-7 w-40", props.className)} {...props}>
      <svg viewBox="0 0 180 20" className="h-full w-full">
        <text
          x="1"
          y="14"
          className={cn(
            "fill-dbi tracking-wide",
            AmericanTypewritter.className,
          )}
          fontSize="13"
        >
          Smart Presentations
        </text>
      </svg>
    </div>
  );
}
