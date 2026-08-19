"use client";

import React, { type ReactNode } from "react";
import { cn, withRef } from "@/components/plate/utils";
import { type TElement } from "platejs";
import { createPlatePlugin } from "platejs/react";
import { PlateElement } from "platejs/react";

// Import IconItem and constants
import { IconItem } from "./icon-item";
import { ICON_LIST_ITEM, ICON_LIST } from "../lib";

export interface IconsElement extends TElement {
  type: typeof ICON_LIST;
}

// Main icons component with withRef pattern
export const IconsElement = withRef<any>(
  ({ element, children, className, ...props }: any, ref) => {
    const childrenArray = React.Children.toArray(children as ReactNode);
    const items = element.children;

    // Determine number of columns based on item count
    const getColumnClass = () => {
      const count = items.length;
      if (count <= 2) return "grid-cols-1";
      if (count <= 2) return "grid-cols-2";
      return "grid-cols-3"; // Max 3 columns
    };

    return (
      <PlateElement
        ref={ref}
        element={element}
        className={cn("my-6", className)}
        {...props}
      >
        <div className={cn("grid gap-6", getColumnClass())}>
          {childrenArray.map((child, index) => (
            <IconItem key={index} element={items[index] as TElement}>
              {child}
            </IconItem>
          ))}
        </div>
      </PlateElement>
    );
  },
);

// Create plugin for icons
export const IconsPlugin = createPlatePlugin({
  key: ICON_LIST,
  node: {
    isElement: true,
    type: ICON_LIST,
    component: IconsElement,
  },
});

// Create plugin for icon item
export const IconItemPlugin = createPlatePlugin({
  key: ICON_LIST_ITEM,
  node: {
    isElement: true,
    type: ICON_LIST_ITEM,
  },
});
