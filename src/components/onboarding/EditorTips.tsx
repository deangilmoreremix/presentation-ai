"use client";

import { useEffect, useRef } from "react";
import { useTipRegistry } from "@/components/onboarding/TipProvider";

export function EditorTips() {
  const { showTip } = useTipRegistry();
  const sidebarTipShownRef = useRef(false);
  const editPanelTipShownRef = useRef(false);
  const zoomTipShownRef = useRef(false);

  // Show sidebar tip when sidebar first becomes visible
  useEffect(() => {
    if (sidebarTipShownRef.current) return;
    const timer = setTimeout(() => {
      sidebarTipShownRef.current = true;
      showTip("editor-sidebar", "Tip: Use the sidebar to browse, reorder, and manage your slides.");
    }, 2000);
    return () => clearTimeout(timer);
  }, [showTip]);

  // Show edit panel tip when edit panel first renders
  useEffect(() => {
    if (editPanelTipShownRef.current) return;
    const timer = setTimeout(() => {
      editPanelTipShownRef.current = true;
      showTip("editor-edit-panel", "Tip: Open the edit panel to change themes, add charts, or chat with the AI Agent.");
    }, 4500);
    return () => clearTimeout(timer);
  }, [showTip]);

  // Show zoom tip when user first zooms
  useEffect(() => {
    if (zoomTipShownRef.current) return;
    const handleWheelForZoom = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        zoomTipShownRef.current = true;
        showTip("editor-zoom", "Tip: Hold Ctrl/Cmd + scroll to zoom in and out of your slides.");
      }
    };
    window.addEventListener("wheel", handleWheelForZoom, { passive: true });
    return () => window.removeEventListener("wheel", handleWheelForZoom);
  }, [showTip]);

  return null;
}
