"use client";

import React, { type ReactNode } from "react";
import { cn, withRef } from "@/components/plate/utils";
import { type TElement } from "platejs";
import { createPlatePlugin } from "platejs/react";
import { PlateElement } from "platejs/react";

// Import StairItem and constants
import { StairItem } from "./staircase-item";
import { STAIR_ITEM_ELEMENT, STAIRCASE_ELEMENT } from "../lib";

export interface StaircaseElement extends TElement {
  type: typeof STAIRCASE_ELEMENT;
}

// Main staircase component with withRef pattern
export const StaircaseElement = withRef<any>(
  ({ element, children, className, ...props }: any, ref) => {
    const childrenArray = React.Children.toArray(children as ReactNode);
    const items = element.children;
    const totalItems = items.length;

    return (
      <PlateElement
        ref={ref}
        element={element}
        className={cn("my-8", className)}
        {...props}
      >
        <div>
          {childrenArray.map((child, index) => (
            <StairItem
              key={index}
              index={index}
              totalItems={totalItems}
              element={items[index] as TElement}
            >
              {child}
            </StairItem>
          ))}
        </div>
      </PlateElement>
    );
  },
);

// Create plugin for staircase
export const StaircasePlugin = createPlatePlugin({
  key: STAIRCASE_ELEMENT,
  node: {
    isElement: true,
    type: STAIRCASE_ELEMENT,
    component: StaircaseElement,
  },
});

// Create plugin for stair item
export const StairItemPlugin = createPlatePlugin({
  key: STAIR_ITEM_ELEMENT,
  node: {
    isElement: true,
    type: STAIR_ITEM_ELEMENT,
  },
});
