"use client";

import React from "react";

import { cn } from "@/lib/utils";
import { withRef } from "platejs/react";
import { PlateElement } from "platejs/react";

export interface PresentationParagraphElementProps {
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

export const PresentationParagraphElement = withRef<any>(
  ({ className, children, ...props }: any, ref) => {
    return (
      <PlateElement
        ref={ref}
        as="p"
        className={cn(
          "presentation-paragraph m-0 px-0 py-1 text-base",
          className,
        )}
        {...props}
      >
        {children}
      </PlateElement>
    );
  },
);

PresentationParagraphElement.displayName = "PresentationParagraphElement";
