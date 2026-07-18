"use client";

import { type ClassValue, clsx } from "clsx";
import { forwardRef, type FC } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function withRef<T extends FC<any>>(
  Component: T,
) {
  return forwardRef<any, any>((props, ref) => {
    const C = Component as any;
    return <C {...props} ref={ref} />;
  }) as unknown as T;
}

export function withVariants<T extends FC<any>>(
  Component: T,
  _variants: any,
) {
  return Component;
}
