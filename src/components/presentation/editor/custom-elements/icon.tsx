"use client";

import React from "react";
import { cn, withRef } from "@/components/plate/utils";
import { createPlatePlugin } from "platejs/react";
import { PlateElement } from "platejs/react";
import { type TElement } from "platejs";
import { useEditorRef } from "platejs/react";

import { ICON_ELEMENT } from "../lib";
import { IconPicker } from "@/components/ui/icon-picker";

export interface IconElement extends TElement {
  type: typeof ICON_ELEMENT;
  query: string;
  name: string;
}

// Icon component that uses IconPicker
export const IconElementComponent = withRef<any>(
  ({ element, className, ...props }: any, ref) => {
    const { query, name } = element as IconElement;
    const editor = useEditorRef();

    // Handle icon selection
    const handleIconSelect = (iconName: string) => {
      const path = editor.api.findPath(element);
      
      
      console.log(element, iconName);
      editor.tf.setNodes({ name: iconName }, { at: path });
    };

    return (
      <PlateElement
        ref={ref}
        element={element}
        className={cn("inline-flex justify-center", className)}
        {...props}
      >
        <div className="mb-2 p-2">
          <IconPicker
            defaultIcon={query}
            onIconSelect={(iconName) => handleIconSelect(iconName)}
          />
        </div>
      </PlateElement>
    );
  },
);

// Create plugin for icon
export const IconPlugin = createPlatePlugin({
  key: ICON_ELEMENT,
  node: {
    isElement: true,
    type: ICON_ELEMENT,
    component: IconElementComponent,
  },
});
