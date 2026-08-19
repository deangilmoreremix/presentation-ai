"use client";

import { type PlateEditor } from "platejs/react";
import { useEffect } from "react";

export function useSlideFocus(
  editor: PlateEditor,
  currentSlideId: string | null,
  slideId: string | undefined,
) {
  useEffect(() => {
    let focusTimeout: ReturnType<typeof setTimeout> | null = null;

    if (currentSlideId === slideId) {
      focusTimeout = setTimeout(() => {
        try {
          editor?.tf?.focus({ edge: "endEditor" });
        } catch {}
      }, 100);
    }

    return () => {
      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }
    };
  }, [currentSlideId, slideId, editor]);
}
