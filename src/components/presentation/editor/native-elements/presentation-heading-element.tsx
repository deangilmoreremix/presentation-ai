"use client";

import React from "react";

import { cva } from "class-variance-authority";
import { PresentationElement } from "./presentation-element";

import { cn } from "@/lib/utils";
import { withRef } from "platejs/react";

const headingVariants = cva("relative mb-1", {
  variants: {
    variant: {
      h1: "pb-1 text-5xl font-bold",
      h2: "pb-px text-3xl font-semibold tracking-tight",
      h3: "pb-px text-2xl font-semibold tracking-tight",
      h4: "text-xl font-semibold tracking-tight",
      h5: "text-lg font-semibold tracking-tight",
      h6: "text-base font-semibold tracking-tight",
    },
  },
});

// Local equivalent of `@udecode/cn`'s `withVariants` (not available in the
// platejs package). Wraps a component so the `cva` variant classes are merged
// into its className and the variant props are stripped before passing down.
function withVariants(
  Component: React.ComponentType<any>,
  variants: (props: any) => string,
  onlyVariantsProps?: string[],
) {
  const ComponentWithClassName = Component;
  return React.forwardRef<any, any>(function ExtendComponent(allProps, ref) {
    const { className, ...props } = allProps;
    const rest = { ...props };
    if (onlyVariantsProps) {
      onlyVariantsProps.forEach((key) => {
        if (props[key] !== undefined) {
          delete rest[key];
        }
      });
    }
    return (
      <ComponentWithClassName
        ref={ref}
        className={cn(variants(props), className)}
        {...rest}
      />
    );
  });
}

const HeadingElementVariants = withVariants(
  PresentationElement,
  headingVariants,
  ["variant"],
);

export const PresentationHeadingElement = withRef<any>(
  ({ children, as = "h1", className, ...props }: any, ref) => {
    return (
      <HeadingElementVariants
        ref={ref}
        as={as}
        variant={as as "h1" | "h2" | "h3" | "h4" | "h5" | "h6"}
        className={cn("presentation-heading", className)}
        {...props}
      >
        {children}
      </HeadingElementVariants>
    );
  },
);

export function H1Element(props: any) {
  return <PresentationHeadingElement variant="h1" {...props} />;
}

export function H2Element(props: any) {
  return <PresentationHeadingElement variant="h2" {...props} />;
}

export function H3Element(props: any) {
  return <PresentationHeadingElement variant="h3" {...props} />;
}

export function H4Element(props: any) {
  return <PresentationHeadingElement variant="h4" {...props} />;
}

export function H5Element(props: any) {
  return <PresentationHeadingElement variant="h5" {...props} />;
}

export function H6Element(props: any) {
  return <PresentationHeadingElement variant="h6" {...props} />;
}
