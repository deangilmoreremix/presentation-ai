"use client";

import React, { type ReactNode } from "react";
import { cn, withRef } from "@/components/plate/utils";
import { type TElement } from "platejs";
import { createPlatePlugin } from "platejs/react";
import { PlateElement } from "platejs/react";

// Import BulletItem and constants
import { BulletItem } from "./bullet-item";
import { BULLET_ITEM, BULLET_GROUP } from "../lib";

export interface BulletsElement extends TElement {
  type: typeof BULLET_GROUP;
}

// Main bullets component with withRef pattern
export const BulletsElement = withRef<any>(
  ({ element, children, className, ...props }: any, ref) => {
    const childrenArray = React.Children.toArray(children as ReactNode);
    const items = element.children;

    // Determine number of columns based on item count
    const getColumnClass = () => {
      const count = items.length;
      if (count <= 1) return "grid-cols-1";
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
        {/* Grid layout with adaptive columns */}
        <div className={cn("grid gap-6", getColumnClass())}>
          {childrenArray.map((child, index) => (
            <BulletItem
              key={index}
              {...({ index, element: items[index] } as any)}
            >
              {child}
            </BulletItem>
          ))}
        </div>
      </PlateElement>
    );
  },
);

// Create plugin for bullets
export const BulletsPlugin = createPlatePlugin({
  key: BULLET_GROUP,
  node: {
    isElement: true,
    type: BULLET_GROUP,
    component: BulletsElement,
  },
});

// Create plugin for bullet item
export const BulletPlugin = createPlatePlugin({
  key: BULLET_ITEM,
  node: {
    isElement: true,
    type: BULLET_ITEM,
  },
});
