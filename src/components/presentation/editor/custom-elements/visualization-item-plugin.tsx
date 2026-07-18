"use client";

import React from "react";
import { cn, withRef } from "@/components/plate/utils";
import { type TElement } from "platejs";
import { createPlatePlugin } from "platejs/react";
import { PlateElement } from "platejs/react";

// Define visualization item element type
export const VISUALIZATION_ITEM_ELEMENT = "visualization-item";

export interface VisualizationItemElement extends TElement {
  type: typeof VISUALIZATION_ITEM_ELEMENT;
}

// Main visualization item component with withRef pattern
export const VisualizationItemElementComponent = withRef<any>(
  ({ element, children, className, ...props }: any, ref) => {
    return (
      <PlateElement
        ref={ref}
        element={element}
        className={cn(className)}
        {...props}
      >
        <div className="flex flex-col">{children}</div>
      </PlateElement>
    );
  },
);

// Create plugin for visualization item
export const VisualizationItemPlugin = createPlatePlugin({
  key: VISUALIZATION_ITEM_ELEMENT,
  node: {
    isElement: true,
    type: VISUALIZATION_ITEM_ELEMENT,
    component: VisualizationItemElementComponent,
  },
});
