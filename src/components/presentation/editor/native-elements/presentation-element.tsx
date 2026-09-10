"use client";

import React from "react";

import { type PlateElementProps } from "platejs/react";

import { cn } from "@/lib/utils";
import { PlateElement as PlateElementPrimitive } from "platejs/react";
import { BlockSelection } from "@/components/plate/ui/block-selection";

export const PresentationElement = React.forwardRef<
  HTMLDivElement,
  PlateElementProps
>(({ children, className, ...props }: PlateElementProps, ref) => {
  return (
    <PlateElementPrimitive
      ref={ref}
      className={cn("presentation-element relative !select-text", className)}
      {...props}
    >
      {children}

      {className?.includes("slate-selectable") && (
        <BlockSelection {...props}>{children}</BlockSelection>
      )}
    </PlateElementPrimitive>
  );
});

PresentationElement.displayName = "PresentationElement";
